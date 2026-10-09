from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.uow import UnitOfWork
from app.core.security import get_current_user
from app.api.deps import require_permission, get_user_permissions, can_view_complaint_detail, RateLimiter, get_uow, get_department_scope
from app.core.permissions import Perms
from app.core.storage import upload_complaint_photo, get_signed_url
from app.services.complaint_service import ComplaintService
from app.models.user import User, UserType
from app.models.complaint import Complaint, ComplaintStatusLog, ComplaintCategory, ComplaintVisibility, ComplaintStatus
from app.schemas.common import APIResponse
from app.schemas.complaint import ComplaintResponse, ComplaintListResponse, ComplaintStatusUpdateRequest, ComplaintAssignRequest, RecurringIssueResponse, AgeingComplaintResponse
from app.utils.validation import validate_upload_file
from app.api.middleware import verify_ownership
from app.api.deps import get_complaint_service

router = APIRouter()

@router.post(
    "/", 
    summary="Create Complaint", 
    description="Raises a new complaint. Can optionally include a photo upload. Rate-limited to 3 per hour. **Requires:** `complaint:create`",
    response_model=APIResponse[ComplaintResponse],
    dependencies=[Depends(RateLimiter(times=3, hours=1))]
)
async def create_complaint(
    category: ComplaintCategory = Form(...),
    hostel_id: Optional[UUID] = Form(None),
    room_number: Optional[str] = Form(None),
    description: str = Form(...),
    visibility: ComplaintVisibility = Form(ComplaintVisibility.public),
    photo: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_CREATE)),
    uow: UnitOfWork = Depends(get_uow)
):
    service = ComplaintService(uow)
    
    # Rate Limiting check
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    stmt = select(func.count(Complaint.id)).where(
        Complaint.raised_by == current_user.id,
        Complaint.created_at >= one_hour_ago
    )
    result = await uow.db.execute(stmt)
    count = result.scalar()
    
    if count is not None and count >= 3:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Maximum 3 complaints per hour.")

    photo_path = None
    if photo:
        await validate_upload_file(photo)
        
        try:
            photo_path = await upload_complaint_photo(photo, str(current_user.id))
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Complaint photo upload error: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to upload complaint evidence")

    complaint = Complaint(
        raised_by=current_user.id,
        category=category,
        hostel_id=hostel_id,
        room_number=room_number,
        description=description,
        visibility=visibility,
        photo_url=photo_path,
        status=ComplaintStatus.open
    )
    
    complaint = await service.create_complaint(complaint, changed_by=current_user.id)
    if complaint:
        await uow.db.refresh(complaint)
        
    # Re-fetch for response mapping if needed, or construct response
    response_data = ComplaintResponse.model_validate(complaint)
    if response_data.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", str(response_data.photo_url))
        
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
    uow: UnitOfWork = Depends(get_uow)
):
    service = ComplaintService(uow)
    complaints, total = await service.get_user_complaints(current_user.id, skip, limit)
    
    items = []
    for c in complaints:
        c_res = ComplaintResponse.model_validate(c)
        if c.photo_url:
            c_res.photo_url = get_signed_url("complaint-attachments", str(c.photo_url))
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
    uow: UnitOfWork = Depends(get_uow)
):
    service = ComplaintService(uow)
    complaints, total = await service.get_public_complaints(skip, limit)
    
    items = []
    for c in complaints:
        c_res = ComplaintResponse.model_validate(c)
        if c.photo_url:
            c_res.photo_url = get_signed_url("complaint-attachments", str(c.photo_url))
        items.append(c_res)
        
    return APIResponse(success=True, data=ComplaintListResponse(total=total, items=items))


