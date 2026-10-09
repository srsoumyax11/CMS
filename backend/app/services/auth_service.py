import random
import uuid
import jwt
from typing import Optional, Tuple
from datetime import datetime, timezone, timedelta
from fastapi import BackgroundTasks

from app.core.uow import UnitOfWork
from app.core.config import settings
from app.core.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    create_refresh_token,
    create_otp_session_token
)
from app.models.user import User, AccountStatus, UserType
from app.models.auth import RevokedToken, PasswordResetOTP
from app.models.notification import Notification, NotificationType
from app.utils.email import send_email_background
from app.utils.validation import validate_password

class AuthService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def check_email(self, email: str) -> bool:
        user = await self.uow.users.get_by_email(email)
        return user is None

    async def request_signup_otp(self, email: str, password: str, name: str, background_tasks: BackgroundTasks) -> str:
        await validate_password(password, self.uow.db)
        existing = await self.uow.users.get_by_email(email)
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

        existing = await self.uow.users.get_by_email(email)
        if existing:
            raise ValueError("Email already registered.")

        async with self.uow.transaction() as u:
            base_role = await u.roles.get_by_code("BASE")
            if not base_role:
                raise ValueError("System not properly initialized. Base role missing.")

            new_user = User(
                email=email,
                hashed_password=hash_password(password),
                user_type=UserType.user,
                account_status=AccountStatus.active,
                name=name,
                role_id=base_role.id
            )
            new_user = await u.users.create(new_user)

            welcome_notif = Notification(
                user_id=new_user.id,
                title="Welcome to CMS!",
                message="Your account is active. Visit your profile to apply for a role (Student, Faculty, etc.).",
                type=NotificationType.success,
                link="/role-application"
            )
            await u.notifications.create(welcome_notif)

        if background_tasks:
            frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
            send_email_background(
                background_tasks=background_tasks,
                to_email=new_user.email,
                subject="Welcome to CampusOne — Email Verified",
                template_name="welcome.html",
                context={
                    "name": new_user.name or "User",
                    "email": new_user.email,
                    "dashboard_url": f"{frontend_url}/dashboard"
                }
            )

        access_token = create_access_token(subject=str(new_user.id))
        refresh_token = create_refresh_token(subject=str(new_user.id))
        return new_user, access_token, refresh_token

    async def register_student(self, data, background_tasks: BackgroundTasks):
        from app.models.profiles import StudentProfile
        await validate_password(data.password, self.uow.db)
        existing = await self.uow.users.get_by_email(data.email)
        if existing:
            raise ValueError("Email already registered")

        async with self.uow.transaction() as u:
            student_role = await u.roles.get_by_code("STUDENT")
            if not student_role:
                raise ValueError("System error: STUDENT role missing")

            new_user = User(
                email=data.email,
                hashed_password=hash_password(data.password),
                user_type=UserType.student,
                account_status=AccountStatus.pending,
                name=data.name,
                role_id=student_role.id
            )
            new_user = await u.users.create(new_user)
            
            profile = StudentProfile(
                user_id=new_user.id,
                registration_no=data.registration_no,
                course_id=getattr(data, 'course_id', uuid.uuid4()), # Need real UUID, fallback only for typing
                department_id=getattr(data, 'department_id', uuid.uuid4())
            )
            u.db.add(profile)
            await u.db.flush()
            
        access_token = create_access_token(subject=str(new_user.id))
        refresh_token = create_refresh_token(subject=str(new_user.id))
        return new_user, access_token, refresh_token

    async def generate_2fa_otp(self, user: User, background_tasks: BackgroundTasks) -> str:
        otp_code = str(random.randint(100000, 999999))
        otp_hash = hash_password(otp_code)
        session_token = create_otp_session_token(subject=str(user.id), new_email=user.email, otp_hash=otp_hash)

        send_email_background(
            background_tasks=background_tasks,
            to_email=user.email,
            subject="CMS Portal - 2FA Login Verification",
            template_name="2fa_login_otp.html",
            context={"name": user.name or "User", "otp_code": otp_code}
        )
        return session_token

    async def get_user_with_profiles(self, user_id: uuid.UUID) -> Optional[User]:
        return await self.uow.users.get_by_id_with_profiles(user_id)

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        user = await self.uow.users.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            return None
        
        async with self.uow.transaction() as u:
            user.last_login_at = datetime.now(timezone.utc)
            await u.users.update(user, {})
        
        return user


    async def refresh_token(self, refresh_token_str: str) -> str:
        try:
            payload = jwt.decode(refresh_token_str, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            if payload.get("type") != "refresh":
                raise ValueError("Invalid token type")
            user_id = payload.get("sub")
            if user_id is None:
                raise ValueError("Invalid token")
                
            # Check revoked
            # Since we don't have a revoked token repo yet, we'll use raw db here or skip for now.
            # But wait, RevokedToken isn't in UoW. We can just use the db session for simple lookup.
            from sqlalchemy import select
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
        try:
            payload = jwt.decode(refresh_token_str, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                async with self.uow.transaction() as u:
                    revoked = RevokedToken(
                        token=refresh_token_str,
                        user_id=uuid.UUID(user_id),
                        expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
                    )
                    u.db.add(revoked)
        except jwt.PyJWTError:
            pass

    async def forgot_password(self, email: str, background_tasks: BackgroundTasks) -> None:
        user = await self.uow.users.get_by_email(email)
        if not user:
            return

        otp_code = str(random.randint(100000, 999999))
        otp_hash = hash_password(otp_code)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        
        async with self.uow.transaction() as u:
            otp_record = PasswordResetOTP(
                email=user.email,
                otp_hash=otp_hash,
                expires_at=expires_at,
                is_used=False
            )
            u.db.add(otp_record)
            
        send_email_background(
            background_tasks=background_tasks,
            to_email=user.email,
            subject="Password Reset OTP",
            template_name="2fa_login_otp.html", 
            context={"name": user.name or "User", "otp_code": otp_code}
        )

    async def reset_password(self, email: str, otp: str, new_password: str) -> None:
        await validate_password(new_password, self.uow.db)
        
        from sqlalchemy import select
        stmt = select(PasswordResetOTP).where(
            PasswordResetOTP.email == email,
            PasswordResetOTP.is_used == False,
            PasswordResetOTP.expires_at > datetime.now(timezone.utc)
        ).order_by(PasswordResetOTP.created_at.desc())
        
        result = await self.uow.db.execute(stmt)
        otp_record = result.scalars().first()
        
        if not otp_record or not verify_password(otp, otp_record.otp_hash):
            raise ValueError("Invalid or expired OTP")
            
        user = await self.uow.users.get_by_email(email)
        if not user:
            raise ValueError("User not found")
            
        async with self.uow.transaction() as u:
            user.hashed_password = hash_password(new_password)
            otp_record.is_used = True
            await u.users.update(user, {})
            u.db.add(otp_record)
