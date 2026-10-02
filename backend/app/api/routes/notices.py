from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from typing import Optional, List

from app.core.uow import UnitOfWork
from app.models.user import User, UserType
from app.models.notice import Notice, NoticeRead
from app.models.profiles import StudentProfile
from app.schemas.notice import NoticeResponse, NoticeListResponse
from app.schemas.common import APIResponse
from app.api.deps import require_permission, get_current_user, get_user_permissions, get_uow
from app.services.notice_service import NoticeService
from app.core.permissions import Perms
from app.core.storage import upload_notice_attachment
from app.utils.validation import validate_upload_file

router = APIRouter(tags=["Notices"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post(
    "", 
    summary="Create Notice", 
    description="Creates a new targeted announcement. Supports file attachments. **Requires:** `notice:create`",
    response_model=APIResponse[NoticeResponse]
)
async def create_notice(
    title: str = Form(...),
    content: str = Form(...),
    target_course_id: Optional[UUID] = Form(None),
    target_department_id: Optional[UUID] = Form(None),
    target_year: Optional[int] = Form(None),
    target_hostel: Optional[str] = Form(None),
    target_user_types: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.NOTICE_CREATE))
):
    service = NoticeService(uow)
    attachment_url = None
    if file:
        from app.core.config import settings
        ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
        await validate_upload_file(file, allowed_types=ALLOWED_MIME_TYPES, max_size_mb=settings.MAX_UPLOAD_FILE_SIZE_MB)
        
        file_content = await file.read()
        attachment_url = await upload_notice_attachment(file_content, file.content_type)
        
    if target_hostel:
        target_hostel = target_hostel.strip()

    notice = Notice(
        title=title,
        content=content,
        author_id=current_user.id,
        attachment_url=attachment_url,
        target_course_id=target_course_id,
        target_department_id=target_department_id,
        target_year=target_year,
        target_hostel=target_hostel,
        target_user_types=target_user_types
    )
    
    notice = await service.create_notice(notice)
    
    return APIResponse(success=True, data=NoticeResponse.model_validate(notice))


@router.get(
    "", 
    summary="List Notices", 
    description="Fetches a feed of notices dynamically filtered by the user's role and target bounds (course, year, hostel). **Requires:** `notice:list`",
    response_model=APIResponse[NoticeListResponse]
)
async def list_notices(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.NOTICE_LIST)),
    permissions: set = Depends(get_user_permissions)
):
    service = NoticeService(uow)
    
    profile = None
    if current_user.user_type == UserType.student:
        profile_stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        profile_result = await uow.db.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=404, detail="Student profile not found")
            
    notices, total = await service.get_feed_for_user(current_user.id, current_user.user_type, profile, skip, limit)
    
    items = []
    for notice, is_read in notices:
        data = NoticeResponse.model_validate(notice)
        data.is_read = is_read
        items.append(data)
    
    return APIResponse(
        success=True,
        data=NoticeListResponse(
            items=items,
            total=len(items) # Simplified pagination total
        )
    )

@router.get(
    "/{id}", 
    summary="Get Notice Detail", 
    description="Fetches a specific notice, enforcing targeting visibility logic. **Requires:** `notice:view`",
    response_model=APIResponse[NoticeResponse]
)
async def get_notice(
    id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.NOTICE_VIEW)),
    permissions: set = Depends(get_user_permissions)
):
    service = NoticeService(uow)
    
    profile = None
    if current_user.user_type == UserType.student:
        profile_stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        profile_result = await uow.db.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()

    try:
        row = await service.get_notice(id, current_user.id, current_user.user_type, profile)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
        
    if not row:
        raise HTTPException(status_code=404, detail="Notice not found")
        
    notice, is_read = row

    response_data = NoticeResponse.model_validate(notice)
    response_data.is_read = is_read
    return APIResponse(success=True, data=response_data)

@router.post(
    "/{id}/read", 
    summary="Mark Notice as Read", 
    description="Records a read receipt for the current user to track unread notices. **Requires:** `notice:view`",
    response_model=APIResponse[bool]
)
async def mark_notice_read(
    id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.NOTICE_VIEW))
):
    service = NoticeService(uow)
    try:
        await service.mark_as_read(id, current_user.id)
    except IntegrityError:
        pass
        
    return APIResponse(success=True, data=True)

@router.delete(
    "/{id}", 
    summary="Delete Notice", 
    description="Deletes a notice. Users can delete their own notices; admins can delete any. **Requires:** Ownership OR `notice:delete`",
    response_model=APIResponse[NoticeResponse]
)
async def delete_notice(
    id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user), # Using get_current_user because we'll check manually
    permissions: set = Depends(get_user_permissions)
):
    service = NoticeService(uow)
    has_perm = Perms.NOTICE_DELETE in permissions
    try:
        notice = await service.delete_notice(id, current_user.id, has_perm)
        if not notice:
            raise HTTPException(status_code=404, detail="Notice not found")
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    
    return APIResponse(success=True, data=NoticeResponse.model_validate(notice))

@router.patch(
    "/{id}", 
    summary="Update Notice", 
    description="Updates the title or content of a notice. **Requires:** Ownership OR `notice:create`",
    response_model=APIResponse[NoticeResponse]
)
async def update_notice(
    id: UUID,
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user),
    permissions: set = Depends(get_user_permissions)
):
    service = NoticeService(uow)
    has_perm = Perms.NOTICE_CREATE in permissions
    update_data = {}
    if title is not None:
        update_data["title"] = title
    if content is not None:
        update_data["content"] = content
        
    try:
        notice = await service.update_notice(id, current_user.id, has_perm, update_data)
        if not notice:
            raise HTTPException(status_code=404, detail="Notice not found")
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    return APIResponse(success=True, data=NoticeResponse.model_validate(notice))