@router.get(
    "/", 
    summary="List All Complaints (Admin)", 
    description="Fetches complaints across the system for admins/faculty. **Requires:** `complaint:list`",
    response_model=APIResponse[ComplaintListResponse]
)
async def list_all_complaints(
    status_filter: Optional[ComplaintStatus] = Query(None, alias="status"),
    category: Optional[ComplaintCategory] = None,
    hostel_id: Optional[UUID] = None,
    department_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    uow: UnitOfWork = Depends(get_uow),
    scope_dept_id: Optional[UUID] = Depends(get_department_scope),
    _ = Depends(require_permission(Perms.COMPLAINT_LIST)),
    user_permissions: set = Depends(get_user_permissions)
):
    effective_dept_id = scope_dept_id if scope_dept_id is not None else department_id
    service = ComplaintService(uow)
    complaints, total = await service.get_all_complaints(
        status=status_filter,
        category=category,
        hostel_id=hostel_id,
        department_id=effective_dept_id,
        skip=skip,
        limit=limit
    )
    
    items = []
    can_view_private = Perms.COMPLAINT_VIEW_PRIVATE in user_permissions
    
    for c in complaints:
        # TODO: if a future role has complaint:list without complaint:view_private, 
        # private rows in this list must be redacted to a minimal shape rather than full detail.
        # Currently, all list-capable roles have view_private.
        if c.visibility == ComplaintVisibility.private and not can_view_private:
            # Minimal shape redaction fallback
            redacted = ComplaintResponse(
                id=c.id, # type: ignore
                raised_by=c.raised_by, # type: ignore
                category=c.category,
                hostel_id=c.hostel_id,
                room_number=c.room_number,
                description="[REDACTED]",
                photo_url=None,
                visibility=c.visibility,
                status=c.status,
                assigned_to=c.assigned_to, # type: ignore
                created_at=c.created_at,
                updated_at=c.updated_at
            )
            items.append(redacted)
            continue
            
        c_res = ComplaintResponse.model_validate(c)
        if c.photo_url:
            c_res.photo_url = get_signed_url("complaint-attachments", str(c.photo_url))
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
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_RESOLVE))
):
    service = ComplaintService(uow)
    complaint = await service.update_status(
        id=id, 
        new_status=req.status, 
        changed_by=current_user.id, 
        note=req.note
    )
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    await uow.db.refresh(complaint)
        
    response_data = ComplaintResponse.model_validate(complaint)
    if complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", str(complaint.photo_url))
        
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
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_ASSIGN))
):
    service = ComplaintService(uow)
    complaint = await service.get_complaint(id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    # Verify assignee is Faculty or SuperAdmin
    assignee_stmt = select(User).where(User.id == req.assigned_to)
    assignee = (await uow.db.execute(assignee_stmt)).scalar_one_or_none()
    
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found")
        
    if assignee.user_type not in [UserType.faculty, UserType.admin]:
        raise HTTPException(
            status_code=422, 
            detail="Cannot assign complaint to a non-staff user. Target user must be Faculty or SuperAdmin."
        )
        
    updated_complaint = await service.assign_complaint(id, req.assigned_to)
    if not updated_complaint:
        raise HTTPException(status_code=404, detail="Complaint assignment failed")
        
    await uow.db.refresh(updated_complaint)
        
    response_data = ComplaintResponse.model_validate(updated_complaint)
    if updated_complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", str(updated_complaint.photo_url))
        
    return APIResponse(success=True, data=response_data)


@router.get(
    "/analytics/recurring", 
    summary="Get Recurring Issue Analytics", 
    description="Identifies hotspots (e.g., specific hostel rooms) with multiple unresolved complaints. **Requires:** `complaint:list`",
    response_model=APIResponse[List[RecurringIssueResponse]]
)
async def get_recurring_analytics(
    days: int = Query(30, ge=1, le=365),
    uow: UnitOfWork = Depends(get_uow),
    _ = Depends(require_permission(Perms.COMPLAINT_LIST))
):
    service = ComplaintService(uow)
    items = await service.get_recurring_analytics(days)
    return APIResponse(success=True, data=items)


@router.get(
    "/analytics/ageing", 
    summary="Get Ageing Complaint Analytics", 
    description="Returns a list of complaints that have been open for an extended period. **Requires:** `complaint:list`",
    response_model=APIResponse[List[AgeingComplaintResponse]]
)
async def get_ageing_analytics(
    uow: UnitOfWork = Depends(get_uow),
    _ = Depends(require_permission(Perms.COMPLAINT_LIST))
):
    service = ComplaintService(uow)
    complaints = await service.get_ageing_analytics()
    
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

@verify_ownership(resource_name="complaint")
async def get_complaint(
    id: UUID,
    service: ComplaintService = Depends(get_complaint_service),
    current_user: User = Depends(require_permission(Perms.COMPLAINT_VIEW)),
    permissions: set = Depends(get_user_permissions)
):
    complaint = await service.get_complaint(id)
    
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    response_data = ComplaintResponse.model_validate(complaint)
    if complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", str(complaint.photo_url))
        
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
    uow: UnitOfWork = Depends(get_uow)
):
    service = ComplaintService(uow)
    try:
        complaint = await service.cancel_complaint(id, current_user.id)
        if complaint:
            await uow.db.refresh(complaint)
    except ValueError as e:
        # Map service validation errors to 400 or 403
        if "authorized" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
        
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    response_data = ComplaintResponse.model_validate(complaint)
    if complaint.photo_url:
        response_data.photo_url = get_signed_url("complaint-attachments", str(complaint.photo_url))
        
    return APIResponse(success=True, data=response_data)
