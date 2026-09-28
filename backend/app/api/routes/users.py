from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, verify_password, hash_password
from app.core.storage import upload_avatar
from app.models.user import User, UserType
from app.schemas.common import APIResponse

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
from app.models.academic import Branch

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
        "branch_id": str(profile.branch_id),
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
        
    # Validate Course and Branch
    branch_result = await db.execute(
        select(Branch).where(
            Branch.id == data.branch_id,
            Branch.course_id == data.course_id,
            Branch.is_active == True
        )
    )
    if not branch_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid or inactive course and branch combination")
        
    try:
        profile = StudentProfile(
            user_id=current_user.id,
            course_id=data.course_id,
            branch_id=data.branch_id,
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
        
    # Validate Course and Branch
    branch_result = await db.execute(
        select(Branch).where(
            Branch.id == data.branch_id,
            Branch.course_id == data.course_id,
            Branch.is_active == True
        )
    )
    if not branch_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid or inactive course and branch combination")
        
    try:
        profile.course_id = data.course_id
        profile.branch_id = data.branch_id
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

from app.schemas.auth import EmailUpdateRequest, EmailVerifyRequest
from app.core.security import create_verification_token, decode_token
from app.utils.email import send_email_background
from fastapi import BackgroundTasks
from sqlalchemy import select

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
        
    token = create_verification_token(subject=current_user.id, new_email=data.new_email)
    
    # In a real app, this URL should be read from settings (e.g. settings.FRONTEND_URL)
    # For now we use the Vite dev server default
    frontend_url = "http://localhost:5173"
    verify_link = f"{frontend_url}/verify-email?token={token}"
    
    # Send verification email
    # (Assuming we create a template at templates/email/verify_email.html)
    send_email_background(
        background_tasks=background_tasks,
        to_email=data.new_email,
        subject="Verify your new email address",
        template_name="verify_email.html",
        context={
            "name": current_user.name or "User",
            "verify_link": verify_link,
            "new_email": data.new_email
        }
    )
    
    return APIResponse(success=True, data={"message": "Verification email sent to new address"}, error=None)

@router.post(
    "/me/email/verify",
    summary="Verify Email Update",
    description="Verifies the token and updates the user's email address.",
    response_model=APIResponse[dict]
)
async def verify_email_update(
    data: EmailVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    payload = decode_token(data.token)
    if not payload or payload.get("type") != "email_verification":
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid token payload")
        
    new_email = payload.get("new_email")
    if not new_email:
        raise HTTPException(status_code=400, detail="Invalid token payload")
        
    # Check again if email was taken in the meantime
    stmt = select(User).where(User.email == new_email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email is already registered by another account")
        
    try:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        target_user = result.scalar_one_or_none()
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        target_user.email = new_email
        await db.commit()
        return APIResponse(success=True, data={"message": "Email updated successfully"}, error=None)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Database error during email update")
