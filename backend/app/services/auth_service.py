from typing import Optional, Tuple
from uuid import UUID
from fastapi import BackgroundTasks
import random

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

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
from app.models.profiles import StudentProfile, AcademicStatus
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest
from app.utils.email import send_email_background
from app.utils.validation import validate_password

class AuthService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.repo = UserRepository(uow.db)

    async def check_username(self, user_id: str) -> bool:
        user = await self.repo.get_by_user_id_str(user_id)
        return user is None

    async def check_email(self, email: str) -> bool:
        user = await self.repo.get_by_email(email)
        return user is None

    async def register_student(self, data: RegisterRequest, background_tasks: BackgroundTasks) -> Tuple[User, str, str]:
        await validate_password(data.password, self.uow.db)
        
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise ValueError("Email already registered")
            
        existing_id = await self.repo.get_by_user_id_str(data.user_id)
        if existing_id:
            raise ValueError("User ID is already taken")

        async with self.uow.transaction():
            new_user = User(
                email=data.email,
                hashed_password=hash_password(data.password),
                user_type=UserType.student,
                name=data.name,
                user_id=data.user_id,
                photo_url=data.photo_url
            )
            self.uow.db.add(new_user)
            await self.uow.db.flush()

            profile = StudentProfile(
                user_id=new_user.id,
                course_id=data.course_id,
                department_id=data.department_id,
                year=data.year,
                hostel=data.hostel,
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
            subject="Welcome to Synergy CMS!",
            template_name="welcome.html",
            context={
                "name": new_user.name,
                "email": new_user.email,
                "user_id": new_user.user_id,
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
                
            return create_access_token(subject=user_id)
        except jwt.ExpiredSignatureError:
            raise ValueError("Refresh token expired")
        except jwt.PyJWTError:
            raise ValueError("Invalid refresh token")
