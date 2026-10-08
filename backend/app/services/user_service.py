from typing import Optional, Dict, Any
import uuid
from uuid import UUID
from fastapi import UploadFile, BackgroundTasks
import random
import jwt
from datetime import datetime, timezone, timedelta
from app.core.config import settings
from app.core.security import verify_password, hash_password, create_otp_session_token
from app.core.uow import UnitOfWork
from app.core.storage import upload_avatar
from app.models.user import User, UserType
from app.models.auth import PasswordResetOTP
from app.utils.email import send_email_background
from app.utils.validation import validate_password, validate_upload_file

class UserService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def get_user_profile(self, user_id: UUID) -> Optional[User]:
        # Utilizing the specific method we mapped out for the user repository
        return await self.uow.users.get_by_id_with_profiles(user_id)

    async def update_profile_name(self, current_user: User, new_name: str) -> User:
        async with self.uow.transaction() as u:
            user = await u.users.get_by_id(current_user.id)
            if not user:
                raise ValueError("User not found")
            user.name = new_name
            await u.users.update(user, {})
            return user

    async def change_password(self, current_user: User, data) -> User:
        async with self.uow.transaction() as u:
            user = await u.users.get_by_id(current_user.id)
            if not user or not verify_password(data.current_password, user.hashed_password):
                raise ValueError("Incorrect current password")
                
            await validate_password(data.new_password, u.db)
            
            user.hashed_password = hash_password(data.new_password)
            await u.users.update(user, {})
            return user

    async def update_preferences(self, current_user: User, data) -> User:
        async with self.uow.transaction() as u:
            user = await u.users.get_by_id(current_user.id)
            if not user:
                raise ValueError("User not found")
            if data.notification_enabled is not None:
                user.email_notifications = data.notification_enabled
            if data.in_app_alert_enabled is not None:
                user.in_app_alerts = data.in_app_alert_enabled
            await u.users.update(user, {})
            return user

    async def request_email_update(self, current_user: User, data, background_tasks: BackgroundTasks) -> str:
        existing = await self.uow.users.get_by_email(data.new_email)
        if existing:
            raise ValueError("Email already in use")

        otp_code = str(random.randint(100000, 999999))
        otp_hash = hash_password(otp_code)
        
        session_token = create_otp_session_token(subject=str(current_user.id), new_email=data.new_email, otp_hash=otp_hash)
        
        send_email_background(
            background_tasks=background_tasks,
            to_email=data.new_email,
            subject="Verify Your New Email",
            template_name="signup_otp.html",
            context={"name": current_user.name or "User", "otp_code": otp_code}
        )
        return session_token

    async def verify_email_update(self, current_user: User, session_token: str, otp: str) -> User:
        try:
            payload = jwt.decode(session_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise ValueError("Verification session expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid verification session")

        session_user_id = payload.get("sub")
        session_new_email = payload.get("new_email")
        otp_hash = payload.get("otp_hash")

        if str(current_user.id) != session_user_id or not session_new_email or not otp_hash:
            raise ValueError("Invalid verification session data")

        if not verify_password(otp, str(otp_hash)):
            raise ValueError("Invalid verification code")

        existing = await self.uow.users.get_by_email(session_new_email)
        if existing:
            raise ValueError("Email already in use")

        async with self.uow.transaction() as u:
            user = await u.users.get_by_id(current_user.id)
            if not user:
                raise ValueError("User not found")
            user.email = session_new_email
            await u.users.update(user, {})
            return user

    async def upload_avatar(self, current_user: User, file: UploadFile) -> User:
        await validate_upload_file(file, max_size_mb=2, allowed_types=["image/jpeg", "image/png"])
        file_url = await upload_avatar(file, str(current_user.id))
        
        async with self.uow.transaction() as u:
            user = await u.users.get_by_id(current_user.id)
            if not user:
                raise ValueError("User not found")
            user.photo_url = file_url
            await u.users.update(user, {})
            return user

    async def get_student_profile(self, user: User):
        from sqlalchemy.orm import selectinload
        from sqlalchemy import select
        from app.models.profiles import StudentProfile
        stmt = select(StudentProfile).options(selectinload(StudentProfile.room)).where(StudentProfile.user_id == user.id)
        result = await self.uow.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_student_profile(self, user: User, data):
        from app.models.profiles import StudentProfile
        async with self.uow.transaction() as u:
            profile = StudentProfile(
                user_id=user.id,
                registration_no=data.registration_no,
                course_id=data.course_id,
                department_id=data.department_id
            )
            u.db.add(profile)
            await u.db.flush()
        
    async def update_student_profile(self, user: User, data):
        from sqlalchemy import select
        from app.models.profiles import StudentProfile
        async with self.uow.transaction() as u:
            stmt = select(StudentProfile).where(StudentProfile.user_id == user.id)
            result = await u.db.execute(stmt)
            profile = result.scalar_one_or_none()
            if not profile:
                raise ValueError("Student profile not found")
            profile.registration_no = data.registration_no
            profile.course_id = data.course_id
            profile.department_id = data.department_id
            await u.db.flush()

    async def request_2fa_enable(self, user: User, background_tasks: BackgroundTasks) -> str:
        import random
        from app.core.security import create_otp_session_token, hash_password
        from app.utils.email import send_email_background
        
        otp_code = str(random.randint(100000, 999999))
        otp_hash = hash_password(otp_code)
        session_token = create_otp_session_token(subject=str(user.id), new_email=user.email, otp_hash=otp_hash)

        send_email_background(
            background_tasks=background_tasks,
            to_email=user.email,
            subject="CMS Portal - Enable 2FA",
            template_name="login_otp.html",
            context={"name": user.name or "User", "otp_code": otp_code}
        )
        return session_token

    async def verify_2fa_enable(self, user: User, session_token: str, otp: str):
        import jwt
        from app.core.config import settings
        from app.core.security import verify_password
        
        try:
            payload = jwt.decode(session_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise ValueError("Session expired.")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid session.")

        otp_hash = payload.get("otp_hash")
        if not otp_hash or not verify_password(otp, str(otp_hash)):
            raise ValueError("Invalid verification code.")

        async with self.uow.transaction() as u:
            db_user = await u.users.get_by_id(user.id)
            if not db_user:
                raise ValueError("User not found.")
            db_user.is_2fa_enabled = True
            await u.users.update(db_user, {})

    async def disable_2fa(self, user: User):
        async with self.uow.transaction() as u:
            db_user = await u.users.get_by_id(user.id)
            if not db_user:
                raise ValueError("User not found.")
            db_user.is_2fa_enabled = False
            await u.users.update(db_user, {})
