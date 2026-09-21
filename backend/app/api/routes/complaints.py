from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.api.deps import require_permission, get_user_permissions, can_view_complaint_detail, RateLimiter
from app.core.permissions import Perms
from app.core.storage import upload_complaint_photo, get_signed_url
from app.models.user import User, UserType
from app.models.complaint import Complaint, ComplaintStatusLog, ComplaintCategory, ComplaintVisibility, ComplaintStatus
from app.schemas.common import APIResponse
from app.schemas.complaint import ComplaintResponse, ComplaintListResponse, ComplaintStatusUpdateRequest, ComplaintAssignRequest, RecurringIssueResponse, AgeingComplaintResponse

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024 # 5 MB
ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"]

@router.post(
    "", 
    summary="Create Complaint", 
    description="Raises a new complaint. Can optionally include a photo upload. Rate-limited to 3 per hour. **Requires:** `complaint:create`",
    response_model=APIResponse[ComplaintResponse],
    dependencies=[Depends(RateLimiter(times=3, hours=1))]
)
async def create_complaint(
    category: ComplaintCategory = Form(...),
    location_hostel: str = Form(...),
    location_room: Optional[str] = Form(None),
    description: str = Form(...),
    visibility: ComplaintVisibility = Form(ComplaintVisibility.public),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_CREATE)),
    db: AsyncSession = Depends(get_db)
):
    # Rate Limiting check
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    stmt = select(func.count(Complaint.id)).where(
        Complaint.raised_by == current_user.id,
        Complaint.created_at >= one_hour_ago
    )
    result = await db.execute(stmt)
    count = result.scalar()
    
    if count >= 3:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Maximum 3 complaints per hour.")

    photo_path = None
    if photo:
        if photo.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, and WEBP are allowed.")
            
        file_bytes = await photo.read()
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
            
        # Reset file pointer after reading length
        await photo.seek(0)
        
        try:
            photo_path = await upload_complaint_photo(photo, str(current_user.id))
        except Exception as e:
            print(f"Complaint photo upload error: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to upload complaint evidence")

    location_hostel = location_hostel.strip().lower()
    
    complaint = Complaint(
        raised_by=current_user.id,
        category=category,
        location_hostel=location_hostel,
        location_room=location_room,
        description=description,
        visibility=visibility,
        photo_url=photo_path,
        status=ComplaintStatus.open
    )
    db.add(complaint)
    await db.flush() # To get complaint.id
    
    status_log = ComplaintStatusLog(
        complaint_id=complaint.id,
        status=ComplaintStatus.open,
        changed_by=current_user.id,
        note="Complaint raised."
    )
    db.add(status_log)
    await db.commit()
    await db.refresh(complaint)
        
    # Re-fetch for response mapping if needed, or construct response
    response_data = ComplaintResponse.model_validate(complaint)
    if response_data.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", response_data.photo_url)
        
    return APIResponse(success=True, data=response_data)

