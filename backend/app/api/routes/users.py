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
            return APIResponse(success=False, data=None, error="File size must be under 1MB")
            
        photo_url = await upload_avatar(photo, str(current_user.id))
    except Exception as e:
        return APIResponse(success=False, data=None, error=f"Failed to upload photo: {str(e)}")
        
    try:
        # Update the user profile in the database
        current_user.photo_url = photo_url
            
        await db.commit()
    except Exception as e:
        await db.rollback()
        return APIResponse(success=False, data=None, error="Database Error")
        
    return APIResponse(success=True, data={"photo_url": photo_url}, error=None)
from app.schemas.auth import NameUpdateRequest, PasswordChangeRequest

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
        return APIResponse(success=False, data=None, error="Database Error")

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
        return APIResponse(success=False, data=None, error="Incorrect current password")
    
    try:
        current_user.hashed_password = hash_password(data.new_password)
        await db.commit()
        return APIResponse(success=True, data={"message": "Password updated successfully"}, error=None)
    except Exception as e:
        await db.rollback()
        return APIResponse(success=False, data=None, error="Database Error")
