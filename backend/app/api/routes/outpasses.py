from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.models.outpass import Outpass, OutpassStatus, OutpassStatusLog
from app.models.notification import Notification, NotificationType
from app.schemas.outpass import OutpassCreateRequest, OutpassResponse, OutpassListResponse, OutpassRejectRequest, OutpassApprovalActionResponse
from app.schemas.common import APIResponse
from app.api.deps import require_permission, get_current_user, get_user_permissions, can_view_outpass
from app.core.permissions import Perms
from app.utils.email import send_email_background

router = APIRouter(tags=["Outpasses"])

@router.post(
    "", 
    summary="Request Outpass", 
    description="Creates a new outpass request. Overlap validation prevents concurrent outpasses. **Requires:** `outpass:create`",
    response_model=APIResponse[OutpassResponse]
)
async def create_outpass(
    request: OutpassCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_CREATE))
):
    # Check for overlapping outpasses
    stmt = select(Outpass).where(
        Outpass.student_id == current_user.id,
        Outpass.status.in_([OutpassStatus.pending, OutpassStatus.approved, OutpassStatus.active]),
        Outpass.departure_time < request.expected_return_time,
        Outpass.expected_return_time > request.departure_time
    )
    result = await db.execute(stmt)
    overlapping = result.scalar_one_or_none()
    
    if overlapping:
        raise HTTPException(
            status_code=400,
            detail=f"Overlapping outpass found from {overlapping.departure_time} to {overlapping.expected_return_time}"
        )
        
    await db.commit()
    async with db.begin():
        new_outpass = Outpass(
            student_id=current_user.id,
            destination=request.destination,
            reason=request.reason,
            departure_time=request.departure_time,
            expected_return_time=request.expected_return_time,
            status=OutpassStatus.pending
        )
        db.add(new_outpass)
        await db.flush() # flush to get ID
        
        status_log = OutpassStatusLog(
            outpass_id=new_outpass.id,
            status=OutpassStatus.pending,
            changed_by=current_user.id,
            note="Outpass requested"
        )
        db.add(status_log)
        
    # Refresh to return
    await db.refresh(new_outpass)
    return APIResponse(success=True, data=OutpassResponse.model_validate(new_outpass))

@router.get(
    "/mine", 
    summary="List My Outpasses", 
    description="Fetches all outpasses requested by the current student user. **Requires:** `outpass:view`",
    response_model=APIResponse[OutpassListResponse]
)
async def list_my_outpasses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_VIEW))
):
    # Count total
    count_stmt = select(func.count()).where(Outpass.student_id == current_user.id)
    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()

    # Get items
    stmt = select(Outpass).where(Outpass.student_id == current_user.id).order_by(desc(Outpass.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    response_data = OutpassListResponse(
        total=total,
        items=[OutpassResponse.model_validate(i) for i in items]
    )
    return APIResponse(success=True, data=response_data)


@router.get(
    "", 
    summary="List All Outpasses (Admin)", 
    description="Fetches outpasses across the system. Supports filtering by status and dynamic overdue status. **Requires:** `outpass:list`",
    response_model=APIResponse[OutpassListResponse]
)
async def list_outpasses(
    status: Optional[OutpassStatus] = None,
    is_overdue: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_LIST))
):
    stmt = select(Outpass)
    count_stmt = select(func.count(Outpass.id))
    
    if status:
        stmt = stmt.where(Outpass.status == status)
        count_stmt = count_stmt.where(Outpass.status == status)
        
    if is_overdue is not None:
        now = datetime.now(timezone.utc)
        if is_overdue:
            overdue_cond = or_(
                and_(Outpass.status == OutpassStatus.active, Outpass.expected_return_time < now),
                and_(Outpass.status == OutpassStatus.completed, Outpass.actual_return_time > Outpass.expected_return_time)
            )
            stmt = stmt.where(overdue_cond)
            count_stmt = count_stmt.where(overdue_cond)
        else:
            not_overdue_cond = or_(
                and_(Outpass.status == OutpassStatus.active, Outpass.expected_return_time >= now),
                and_(Outpass.status == OutpassStatus.completed, Outpass.actual_return_time <= Outpass.expected_return_time),
                Outpass.status.in_([OutpassStatus.pending, OutpassStatus.approved, OutpassStatus.rejected, OutpassStatus.cancelled])
            )
            stmt = stmt.where(not_overdue_cond)
            count_stmt = count_stmt.where(not_overdue_cond)

    count_res = await db.execute(count_stmt)
    total = count_res.scalar_one()

    stmt = stmt.order_by(desc(Outpass.created_at)).offset(skip).limit(limit)
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    response_data = OutpassListResponse(
        total=total,
        items=[OutpassResponse.model_validate(i) for i in items]
    )
    return APIResponse(success=True, data=response_data)


