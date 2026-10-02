from typing import Optional, Dict, Any
from uuid import UUID
from fastapi import UploadFile, BackgroundTasks
import random
import jwt
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.core.security import verify_password, hash_password, create_otp_session_token
from app.core.uow import UnitOfWork
from app.core.storage import upload_avatar
from app.models.user import User, UserType
from app.models.profiles import StudentProfile, AcademicStatus
from app.models.academic import Course, Department
from app.schemas.auth import (
    StudentProfileCreateRequest, 
    UserIdUpdateRequest, 
    NameUpdateRequest, 
    PasswordChangeRequest,
    EmailUpdateRequest,
    UserPreferencesUpdateRequest
)
from app.utils.email import send_email_background
from app.utils.validation import validate_password, validate_upload_file
from app.repositories.user_repository import UserRepository

class UserService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.repo = UserRepository(uow.db)

    async def get_student_profile(self, current_user: User) -> Optional[StudentProfile]:
        if current_user.user_type != UserType.student:
            raise ValueError("Only students have a student profile")
        
        return await self.repo.get_student_profile(current_user.id)

    async def create_student_profile(self, current_user: User, data: StudentProfileCreateRequest) -> StudentProfile:
        if current_user.user_type != UserType.student:
            raise ValueError("Only students can create a student profile")
            
        existing = await self.repo.get_student_profile(current_user.id)
        if existing:
            raise ValueError("Student profile already exists")
            
        async with self.uow.transaction():
            course = await self.uow.db.get(Course, data.course_id)
            dept = await self.uow.db.get(Department, data.department_id)
            
            if not course or not course.is_active or not dept or not dept.is_active:
                raise ValueError("Invalid or inactive course/department")
                
            profile = StudentProfile(
                user_id=current_user.id,
                course_id=data.course_id,
                department_id=data.department_id,
                year=data.year,
                hostel=data.hostel.strip().lower() if data.hostel else None,
                academic_status=AcademicStatus.enrolled
            )
            return await self.repo.add_student_profile(profile)

    async def update_student_profile(self, current_user: User, data: StudentProfileCreateRequest) -> StudentProfile:
        if current_user.user_type != UserType.student:
            raise ValueError("Only students can update a student profile")
            
        async with self.uow.transaction():
            profile = await self.repo.get_student_profile(current_user.id)
            if not profile:
                raise ValueError("Student profile not found. Use POST to create one.")
                
            course = await self.uow.db.get(Course, data.course_id)
            dept = await self.uow.db.get(Department, data.department_id)
            
            if not course or not course.is_active or not dept or not dept.is_active:
                raise ValueError("Invalid or inactive course/department")
                
            profile.course_id = data.course_id
            profile.department_id = data.department_id
            profile.year = data.year
            profile.hostel = data.hostel.strip().lower() if data.hostel else None
            return profile

    async def update_user_id(self, current_user: User, new_user_id: str) -> User:
        async with self.uow.transaction():
            user = await self.repo.get_by_id(current_user.id)
            if not user:
                raise ValueError("User not found")
            
            try:
                user.user_id = new_user_id
                await self.uow.db.flush()
                return user
            except IntegrityError as e:
                error_msg = str(e.orig).lower() if e.orig else ""
                if "users_user_id_key" in error_msg or "user_id" in error_msg:
                    raise ValueError("User ID is already taken")
                raise ValueError("Database Integrity Error")

    async def update_profile_name(self, current_user: User, new_name: str) -> User:
        async with self.uow.transaction():
            user = await self.repo.get_by_id(current_user.id)
            if user:
                user.name = new_name
            return user

    async def change_password(self, current_user: User, data: PasswordChangeRequest) -> User:
        async with self.uow.transaction():
            user = await self.repo.get_by_id(current_user.id)
            if not user or not verify_password(data.current_password, user.hashed_password):
                raise ValueError("Incorrect current password")
                
            await validate_password(data.new_password, self.uow.db)
            
            user.hashed_password = hash_password(data.new_password)
            return user

    async def update_preferences(self, current_user: User, data: UserPreferencesUpdateRequest) -> User:
        async with self.uow.transaction():
            user = await self.repo.get_by_id(current_user.id)
            if user:
                if data.email_notifications is not None:
                    user.email_notifications = data.email_notifications
                if data.in_app_alerts is not None:
                    user.in_app_alerts = data.in_app_alerts
            return user

    async def upload_avatar(self, current_user: User, photo: UploadFile) -> str:
        from app.core.config import settings
        await validate_upload_file(photo, max_size_mb=settings.MAX_UPLOAD_FILE_SIZE_MB)
        try:
            photo_url = await upload_avatar(photo, str(current_user.id))
        except Exception as e:
            raise ValueError("Failed to upload photo")
            
        async with self.uow.transaction():
            user = await self.repo.get_by_id(current_user.id)
            if user:
                user.photo_url = photo_url
        return photo_url

    async def request_email_update(self, current_user: User, data: EmailUpdateRequest, background_tasks: BackgroundTasks) -> str:
        existing = await self.repo.get_by_email(data.new_email)
        if existing:
            raise ValueError("Email is already registered by another account")
            
        otp_code = str(random.randint(100000, 999999))
        otp_hash = hash_password(otp_code)
        session_token = create_otp_session_token(subject=current_user.id, new_email=data.new_email, otp_hash=otp_hash)
        
        send_email_background(
            background_tasks=background_tasks,
            to_email=data.new_email,
            subject="Your Email Verification Code",
            template_name="email_update_otp.html",
            context={
                "name": current_user.name or "User",
                "otp_code": otp_code,
                "new_email": data.new_email
            }
        )
        return session_token

    async def verify_email_update(self, current_user: User, session_token: str, otp_code: str) -> User:
        try:
            payload = jwt.decode(session_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            token_user_id = payload.get("sub")
            new_email = payload.get("new_email")
            otp_hash = payload.get("otp_hash")
            
            if not token_user_id or not new_email or not otp_hash:
                raise ValueError("Invalid session token structure")
                
            if token_user_id != str(current_user.id):
                raise ValueError("Session token belongs to another user")
                
            if not verify_password(otp_code, otp_hash):
                raise ValueError("Invalid or incorrect OTP code")
                
        except jwt.ExpiredSignatureError:
            raise ValueError("Session token has expired. Please request a new OTP.")
        except jwt.PyJWTError:
            raise ValueError("Invalid session token")

        async with self.uow.transaction():
            existing = await self.repo.get_by_email(new_email)
            if existing:
                raise ValueError("Email is already registered by another account")
                
            user = await self.repo.get_by_id(current_user.id)
            if user:
                user.email = new_email
            return user

    async def request_2fa_enable(self, current_user: User, background_tasks: BackgroundTasks) -> str:
        if current_user.is_2fa_enabled:
            raise ValueError("2FA is already enabled")
            
        otp_code = str(random.randint(100000, 999999))
        otp_hash = hash_password(otp_code)
        
        session_token = create_otp_session_token(
            subject=current_user.id, 
            new_email=current_user.email, 
            otp_hash=otp_hash
        )
        
        send_email_background(
            background_tasks=background_tasks,
            to_email=current_user.email,
            subject="Enable Two-Factor Authentication",
            template_name="2fa_enable_otp.html",
            context={"name": current_user.name or "User", "otp_code": otp_code}
        )
        return session_token

    async def verify_2fa_enable(self, current_user: User, session_token: str, otp_code: str) -> User:
        try:
            payload = jwt.decode(session_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            token_user_id = payload.get("sub")
            otp_hash = payload.get("otp_hash")
            
            if not token_user_id or not otp_hash:
                raise ValueError("Invalid session token structure")
                
            if token_user_id != str(current_user.id):
                raise ValueError("Session token belongs to another user")
                
            if not verify_password(otp_code, otp_hash):
                raise ValueError("Invalid or incorrect OTP code")
                
        except jwt.ExpiredSignatureError:
            raise ValueError("Session token has expired. Please request a new OTP.")
        except jwt.PyJWTError:
            raise ValueError("Invalid session token")

        async with self.uow.transaction():
            user = await self.repo.get_by_id(current_user.id)
            if user:
                user.is_2fa_enabled = True
            return user

    async def disable_2fa(self, current_user: User) -> User:
        async with self.uow.transaction():
            user = await self.repo.get_by_id(current_user.id)
            if user:
                user.is_2fa_enabled = False
            return user
