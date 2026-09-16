from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.api.deps import get_current_user, RateLimiter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User, UserType
from app.models.profiles import StudentProfile, StudentStatus
from app.models.academic import Course, Branch
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

router = APIRouter()

@router.post(
    "/register", 
    summary="Register Student", 
    description="Registers a new student user. Assigns the default 'Student' role and sets status to 'pending'.", 
    response_model=APIResponse[RegisterResponseData]
)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        return APIResponse(success=False, data=None, error="Email already registered")

    # Validate Course and Branch
    branch_result = await db.execute(
        select(Branch).where(
            Branch.id == data.branch_id,
            Branch.course_id == data.course_id,
            Branch.is_active == True
        )
    )
    branch = branch_result.scalar_one_or_none()
    if not branch:
        return APIResponse(success=False, data=None, error="Invalid or inactive course and branch combination")

    # Atomic transaction for User and Profile
    try:
        new_user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            user_type=UserType.student,
            name=data.name
        )
        db.add(new_user)
        await db.flush()  # to get new_user.id
        
        student_profile = StudentProfile(
            user_id=new_user.id,
            course_id=data.course_id,
            branch_id=data.branch_id,
            year=data.year,
            hostel=data.hostel.strip().lower() if data.hostel else None,
            photo_url=data.photo_url,
            status=StudentStatus.pending
        )
        db.add(student_profile)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return APIResponse(success=False, data=None, error="Database Integrity Error")

    return APIResponse(
        success=True, 
        data=RegisterResponseData(user_id=new_user.id, status=StudentStatus.pending.value), 
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
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token = create_access_token(subject=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}


@router.post(
    "/login", 
    summary="User Login", 
    description="Authenticates a user with email and password, returning access and refresh JWTs.",
    response_model=APIResponse[TokenResponse],
    dependencies=[Depends(RateLimiter(times=5, minutes=1))]
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
        return APIResponse(success=False, data=None, error="Invalid email or password")
        
    if not user.is_active:
        return APIResponse(success=False, data=None, error="User account is deactivated")
        
    # Get status from profile
    profile_status = "unknown"
    if user.user_type == UserType.student and user.student_profile:
        profile_status = user.student_profile.status.value
    elif user.user_type == UserType.faculty and user.faculty_profile:
        profile_status = user.faculty_profile.status.value

    # Issue tokens
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    
    return APIResponse(
        success=True, 
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_type=user.user_type,
            status=profile_status
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
        return APIResponse(success=False, data=None, error="Invalid or expired refresh token")
        
    user_id = payload.get("sub")
    if not user_id:
        return APIResponse(success=False, data=None, error="Invalid token subject")
        
    # Ensure user still exists and is active
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        return APIResponse(success=False, data=None, error="User no longer valid or deactivated")
        
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
    name = current_user.name
    photo_url = current_user.photo_url
    profile_status = None
    
    if current_user.user_type == UserType.student:
        from app.models.profiles import StudentProfile
        stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        res = await db.execute(stmt)
        prof = res.scalar_one_or_none()
        if prof:
            profile_status = prof.status.value
    elif current_user.user_type == UserType.faculty:
        from app.models.profiles import FacultyProfile
        stmt = select(FacultyProfile).where(FacultyProfile.user_id == current_user.id)
        res = await db.execute(stmt)
        prof = res.scalar_one_or_none()
        if prof:
            profile_status = prof.status.value
            
    return APIResponse(
        success=True,
        data=UserResponse(
            id=current_user.id,
            email=current_user.email,
            is_active=current_user.is_active,
            user_type=current_user.user_type,
            status=profile_status,
            name=name,
            photo_url=photo_url
        ),
        error=None
    )
