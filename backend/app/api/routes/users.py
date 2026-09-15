from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
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
        photo_url = await upload_avatar(photo, str(current_user.id))
    except Exception as e:
        return APIResponse(success=False, data=None, error=f"Failed to upload photo: {str(e)}")
        
    try:
        # Update the profile in the database
        if current_user.user_type == UserType.student and current_user.student_profile:
            current_user.student_profile.photo_url = photo_url
        elif current_user.user_type == UserType.faculty and current_user.faculty_profile:
            current_user.faculty_profile.photo_url = photo_url
        else:
            return APIResponse(success=False, data=None, error="Profile not found")
            
        await db.commit()
    except Exception as e:
        await db.rollback()
        return APIResponse(success=False, data=None, error="Database Error")
        
    return APIResponse(success=True, data={"photo_url": photo_url}, error=None)
