from typing import Optional, Tuple
from uuid import UUID
from fastapi import BackgroundTasks
import random

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from datetime import datetime, timezone, timedelta

from app.core.uow import UnitOfWork
from app.core.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    create_refresh_token,
    create_otp_session_token,
    decode_token
)
from app.models.user import User, UserType
from app.models.rbac import Role
from app.models.profiles import StudentProfile, AcademicStatus
from app.models.auth import RevokedToken, PasswordResetOTP
from app.models.notification import Notification, NotificationType
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest
from app.utils.email import send_email_background
from app.utils.validation import validate_password

class AuthService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.repo = UserRepository(uow.db)

    async def check_email(self, email: str) -> bool:
        user = await self.repo.get_by_email(email)
        return user is None

    async def request_signup_otp(self, email: str, password: str, name: str, background_tasks: BackgroundTasks) -> str:
        await validate_password(password, self.uow.db)
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        otp_code = str(random.randint(100000, 999999))
        otp_hash = hash_password(otp_code)
        session_token = create_otp_session_token(subject=email, new_email=email, otp_hash=otp_hash)

        send_email_background(
            background_tasks=background_tasks,
            to_email=email,
            subject="Welcome to CMS Portal - Verify Your Email",
            template_name="signup_otp.html",
            context={"name": name or "User", "otp_code": otp_code}
        )
        return session_token

    async def verify_signup_otp(
        self, 
        email: str, 
        otp: str, 
        session_token: str, 
        password: str, 
        name: str,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Tuple[User, str, str]:
        import jwt
        from app.core.config import settings
        from app.models.user import AccountStatus
        try:
            payload = jwt.decode(session_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise ValueError("Verification session expired. Please request a new OTP.")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid verification session.")

        session_email = payload.get("sub")
        otp_hash = payload.get("otp_hash")

        if session_email != email or not otp_hash or not verify_password(otp, str(otp_hash)):
            raise ValueError("Invalid verification code.")

        existing = await self.repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered.")

        async with self.uow.transaction():
            new_user = User(
                email=email,
                hashed_password=hash_password(password),
                user_type=UserType.user,
                account_status=AccountStatus.active,
                name=name
            )
            self.uow.db.add(new_user)
            await self.uow.db.flush()

            # Create welcome in-app notification
            welcome_notif = Notification(
                user_id=new_user.id,
                title="Welcome to BPUT CMS! 🎉",
                message="Your account is active. Visit your profile to select your account role (Student, Parent, Faculty, Staff).",
                type=NotificationType.success,
                link="/user"
            )
            self.uow.db.add(welcome_notif)

        # Trigger Welcome Email
        if background_tasks:
            send_email_background(
                background_tasks=background_tasks,
                to_email=new_user.email,
                subject="Welcome to BPUT CMS! 🎉",
                template_name="welcome.html",
                context={
                    "name": new_user.name or "User",
                    "email": new_user.email
                }
            )

        access_token = create_access_token(subject=str(new_user.id))
        refresh_token = create_refresh_token(subject=str(new_user.id))
        return new_user, access_token, refresh_token

    async def register_student(self, data: RegisterRequest, background_tasks: BackgroundTasks) -> Tuple[User, str, str]:
        await validate_password(data.password, self.uow.db)
        
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise ValueError("Email already registered")
            
        existing_id = await self.repo.get_by_user_id_str(data.user_id)
        if existing_id:
            raise ValueError("User ID is already taken")

        async with self.uow.transaction():
            stmt_r = select(Role).where(Role.name == "Student")
            res_r = await self.uow.db.execute(stmt_r)
            student_role = res_r.scalars().first()

            new_user = User(
                email=data.email,
                hashed_password=hash_password(data.password),
                user_type=UserType.student,
                name=data.name,
                photo_url=data.photo_url,
                role_id=student_role.id if student_role else None
            )
            self.uow.db.add(new_user)
            await self.uow.db.flush()

            reg_no = data.registration_no or data.user_id or f"230123{str(uuid.uuid4().int)[:4]}"
            profile = StudentProfile(
                user_id=new_user.id,
                registration_no=reg_no.strip(),
                roll_no=data.roll_no.strip() if data.roll_no else None,
                course_id=data.course_id,
                department_id=data.department_id,
                admission_year=data.admission_year,
                current_semester=data.current_semester,
                section=data.section,
                year=data.year,
                academic_status=AcademicStatus.enrolled
            )
            self.uow.db.add(profile)
            
        # Issue tokens
        access_token = create_access_token(subject=str(new_user.id))
        refresh_token = create_refresh_token(subject=str(new_user.id))
        
        # Trigger Welcome Email
        send_email_background(
            background_tasks=background_tasks,
            to_email=new_user.email,
            subject="Welcome to BPUT CMS!",
            template_name="welcome.html",
            context={
                "name": new_user.name,
                "email": new_user.email,
                "user_id": str(new_user.id),
                "role": "Student"
            }
        )
        
        return new_user, access_token, refresh_token


    async def authenticate(self, email: str, password: str) -> Optional[User]:
        user = await self.repo.get_by_email_with_profiles(email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    async def generate_2fa_otp(self, user: User, background_tasks: BackgroundTasks) -> str:
        otp_code = str(random.randint(100000, 999999))
        otp_hash = hash_password(otp_code)
        session_token = create_otp_session_token(subject=str(user.id), new_email=user.email, otp_hash=otp_hash)
        
        send_email_background(
            background_tasks=background_tasks,
            to_email=user.email,
            subject="Your Login Security Code",
            template_name="2fa_login_otp.html",
            context={"name": user.name or "User", "otp_code": otp_code}
        )
        return session_token

    async def refresh_token(self, refresh_token_str: str) -> str:
        import jwt
        from app.core.config import settings
        try:
            payload = jwt.decode(refresh_token_str, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            if payload.get("type") != "refresh":
                raise ValueError("Invalid token type")
            user_id = payload.get("sub")
            if user_id is None:
                raise ValueError("Invalid token")
                
            # Check if token is revoked
            stmt = select(RevokedToken).where(RevokedToken.token == refresh_token_str)
            result = await self.uow.db.execute(stmt)
            if result.scalar_one_or_none():
                raise ValueError("Refresh token is revoked")
                
            return create_access_token(subject=user_id)
        except jwt.ExpiredSignatureError:
            raise ValueError("Refresh token expired")
        except jwt.PyJWTError:
            raise ValueError("Invalid refresh token")

    async def logout(self, refresh_token_str: str) -> None:
        import jwt
        from app.core.config import settings
        try:
            payload = jwt.decode(refresh_token_str, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                async with self.uow.transaction():
                    revoked = RevokedToken(
                        token=refresh_token_str,
                        user_id=user_id,
                        expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
                    )
                    self.uow.db.add(revoked)
        except jwt.PyJWTError:
            pass # Ignore invalid tokens on logout

    async def forgot_password(self, email: str, background_tasks: BackgroundTasks) -> None:
        user = await self.repo.get_by_email(email)
        if not user:
            # Don't reveal if user exists
            return

        otp_code = str(random.randint(100000, 999999))
        otp_hash = hash_password(otp_code)
        
        from app.core.config import settings
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        
        async with self.uow.transaction():
            otp_record = PasswordResetOTP(
                email=user.email,
                otp_hash=otp_hash,
                expires_at=expires_at,
                is_used=False
            )
            self.uow.db.add(otp_record)
            
        send_email_background(
            background_tasks=background_tasks,
            to_email=user.email,
            subject="Password Reset OTP",
            template_name="2fa_login_otp.html", # Reusing template for now, could make a new one
            context={"name": user.name or "User", "otp_code": otp_code}
        )

    async def reset_password(self, email: str, otp: str, new_password: str) -> None:
        await validate_password(new_password, self.uow.db)
        
        stmt = select(PasswordResetOTP).where(
            PasswordResetOTP.email == email,
            PasswordResetOTP.is_used == False,
            PasswordResetOTP.expires_at > datetime.now(timezone.utc)
        ).order_by(PasswordResetOTP.created_at.desc())
        
        result = await self.uow.db.execute(stmt)
        otp_record = result.scalars().first()
        
        if not otp_record or not verify_password(otp, otp_record.otp_hash):
            raise ValueError("Invalid or expired OTP")
            
        user = await self.repo.get_by_email(email)
        if not user:
            raise ValueError("User not found")
            
        async with self.uow.transaction():
            user.hashed_password = hash_password(new_password)
            otp_record.is_used = True
            self.uow.db.add(user)
            self.uow.db.add(otp_record)
