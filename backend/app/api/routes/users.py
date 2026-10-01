from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import random
import jwt
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, verify_password, hash_password, create_otp_session_token
from app.core.storage import upload_avatar
from app.models.user import User, UserType
from app.schemas.common import APIResponse
from app.schemas.auth import EmailUpdateRequest, EmailVerifyOTPRequest
from app.utils.email import send_email_background

router = APIRouter()

@router.post(
    "/me/photo", 
    summary="Upload Avatar", 
    description="Uploads a user avatar to Supabase and updates the profile URL.",
    response_model=APIResponse[dict]
)
async def upload_profile_photo(
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Check file size (1MB limit)
        if photo.size and photo.size > 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be under 1MB")
            
        photo_url = await upload_avatar(photo, str(current_user.id))
    except Exception as e:
        print(f"Photo upload error: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to upload photo")
        
    try:
        # Update the user profile in the database
        current_user.photo_url = photo_url
            
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database Error")
        
    return APIResponse(success=True, data={"photo_url": photo_url}, error=None)
from app.schemas.auth import NameUpdateRequest, PasswordChangeRequest, UserIdUpdateRequest, StudentProfileCreateRequest
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from app.models.profiles import StudentProfile, AcademicStatus
from app.models.academic import Course, Department

@router.get(
    "/me/student-profile",
    summary="Get My Student Profile",
    description="Fetches the current student's academic profile for pre-filling forms.",
    response_model=APIResponse[dict]
)
async def get_my_student_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.user_type != UserType.student:
        raise HTTPException(status_code=400, detail="Only students have a student profile")
    
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        return APIResponse(success=True, data=None, error=None)
    
    return APIResponse(success=True, data={
        "course_id": str(profile.course_id),
        "department_id": str(profile.department_id),
        "year": profile.year,
        "hostel": profile.hostel,
        "academic_status": profile.academic_status.value if profile.academic_status else None,
    }, error=None)

@router.post(
    "/me/student-profile",
    summary="Create Student Profile",
    description="Creates the academic profile for a newly registered student.",
    response_model=APIResponse[dict]
)
async def create_student_profile(
    data: StudentProfileCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.user_type != UserType.student:
        raise HTTPException(status_code=400, detail="Only students can create a student profile")
        
    # Check if profile already exists
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Student profile already exists")
        
    # Validate Course and Department
    course_res = await db.execute(select(Course).where(Course.id == data.course_id, Course.is_active == True))
    dept_res = await db.execute(select(Department).where(Department.id == data.department_id, Department.is_active == True))
    
    if not course_res.scalar_one_or_none() or not dept_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid or inactive course/department")
        
    try:
        profile = StudentProfile(
            user_id=current_user.id,
            course_id=data.course_id,
            department_id=data.department_id,
            year=data.year,
            hostel=data.hostel.strip().lower() if data.hostel else None,
            academic_status=AcademicStatus.enrolled
        )
        db.add(profile)
        await db.commit()
        return APIResponse(success=True, data={"message": "Profile created successfully"}, error=None)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database Error")

@router.put(
    "/me/student-profile",
    summary="Update Student Profile",
    description="Updates the academic profile for a student whose account is under revision.",
    response_model=APIResponse[dict]
)
async def update_student_profile(
    data: StudentProfileCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.user_type != UserType.student:
        raise HTTPException(status_code=400, detail="Only students can update a student profile")
        
    # Fetch existing profile
    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found. Use POST to create one.")
        
    # Validate Course and Department
    course_res = await db.execute(select(Course).where(Course.id == data.course_id, Course.is_active == True))
    dept_res = await db.execute(select(Department).where(Department.id == data.department_id, Department.is_active == True))
    
    if not course_res.scalar_one_or_none() or not dept_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid or inactive course/department")
        
    try:
        profile.course_id = data.course_id
        profile.department_id = data.department_id
        profile.year = data.year
        profile.hostel = data.hostel.strip().lower() if data.hostel else None
        await db.commit()
        return APIResponse(success=True, data={"message": "Profile updated successfully"}, error=None)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database Error")

@router.patch(
    "/me/user-id",
    summary="Update User ID",
    description="Updates the user's User ID (username/roll number).",
    response_model=APIResponse[dict]
)
async def update_user_id(
    data: UserIdUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        current_user.user_id = data.user_id
        await db.commit()
        return APIResponse(success=True, data={"user_id": current_user.user_id}, error=None)
    except IntegrityError as e:
        await db.rollback()
        error_msg = str(e.orig).lower() if e.orig else ""
        if "users_user_id_key" in error_msg or "user_id" in error_msg:
            raise HTTPException(status_code=400, detail="User ID is already taken")
        raise HTTPException(status_code=400, detail="Database Integrity Error")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database Error")

@router.patch(
    "/me/name",
    summary="Update Profile Name",
    description="Updates the user's name.",
    response_model=APIResponse[dict]
)
async def update_profile_name(
    data: NameUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        current_user.name = data.name
        await db.commit()
        return APIResponse(success=True, data={"name": current_user.name}, error=None)
    except Exception as e:
        await db.rollback()
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database Error")

@router.post(
    "/me/password",
    summary="Change Password",
    description="Changes the user's password after verifying the current one.",
    response_model=APIResponse[dict]
)
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    try:
        current_user.hashed_password = hash_password(data.new_password)
        await db.commit()
        return APIResponse(success=True, data={"message": "Password updated successfully"}, error=None)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database Error")

from app.schemas.auth import UserPreferencesUpdateRequest

@router.patch(
    "/me/preferences",
    summary="Update Preferences",
    description="Updates the user's notification preferences.",
    response_model=APIResponse[dict]
)
async def update_preferences(
    data: UserPreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        if data.email_notifications is not None:
            current_user.email_notifications = data.email_notifications
        if data.in_app_alerts is not None:
            current_user.in_app_alerts = data.in_app_alerts
            
        await db.commit()
        return APIResponse(success=True, data={
            "email_notifications": current_user.email_notifications,
            "in_app_alerts": current_user.in_app_alerts
        }, error=None)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database Error")


@router.post(
    "/me/email/request",
    summary="Request Email Update",
    description="Generates an email verification token and sends it to the new email address.",
    response_model=APIResponse[dict]
)
async def request_email_update(
    data: EmailUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if the new email is already in use
    stmt = select(User).where(User.email == data.new_email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email is already registered by another account")
        
    # Generate OTP
    otp_code = str(random.randint(100000, 999999))
    otp_hash = hash_password(otp_code)
    
    # Create the stateless session token
    session_token = create_otp_session_token(subject=current_user.id, new_email=data.new_email, otp_hash=otp_hash)
    
    # Send verification email
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
    
    return APIResponse(success=True, data={"message": "OTP sent to new address", "session_token": session_token}, error=None)

@router.post(
    "/me/email/verify",
    summary="Verify Email OTP",
    description="Verifies the OTP and updates the user's email address.",
    response_model=APIResponse[dict]
)
async def verify_email_update(
    data: EmailVerifyOTPRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = jwt.decode(data.session_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="OTP session expired. Please request a new code.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid OTP session token")

    if payload.get("type") != "email_otp":
        raise HTTPException(status_code=400, detail="Invalid token type")
        
    user_id = payload.get("sub")
    if not user_id or str(current_user.id) != user_id:
        raise HTTPException(status_code=400, detail="Token mismatch")
        
    new_email = payload.get("new_email")
    otp_hash = payload.get("otp_hash")
    
    if not new_email or not otp_hash:
        raise HTTPException(status_code=400, detail="Invalid token payload")
        
    # Verify OTP
    if not verify_password(data.otp, otp_hash):
        raise HTTPException(status_code=400, detail="Incorrect verification code")
        
    # Check again if email was taken in the meantime
    stmt = select(User).where(User.email == new_email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email is already registered by another account")
        
    try:
        current_user.email = new_email
        await db.commit()
        await db.refresh(current_user)
        return APIResponse(success=True, data={"message": "Email updated successfully"}, error=None)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error during email update")

# 2FA Endpoints

@router.post("/me/2fa/enable-request", summary="Request 2FA Enablement", response_model=APIResponse[dict])
async def request_2fa_enable(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    if current_user.is_2fa_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
        
    otp_code = str(random.randint(100000, 999999))
    otp_hash = hash_password(otp_code)
    
    session_token = create_otp_session_token(subject=current_user.id, new_email=current_user.email, otp_hash=otp_hash)
    
    send_email_background(
        background_tasks=background_tasks,
        to_email=current_user.email,
        subject="Enable Two-Factor Authentication",
        template_name="2fa_enable_otp.html",
        context={"name": current_user.name or "User", "otp_code": otp_code}
    )
    return APIResponse(success=True, data={"message": "OTP sent", "session_token": session_token}, error=None)

@router.post("/me/2fa/enable-verify", summary="Verify and Enable 2FA", response_model=APIResponse[dict])
async def verify_2fa_enable(
    data: EmailVerifyOTPRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = jwt.decode(data.session_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="OTP session expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid OTP session token")

    if payload.get("type") != "email_otp":
        raise HTTPException(status_code=400, detail="Invalid token type")
        
    user_id = payload.get("sub")
    if not user_id or str(current_user.id) != user_id:
        raise HTTPException(status_code=400, detail="Token mismatch")
        
    otp_hash = payload.get("otp_hash")
    
    if not verify_password(data.otp, otp_hash):
        raise HTTPException(status_code=400, detail="Incorrect verification code")
        
    try:
        current_user.is_2fa_enabled = True
        await db.commit()
        return APIResponse(success=True, data={"message": "2FA successfully enabled"}, error=None)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error")

@router.post("/me/2fa/disable", summary="Disable 2FA", response_model=APIResponse[dict])
async def disable_2fa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        current_user.is_2fa_enabled = False
        await db.commit()
        return APIResponse(success=True, data={"message": "2FA disabled"}, error=None)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error")