@router.get(
    "/{id}", 
    summary="Get Outpass Detail", 
    description="Fetches details for a specific outpass. Protected by explicit row-level IDOR checks. **Requires:** `outpass:view`",
    response_model=APIResponse[OutpassResponse]
)
async def get_outpass(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_VIEW)),
    permissions: set[str] = Depends(get_user_permissions)
):
    stmt = select(Outpass).where(Outpass.id == id)
    result = await db.execute(stmt)
    outpass = result.scalar_one_or_none()
    
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    # Explicit ownership/IDOR check, per requirements
    if not can_view_outpass(outpass, current_user, permissions):
        raise HTTPException(status_code=403, detail="Not authorized to view this outpass")
        
    return APIResponse(success=True, data=OutpassResponse.model_validate(outpass))

@router.patch(
    "/{id}/cancel", 
    summary="Cancel Outpass", 
    description="Cancels an outpass request. Protected by explicit row-level IDOR checks. **Requires:** `outpass:cancel`",
    response_model=APIResponse[OutpassResponse]
)
async def cancel_outpass(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_CANCEL))
):
    stmt = select(Outpass).where(Outpass.id == id)
    result = await db.execute(stmt)
    outpass = result.scalar_one_or_none()
    
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    # Explicit ownership check
    if outpass.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this outpass")
        
    if outpass.status not in [OutpassStatus.pending, OutpassStatus.approved]:
        raise HTTPException(status_code=422, detail=f"Cannot transition from {outpass.status} to {OutpassStatus.cancelled}")
        
    await db.commit()
    async with db.begin():
        outpass.status = OutpassStatus.cancelled
        
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.cancelled,
            changed_by=current_user.id,
            note="Cancelled by student"
        )
        db.add(status_log)
        
    await db.refresh(outpass)
    return APIResponse(success=True, data=OutpassResponse.model_validate(outpass))

@router.patch(
    "/{id}/approve", 
    summary="Approve Outpass", 
    description="Transitions a pending outpass to approved status. Logs the transition transactionally. **Requires:** `outpass:approve`",
    response_model=OutpassApprovalActionResponse
)
async def approve_outpass(
    id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    stmt = select(Outpass).options(selectinload(Outpass.student)).where(Outpass.id == id)
    result = await db.execute(stmt)
    outpass = result.scalar_one_or_none()
    
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    if outpass.status != OutpassStatus.pending:
        raise HTTPException(status_code=422, detail=f"Cannot transition from {outpass.status} to {OutpassStatus.approved}")
        
    await db.commit()
    async with db.begin():
        outpass.status = OutpassStatus.approved
        outpass.approved_by = current_user.id
        
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.approved,
            changed_by=current_user.id,
            note="Approved by faculty/admin"
        )
        db.add(status_log)
        
        notification = Notification(
            user_id=outpass.student_id,
            title="Outpass Approved",
            message=f"Your outpass to {outpass.destination} has been approved.",
            type=NotificationType.success,
            link="/dashboard/outpasses"
        )
        db.add(notification)
        
    await db.refresh(outpass)
    
    # Send Email
    if outpass.student and outpass.student.email_notifications:
        send_email_background(
            background_tasks=background_tasks,
            to_email=outpass.student.email,
            subject="Outpass Approved",
            template_name="outpass_status.html",
            context={
                "name": outpass.student.name,
                "destination": outpass.destination,
                "status": "approved",
                "departure_time": outpass.departure_time.strftime("%Y-%m-%d %H:%M"),
                "expected_return_time": outpass.expected_return_time.strftime("%Y-%m-%d %H:%M"),
                "reason": outpass.reason,
                "reviewer_notes": "Approved by faculty/admin"
            }
        )
        
    return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(outpass))

