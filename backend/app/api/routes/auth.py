from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from app.api.deps import get_current_user, RateLimiter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import StudentProfile, AcademicStatus
from app.models.academic import Course, Branch
from app.models.rbac import Role, UserRole
from app.schemas.auth import (
    RegisterRequest, 
    LoginRequest, 
    TokenResponse, 
    RefreshTokenRequest, 
    RefreshTokenResponse,
    RegisterResponseData,
    UserResponse
)
from app.schemas.common import APIResponse
from app.utils.email import send_email_background
from app.utils.validation import validate_password

router = APIRouter()

@router.get(
    "/check-username",
    summary="Check Username Availability",
    description="Checks if a user_id is available for registration.",
    response_model=APIResponse[bool]
)
async def check_username(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    return APIResponse(success=True, data=(user is None), error=None)

@router.post(
    "/register", 
    summary="Register Student", 
    description="Registers a new student user. Assigns the default 'Student' role, sets status to 'pending', and logs them in.", 
    response_model=APIResponse[TokenResponse]
)
async def register(data: RegisterRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Validate password against system settings
    await validate_password(data.password, db)

    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Atomic transaction for User
    try:
        new_user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            user_type=UserType.student,
            name=data.name,
            user_id=data.user_id,
            photo_url=data.photo_url
        )
        db.add(new_user)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        error_msg = str(e.orig).lower() if e.orig else ""
        if "users_email_key" in error_msg or "email" in error_msg:
            raise HTTPException(status_code=400, detail="Email is already registered")
        elif "users_user_id_key" in error_msg or "user_id" in error_msg:
            raise HTTPException(status_code=400, detail="User ID is already taken")
        raise HTTPException(status_code=400, detail="Database Integrity Error")

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
    
    return APIResponse(
        success=True, 
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_type=new_user.user_type,
            account_status=new_user.account_status,
            academic_status=None,
            employment_status=None
        ), 
        error=None
    )


@router.post(
    "/token", 
    summary="OAuth2 Token Login", 
    description="Standard OAuth2 form data login endpoint for Swagger UI testing.",
    dependencies=[Depends(RateLimiter(times=5, minutes=1))]
)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """
    Standard OAuth2 endpoint required by Swagger UI.
    Takes form-data instead of JSON, and returns a flat token object instead of APIResponse.
    """
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    # User is authenticated. We allow all account statuses so the frontend can route them to appropriate status pages.
        
    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/login", 
    summary="User Login", 
    description="Authenticates a user with email and password, returning access and refresh JWTs.",
    response_model=APIResponse[TokenResponse],
    dependencies=[Depends(RateLimiter(times=100, minutes=1))]
)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(
            selectinload(User.student_profile),
            selectinload(User.faculty_profile)
        ).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    # User is authenticated. We allow all account statuses so the frontend can route them to appropriate status pages.
    
    academic_status = None
    employment_status = None
    if user.user_type == UserType.student and user.student_profile:
        academic_status = user.student_profile.academic_status.value
    elif user.user_type == UserType.faculty and user.faculty_profile:
        employment_status = user.faculty_profile.employment_status.value

    # Issue tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    return APIResponse(
        success=True, 
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_type=user.user_type,
            account_status=user.account_status,
            academic_status=academic_status,
            employment_status=employment_status
        ), 
        error=None
    )


@router.post(
    "/refresh", 
    summary="Refresh Token", 
    description="Exchanges a valid refresh token for a new access token.",
    response_model=APIResponse[RefreshTokenResponse]
)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid or expired refresh token")
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid token subject")
        
    # Ensure user still exists and is active
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or user.account_status != AccountStatus.active:
        raise HTTPException(status_code=400, detail="User no longer valid or deactivated")
        
    new_access_token = create_access_token(subject=str(user.id))
    
    return APIResponse(
        success=True, 
        data=RefreshTokenResponse(access_token=new_access_token), 
        error=None
    )

@router.get(
    "/me", 
    summary="Get Current User", 
    description="Fetches the profile and metadata for the currently authenticated user based on the JWT.",
    response_model=APIResponse[UserResponse]
)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get current logged in user details. Doesn't require any RBAC permissions.
    Allows users with "pending" profiles to check their status.
    """
    return APIResponse(
        success=True,
        data=UserResponse(
            id=current_user.id,
            email=current_user.email,
            user_id=current_user.user_id,
            account_status=current_user.account_status,
            status_note=current_user.status_note,
            user_type=current_user.user_type,
            academic_status=current_user.student_profile.academic_status if current_user.student_profile else None,
            employment_status=current_user.faculty_profile.employment_status if current_user.faculty_profile else None,
            name=current_user.name,
            photo_url=current_user.photo_url,
            email_notifications=current_user.email_notifications,
            in_app_alerts=current_user.in_app_alerts
        ),
        error=None
    )