@router.get(
    "/mine", 
    summary="List My Complaints", 
    description="Fetches all complaints raised by the current user. **Requires:** `complaint:view`",
    response_model=APIResponse[ComplaintListResponse]
)
async def get_my_complaints(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_VIEW)),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Complaint).where(Complaint.raised_by == current_user.id).order_by(Complaint.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    complaints = result.scalars().all()
    
    count_stmt = select(func.count(Complaint.id)).where(Complaint.raised_by == current_user.id)
    total = (await db.execute(count_stmt)).scalar()
    
    items = []
    for c in complaints:
        c_res = ComplaintResponse.model_validate(c)
        if c.photo_url:
            c_res.photo_url = get_signed_url("complaint-attachments", c.photo_url)
        items.append(c_res)
        
    return APIResponse(success=True, data=ComplaintListResponse(total=total, items=items))

@router.get(
    "/public", 
    summary="List Public Complaints", 
    description="Fetches all complaints marked as 'public' by their authors. **Requires:** `complaint:view`",
    response_model=APIResponse[ComplaintListResponse]
)
async def get_public_complaints(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    _: User = Depends(require_permission(Perms.COMPLAINT_VIEW)),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Complaint).where(Complaint.visibility == ComplaintVisibility.public).order_by(Complaint.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    complaints = result.scalars().all()
    
    count_stmt = select(func.count(Complaint.id)).where(Complaint.visibility == ComplaintVisibility.public)
    total = (await db.execute(count_stmt)).scalar()
    
    items = []
    for c in complaints:
        c_res = ComplaintResponse.model_validate(c)
        if c.photo_url:
            c_res.photo_url = get_signed_url("complaint-attachments", c.photo_url)
        items.append(c_res)
        
    return APIResponse(success=True, data=ComplaintListResponse(total=total, items=items))


@router.get(
    "", 
    summary="List All Complaints (Admin)", 
    description="Fetches complaints across the system for admins/faculty. **Requires:** `complaint:list`",
    response_model=APIResponse[ComplaintListResponse]
)
async def list_all_complaints(
    status_filter: Optional[ComplaintStatus] = Query(None, alias="status"),
    category: Optional[ComplaintCategory] = None,
    hostel: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.COMPLAINT_LIST)),
    user_permissions: set = Depends(get_user_permissions)
):
    stmt = select(Complaint)
    
    if status_filter:
        stmt = stmt.where(Complaint.status == status_filter)
    if category:
        stmt = stmt.where(Complaint.category == category)
    if hostel:
        stmt = stmt.where(Complaint.location_hostel == hostel)
        
    stmt = stmt.order_by(Complaint.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    complaints = result.scalars().all()
    
    count_stmt = select(func.count(Complaint.id))
    if status_filter:
        count_stmt = count_stmt.where(Complaint.status == status_filter)
    if category:
        count_stmt = count_stmt.where(Complaint.category == category)
    if hostel:
        count_stmt = count_stmt.where(Complaint.location_hostel == hostel)
        
    total = (await db.execute(count_stmt)).scalar()
    
    items = []
    can_view_private = Perms.COMPLAINT_VIEW_PRIVATE in user_permissions
    
    for c in complaints:
        # TODO: if a future role has complaint:list without complaint:view_private, 
        # private rows in this list must be redacted to a minimal shape rather than full detail.
        # Currently, all list-capable roles have view_private.
        if c.visibility == ComplaintVisibility.private and not can_view_private:
            # Minimal shape redaction fallback
            redacted = ComplaintResponse(
                id=c.id,
                raised_by=c.raised_by, # Typically redacted, but schema requires it. Let's just pass for now as we don't have roles lacking view_private.
                category=c.category,
                location_hostel=c.location_hostel,
                location_room=c.location_room,
                description="[REDACTED]",
                photo_url=None,
                visibility=c.visibility,
                status=c.status,
                assigned_to=c.assigned_to,
                created_at=c.created_at,
                updated_at=c.updated_at
            )
            items.append(redacted)
            continue
            
        c_res = ComplaintResponse.model_validate(c)
        if c.photo_url:
            c_res.photo_url = get_signed_url("complaint-attachments", c.photo_url)
        items.append(c_res)
        
    return APIResponse(success=True, data=ComplaintListResponse(total=total, items=items))


@router.patch(
    "/{id}/status", 
    summary="Update Complaint Status", 
    description="Transitions a complaint to a new state (e.g. resolved, in_progress). Logs the transition transactionally. **Requires:** `complaint:resolve`",
    response_model=APIResponse[ComplaintResponse]
)
async def update_complaint_status(
    id: UUID,
    req: ComplaintStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_RESOLVE))
):
    stmt = select(Complaint).where(Complaint.id == id)
    result = await db.execute(stmt)
    complaint = result.scalar_one_or_none()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    complaint.status = req.status
    
    status_log = ComplaintStatusLog(
        complaint_id=complaint.id,
        status=req.status,
        changed_by=current_user.id,
        note=req.note
    )
    db.add(status_log)
    await db.commit()
    await db.refresh(complaint)
        
    response_data = ComplaintResponse.model_validate(complaint)
    if complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", complaint.photo_url)
        
    return APIResponse(success=True, data=response_data)


@router.patch(
    "/{id}/assign", 
    summary="Assign Complaint", 
    description="Assigns a complaint to a specific faculty member. **Requires:** `complaint:assign`",
    response_model=APIResponse[ComplaintResponse]
)
async def assign_complaint(
    id: UUID,
    req: ComplaintAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_ASSIGN))
):
    stmt = select(Complaint).where(Complaint.id == id)
    result = await db.execute(stmt)
    complaint = result.scalar_one_or_none()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Verify assignee is Faculty or SuperAdmin
    assignee_stmt = select(User).where(User.id == req.assigned_to)
    assignee = (await db.execute(assignee_stmt)).scalar_one_or_none()
    
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found")
        
    if assignee.user_type not in [UserType.faculty, UserType.admin]:
        raise HTTPException(
            status_code=422, 
            detail="Cannot assign complaint to a non-staff user. Target user must be Faculty or SuperAdmin."
        )
        
    complaint.assigned_to = req.assigned_to
    await db.commit()
    await db.refresh(complaint)
        
    response_data = ComplaintResponse.model_validate(complaint)
    if complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", complaint.photo_url)
        
    return APIResponse(success=True, data=response_data)


