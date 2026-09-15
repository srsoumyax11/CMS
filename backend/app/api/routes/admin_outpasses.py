from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, func
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.models.outpass import Outpass, OutpassStatus, OutpassStatusLog
from app.schemas.outpass import OutpassResponse, OutpassListResponse, OutpassRejectRequest, OutpassApprovalActionResponse
from app.schemas.common import APIResponse
from app.api.deps import require_permission, get_current_user, get_user_permissions, can_view_outpass
from app.core.permissions import Perms

router = APIRouter(tags=["Admin Outpasses"])

@router.get("", response_model=APIResponse[OutpassListResponse])
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

@router.get("/{id}", response_model=APIResponse[OutpassResponse])
async def get_outpass(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_LIST)),
    permissions: set[str] = Depends(get_user_permissions)
):
    stmt = select(Outpass).where(Outpass.id == id)
    result = await db.execute(stmt)
    outpass = result.scalar_one_or_none()
    
    if not outpass:
        raise HTTPException(status_code=404, detail="Outpass not found")
        
    # Explicit ownership/IDOR check
    if not can_view_outpass(outpass, current_user, permissions):
        raise HTTPException(status_code=403, detail="Not authorized to view this outpass")
        
    return APIResponse(success=True, data=OutpassResponse.model_validate(outpass))

@router.patch("/{id}/approve", response_model=OutpassApprovalActionResponse)
async def approve_outpass(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    stmt = select(Outpass).where(Outpass.id == id)
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
        
    await db.refresh(outpass)
    return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(outpass))

@router.patch("/{id}/reject", response_model=OutpassApprovalActionResponse)
async def reject_outpass(
    id: UUID,
    request: OutpassRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.OUTPASS_APPROVE))
):
    stmt = select(Outpass).where(Outpass.id == id)
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
        
    await db.refresh(outpass)
    return OutpassApprovalActionResponse(success=True, data=OutpassResponse.model_validate(outpass))

@router.patch("/{id}/depart", response_model=OutpassApprovalActionResponse)
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

@router.patch("/{id}/return", response_model=OutpassApprovalActionResponse)
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