@router.patch(
    "/{id}/reject", 
    summary="Reject Outpass", 
    description="Rejects an outpass. Includes an optional rejection note. Logs the transition transactionally. **Requires:** `outpass:approve`",
    response_model=OutpassApprovalActionResponse
)
async def reject_outpass(
    id: UUID,
    request: OutpassRejectRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    stmt = select(Outpass).options(selectinload(Outpass.student)).where(Outpass.id == id)
    result = await db.execute(stmt)
    outpass = result.scalar_one_or_none()
    
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    if outpass.status != OutpassStatus.pending:
        raise HTTPException(status_code=422, detail=f"Cannot transition from {outpass.status} to {OutpassStatus.rejected}")
        
    await db.commit()
    async with db.begin():
        outpass.status = OutpassStatus.rejected
        
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.rejected,
            changed_by=current_user.id,
            note=request.note or "Rejected by faculty/admin"
        )
        db.add(status_log)
        
        notification = Notification(
            user_id=outpass.student_id,
            title="Outpass Rejected",
            message=f"Your outpass to {outpass.destination} was rejected. Note: {request.note or 'N/A'}",
            type=NotificationType.error,
            link="/dashboard/outpasses"
        )
        db.add(notification)
        
    await db.refresh(outpass)
    
    # Send Email
    if outpass.student and outpass.student.email_notifications:
        send_email_background(
            background_tasks=background_tasks,
            to_email=outpass.student.email,
            subject="Outpass Rejected",
            template_name="outpass_status.html",
            context={
                "name": outpass.student.name,
                "destination": outpass.destination,
                "status": "rejected",
                "departure_time": outpass.departure_time.strftime("%Y-%m-%d %H:%M"),
                "expected_return_time": outpass.expected_return_time.strftime("%Y-%m-%d %H:%M"),
                "reason": outpass.reason,
                "reviewer_notes": request.note or "Rejected by faculty/admin"
            }
        )
        
    return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(outpass))

@router.patch(
    "/{id}/depart", 
    summary="Mark Outpass Departed", 
    description="Transitions an approved outpass to active status when the student leaves the gate. **Requires:** `outpass:approve`",
    response_model=OutpassApprovalActionResponse
)
async def depart_outpass(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    stmt = select(Outpass).where(Outpass.id == id)
    result = await db.execute(stmt)
    outpass = result.scalar_one_or_none()
    
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    if outpass.status != OutpassStatus.approved:
        raise HTTPException(status_code=422, detail=f"Cannot transition from {outpass.status} to {OutpassStatus.active}")
        
    await db.commit()
    async with db.begin():
        outpass.status = OutpassStatus.active
        
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.active,
            changed_by=current_user.id,
            note="Departure confirmed"
        )
        db.add(status_log)
        
    await db.refresh(outpass)
    return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(outpass))

@router.patch(
    "/{id}/return", 
    summary="Mark Outpass Returned", 
    description="Transitions an active outpass to completed status when the student returns. Updates actual_return_time. **Requires:** `outpass:approve`",
    response_model=OutpassApprovalActionResponse
)
async def return_outpass(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    stmt = select(Outpass).where(Outpass.id == id)
    result = await db.execute(stmt)
    outpass = result.scalar_one_or_none()
    
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    if outpass.status != OutpassStatus.active:
        raise HTTPException(status_code=422, detail=f"Cannot transition from {outpass.status} to {OutpassStatus.completed}")
        
    await db.commit()
    async with db.begin():
        outpass.status = OutpassStatus.completed
        outpass.actual_return_time = datetime.now(timezone.utc)
        
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.completed,
            changed_by=current_user.id,
            note="Return confirmed"
        )
        db.add(status_log)
        
    await db.refresh(outpass)
    return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(outpass))