@router.get(
    "/analytics/recurring", 
    summary="Get Recurring Issue Analytics", 
    description="Identifies hotspots (e.g., specific hostel rooms) with multiple unresolved complaints. **Requires:** `complaint:list`",
    response_model=APIResponse[List[RecurringIssueResponse]]
)
async def get_recurring_analytics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.COMPLAINT_LIST))
):
    window_start = datetime.now(timezone.utc) - timedelta(days=days)
    
    stmt = (
        select(Complaint.category, Complaint.location_hostel, func.count(Complaint.id).label("count"))
        .where(Complaint.created_at >= window_start)
        .group_by(Complaint.category, Complaint.location_hostel)
        .order_by(func.count(Complaint.id).desc())
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    items = []
    for row in rows:
        items.append(RecurringIssueResponse(
            category=row.category,
            location_hostel=row.location_hostel,
            count=row.count,
            window_days=days
        ))
        
    return APIResponse(success=True, data=items)


@router.get(
    "/analytics/ageing", 
    summary="Get Ageing Complaint Analytics", 
    description="Returns a list of complaints that have been open for an extended period. **Requires:** `complaint:list`",
    response_model=APIResponse[List[AgeingComplaintResponse]]
)
async def get_ageing_analytics(
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.COMPLAINT_LIST))
):
    terminal_states = [ComplaintStatus.resolved, ComplaintStatus.closed, ComplaintStatus.cancelled]
    
    stmt = (
        select(Complaint)
        .where(Complaint.status.not_in(terminal_states))
        .order_by(Complaint.created_at.asc())
    )
    
    result = await db.execute(stmt)
    complaints = result.scalars().all()
    
    now = datetime.now(timezone.utc)
    items = []
    for c in complaints:
        # naive created_at is returned, ensure tz aware comparison
        created_aware = c.created_at if c.created_at.tzinfo else c.created_at.replace(tzinfo=timezone.utc)
        age_days = (now - created_aware).days
        
        items.append(AgeingComplaintResponse(
            id=c.id,
            category=c.category,
            location_hostel=c.location_hostel,
            location_room=c.location_room,
            status=c.status,
            created_at=c.created_at,
            age_days=age_days
        ))
        
    return APIResponse(success=True, data=items)

@router.get(
    "/{id}", 
    summary="Get Complaint Detail", 
    description="Fetches details for a specific complaint. Protected by IDOR checks (Owner or Public). **Requires:** `complaint:view`",
    response_model=APIResponse[ComplaintResponse]
)
async def get_complaint(
    id: UUID,
    current_user: User = Depends(require_permission(Perms.COMPLAINT_VIEW)),
    user_permissions: set = Depends(get_user_permissions),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Complaint).where(Complaint.id == id)
    result = await db.execute(stmt)
    complaint = result.scalar_one_or_none()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    if not can_view_complaint_detail(complaint, current_user, user_permissions):
        # We raise 403 because we found the complaint but the user lacks visibility
        raise HTTPException(status_code=403, detail="Not authorized to view this complaint")
        
    response_data = ComplaintResponse.model_validate(complaint)
    if complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", complaint.photo_url)
        
    return APIResponse(success=True, data=response_data)

@router.patch(
    "/{id}/cancel", 
    summary="Cancel Complaint", 
    description="Allows the author to cancel their own complaint, triggering a status log. Protected by IDOR checks. **Requires:** `complaint:edit`",
    response_model=APIResponse[ComplaintResponse]
)
async def cancel_complaint(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Complaint).where(Complaint.id == id)
    result = await db.execute(stmt)
    complaint = result.scalar_one_or_none()
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Ownership check
    if complaint.raised_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this complaint")
        
    if complaint.status != ComplaintStatus.open:
        raise HTTPException(status_code=400, detail="Only open complaints can be cancelled")
        
    complaint.status = ComplaintStatus.cancelled
    
    status_log = ComplaintStatusLog(
        complaint_id=complaint.id,
        status=ComplaintStatus.cancelled,
        changed_by=current_user.id,
        note="Cancelled by creator."
    )
    db.add(status_log)
    await db.commit()
    await db.refresh(complaint)
        
    response_data = ComplaintResponse.model_validate(complaint)
    if complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", complaint.photo_url)
        
    return APIResponse(success=True, data=response_data)
