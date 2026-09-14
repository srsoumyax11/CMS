from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User, UserType
from app.models.profiles import StudentProfile, StudentStatus
from app.schemas.auth import (
    RegisterRequest, 
    LoginRequest, 
    TokenResponse, 
    RefreshTokenRequest, 
    RefreshTokenResponse,
    RegisterResponseData
)
from app.schemas.common import APIResponse

router = APIRouter()

@router.post("/register", response_model=APIResponse[RegisterResponseData])
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        return APIResponse(success=False, data=None, error="Email already registered")

    # Atomic transaction for User and Profile
    try:
        new_user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            user_type=UserType.student
        )
        db.add(new_user)
        await db.flush()  # to get new_user.id
        
        student_profile = StudentProfile(
            user_id=new_user.id,
            name=data.name,
            course=data.course,
            branch=data.branch,
            year=data.year,
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


@router.post("/token")
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


@router.post("/login", response_model=APIResponse[TokenResponse])
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


@router.post("/refresh", response_model=APIResponse[RefreshTokenResponse])
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
