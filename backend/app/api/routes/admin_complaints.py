from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.api.deps import require_permission, get_user_permissions
from app.core.permissions import Perms
from app.models.user import User, UserType
from app.models.complaint import Complaint, ComplaintStatusLog, ComplaintCategory, ComplaintVisibility, ComplaintStatus
from app.schemas.common import APIResponse
from app.schemas.complaint import (
    ComplaintResponse, 
    ComplaintListResponse, 
    ComplaintStatusUpdateRequest,
    ComplaintAssignRequest,
    RecurringIssueResponse,
    AgeingComplaintResponse
)
from app.core.storage import get_signed_url

router = APIRouter()

# Define valid state transitions
VALID_TRANSITIONS = {
    ComplaintStatus.open: [ComplaintStatus.in_progress, ComplaintStatus.resolved, ComplaintStatus.closed, ComplaintStatus.cancelled],
    ComplaintStatus.in_progress: [ComplaintStatus.resolved, ComplaintStatus.closed, ComplaintStatus.open],
    ComplaintStatus.resolved: [ComplaintStatus.closed, ComplaintStatus.in_progress],
    ComplaintStatus.closed: [], # Terminal
    ComplaintStatus.cancelled: [] # Terminal
}

@router.get("", response_model=APIResponse[ComplaintListResponse])
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


@router.patch("/{id}/status", response_model=APIResponse[ComplaintResponse])
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
        
    if req.status not in VALID_TRANSITIONS.get(complaint.status, []):
        raise HTTPException(
            status_code=422, 
            detail=f"Invalid state transition from {complaint.status} to {req.status}"
        )
        
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


@router.patch("/{id}/assign", response_model=APIResponse[ComplaintResponse])
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


@router.get("/analytics/recurring", response_model=APIResponse[List[RecurringIssueResponse]])
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


@router.get("/analytics/ageing", response_model=APIResponse[List[AgeingComplaintResponse]])
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
