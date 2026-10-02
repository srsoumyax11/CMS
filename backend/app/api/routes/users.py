from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from app.core.security import get_current_user
from app.core.uow import get_uow, UnitOfWork
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.auth import (
    EmailUpdateRequest, 
    EmailVerifyOTPRequest,
    NameUpdateRequest, 
    PasswordChangeRequest, 
    UserIdUpdateRequest, 
    StudentProfileCreateRequest,
    UserPreferencesUpdateRequest
)
from app.services.user_service import UserService

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
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        photo_url = await service.upload_avatar(current_user, photo)
        return APIResponse(success=True, data={"photo_url": photo_url}, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/me/student-profile",
    summary="Get My Student Profile",
    description="Fetches the current student's academic profile for pre-filling forms.",
    response_model=APIResponse[dict]
)
async def get_my_student_profile(
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        profile = await service.get_student_profile(current_user)
        if not profile:
            return APIResponse(success=True, data=None, error=None)
            
        return APIResponse(success=True, data={
            "course_id": str(profile.course_id),
            "department_id": str(profile.department_id),
            "year": profile.year,
            "hostel": profile.hostel,
            "academic_status": profile.academic_status.value if profile.academic_status else None,
        }, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/me/student-profile",
    summary="Create Student Profile",
    description="Creates the academic profile for a newly registered student.",
    response_model=APIResponse[dict]
)
async def create_student_profile(
    data: StudentProfileCreateRequest,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        await service.create_student_profile(current_user, data)
        return APIResponse(success=True, data={"message": "Profile created successfully"}, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put(
    "/me/student-profile",
    summary="Update Student Profile",
    description="Updates the academic profile for a student whose account is under revision.",
    response_model=APIResponse[dict]
)
async def update_student_profile(
    data: StudentProfileCreateRequest,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        await service.update_student_profile(current_user, data)
        return APIResponse(success=True, data={"message": "Profile updated successfully"}, error=None)
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.patch(
    "/me/user-id",
    summary="Update User ID",
    description="Updates the user's User ID (username/roll number).",
    response_model=APIResponse[dict]
)
async def update_user_id(
    data: UserIdUpdateRequest,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        user = await service.update_user_id(current_user, data.user_id)
        return APIResponse(success=True, data={"user_id": user.user_id}, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch(
    "/me/name",
    summary="Update Profile Name",
    description="Updates the user's name.",
    response_model=APIResponse[dict]
)
async def update_profile_name(
    data: NameUpdateRequest,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        user = await service.update_profile_name(current_user, data.name)
        return APIResponse(success=True, data={"name": user.name}, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/me/password",
    summary="Change Password",
    description="Changes the user's password after verifying the current one.",
    response_model=APIResponse[dict]
)
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        await service.change_password(current_user, data)
        return APIResponse(success=True, data={"message": "Password updated successfully"}, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch(
    "/me/preferences",
    summary="Update Preferences",
    description="Updates the user's notification preferences.",
    response_model=APIResponse[dict]
)
async def update_preferences(
    data: UserPreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        user = await service.update_preferences(current_user, data)
        return APIResponse(success=True, data={
            "email_notifications": user.email_notifications,
            "in_app_alerts": user.in_app_alerts
        }, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        session_token = await service.request_email_update(current_user, data, background_tasks)
        return APIResponse(success=True, data={"message": "OTP sent to new address", "session_token": session_token}, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/me/email/verify",
    summary="Verify Email OTP",
    description="Verifies the OTP and updates the user's email address.",
    response_model=APIResponse[dict]
)
async def verify_email_update(
    data: EmailVerifyOTPRequest,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        user = await service.verify_email_update(current_user, data.session_token, data.otp)
        return APIResponse(success=True, data={"email": user.email}, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/me/2fa/enable-request",
    summary="Request 2FA Enablement",
    response_model=APIResponse[dict]
)
async def request_2fa_enable(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        session_token = await service.request_2fa_enable(current_user, background_tasks)
        return APIResponse(success=True, data={"message": "OTP sent", "session_token": session_token}, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/me/2fa/enable-verify",
    summary="Verify and Enable 2FA",
    response_model=APIResponse[dict]
)
async def verify_2fa_enable(
    data: EmailVerifyOTPRequest,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    try:
        await service.verify_2fa_enable(current_user, data.session_token, data.otp)
        return APIResponse(success=True, data={"message": "2FA successfully enabled"}, error=None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/me/2fa/disable",
    summary="Disable 2FA",
    response_model=APIResponse[dict]
)
async def disable_2fa(
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    service = UserService(uow)
    await service.disable_2fa(current_user)
    return APIResponse(success=True, data={"message": "2FA disabled successfully"})
