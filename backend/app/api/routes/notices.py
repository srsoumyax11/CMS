from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from typing import Optional, List

from app.core.database import get_db
from app.models.user import User, UserType
from app.models.notice import Notice, NoticeRead
from app.models.profiles import StudentProfile
from app.schemas.notice import NoticeResponse, NoticeListResponse
from app.schemas.common import APIResponse
from app.api.deps import require_permission, get_current_user, get_user_permissions
from app.core.permissions import Perms
from app.core.storage import upload_notice_attachment

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
    target_branch_id: Optional[UUID] = Form(None),
    target_year: Optional[int] = Form(None),
    target_hostel: Optional[str] = Form(None),
    target_user_types: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.NOTICE_CREATE))
):
    attachment_url = None
    if file:
        if file.content_type not in ["image/jpeg", "image/png", "image/webp", "application/pdf"]:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP, and PDF files are allowed.")
            
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")
            
        attachment_url = await upload_notice_attachment(file_content, file.filename, file.content_type)
        
    if target_hostel:
        target_hostel = target_hostel.strip().lower()

    notice = Notice(
        title=title,
        content=content,
        author_id=current_user.id,
        attachment_url=attachment_url,
        target_course_id=target_course_id,
        target_branch_id=target_branch_id,
        target_year=target_year,
        target_hostel=target_hostel,
        target_user_types=target_user_types
    )
    
    db.add(notice)
    await db.commit()
    await db.refresh(notice)
    
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.NOTICE_LIST)),
    permissions: set = Depends(get_user_permissions)
):
    read_exists = select(NoticeRead.id).where(
        and_(NoticeRead.notice_id == Notice.id, NoticeRead.user_id == current_user.id)
    ).exists()
    
    stmt = select(Notice, read_exists.label("is_read")).order_by(Notice.created_at.desc())
    
    # Apply filtering based on user type
    if current_user.user_type == UserType.student:
        profile_stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        profile_result = await db.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Student profile not found")
            
        stmt = stmt.where(
            or_(
                Notice.target_user_types.is_(None),
                Notice.target_user_types.contains("student")
            ),
            or_(Notice.target_course_id.is_(None), Notice.target_course_id == profile.course_id),
            or_(Notice.target_branch_id.is_(None), Notice.target_branch_id == profile.branch_id),
            or_(Notice.target_year.is_(None), Notice.target_year == profile.year),
            or_(Notice.target_hostel.is_(None), Notice.target_hostel == profile.hostel)
        )
    elif current_user.user_type == UserType.faculty:
        stmt = stmt.where(
            or_(
                Notice.target_user_types.is_(None),
                Notice.target_user_types.contains("faculty")
            )
        )
    # Admin can see all notices
    
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    
    items = []
    for notice, is_read in result.all():
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.NOTICE_VIEW)),
    permissions: set = Depends(get_user_permissions)
):
    read_exists = select(NoticeRead.id).where(
        and_(NoticeRead.notice_id == Notice.id, NoticeRead.user_id == current_user.id)
    ).exists()
    
    stmt = select(Notice, read_exists.label("is_read")).where(Notice.id == id)
    result = await db.execute(stmt)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Notice not found")
        
    notice, is_read = row
    
    # Apply viewing logic
    if current_user.user_type == UserType.student:
        profile_stmt = select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        profile_result = await db.execute(profile_stmt)
        profile = profile_result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Student profile not found")
            
        can_view = True
        if notice.target_user_types and "student" not in notice.target_user_types:
            can_view = False
        if notice.target_course_id and notice.target_course_id != profile.course_id:
            can_view = False
        if notice.target_branch_id and notice.target_branch_id != profile.branch_id:
            can_view = False
        if notice.target_year and notice.target_year != profile.year:
            can_view = False
        if notice.target_hostel and notice.target_hostel != profile.hostel:
            can_view = False
            
        if not can_view:
            raise HTTPException(status_code=403, detail="You do not have access to this notice")
            
    elif current_user.user_type == UserType.faculty:
        if notice.target_user_types and "faculty" not in notice.target_user_types:
            raise HTTPException(status_code=403, detail="You do not have access to this notice")

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.NOTICE_VIEW))
):
    stmt = select(Notice).where(Notice.id == id)
    notice = (await db.execute(stmt)).scalar_one_or_none()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
        
    notice_read = NoticeRead(
        notice_id=id,
        user_id=current_user.id
    )
    
    try:
        db.add(notice_read)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # Already marked as read
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user), # Using get_current_user because we'll check manually
    permissions: set = Depends(get_user_permissions)
):
    stmt = select(Notice).where(Notice.id == id)
    result = await db.execute(stmt)
    notice = result.scalar_one_or_none()
    
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
        
    # RBAC logic without hardcoding is_superadmin
    if notice.author_id != current_user.id and Perms.NOTICE_DELETE not in permissions:
        raise HTTPException(status_code=403, detail="Cannot modify someone else's notice")
        
    await db.delete(notice)
    await db.commit()
    
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    permissions: set = Depends(get_user_permissions)
):
    stmt = select(Notice).where(Notice.id == id)
    result = await db.execute(stmt)
    notice = result.scalar_one_or_none()
    
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
        
    if notice.author_id != current_user.id and Perms.NOTICE_CREATE not in permissions:
        raise HTTPException(status_code=403, detail="Cannot modify someone else's notice")
        
    if title is not None:
        notice.title = title
    if content is not None:
        notice.content = content
        
    await db.commit()
    await db.refresh(notice)
    return APIResponse(success=True, data=NoticeResponse.model_validate(notice))
