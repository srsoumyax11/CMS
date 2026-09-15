from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc, func
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.models.outpass import Outpass, OutpassStatus, OutpassStatusLog
from app.schemas.outpass import OutpassCreateRequest, OutpassResponse, OutpassListResponse
from app.schemas.common import APIResponse
from app.api.deps import require_permission, get_current_user, get_user_permissions, can_view_outpass
from app.core.permissions import Perms

router = APIRouter(tags=["Outpasses"])

@router.post("", response_model=APIResponse[OutpassResponse])
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

@router.get("/mine", response_model=APIResponse[OutpassListResponse])
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

@router.get("/{id}", response_model=APIResponse[OutpassResponse])
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

@router.patch("/{id}/cancel", response_model=APIResponse[OutpassResponse])
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
