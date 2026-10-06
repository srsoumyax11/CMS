from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID
from sqlalchemy import select

from app.api.deps import get_current_user, get_uow, require_permission
from app.core.uow import UnitOfWork
from app.models.user import User, UserType
from app.models.finance import FeeDue, FeeStatus
from app.schemas.common import APIResponse
from app.schemas.finance import FeeDueResponse, FeeDueCreate, FeeDueUpdate

router = APIRouter()

@router.get(
    "/mine",
    summary="List My Fee Dues",
    response_model=APIResponse[List[FeeDueResponse]]
)
async def get_my_fees(
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    stmt = select(FeeDue).where(FeeDue.student_id == current_user.id).order_by(FeeDue.due_date.desc())
    result = await uow.db.execute(stmt)
    fees = result.scalars().all()
    return APIResponse(success=True, data=[FeeDueResponse.model_validate(f) for f in fees])

@router.get(
    "",
    summary="List All Fee Dues",
    dependencies=[Depends(require_permission("fee:view"))],
    response_model=APIResponse[List[FeeDueResponse]]
)
async def list_all_fees(
    uow: UnitOfWork = Depends(get_uow)
):
    stmt = select(FeeDue).order_by(FeeDue.created_at.desc())
    result = await uow.db.execute(stmt)
    fees = result.scalars().all()
    return APIResponse(success=True, data=[FeeDueResponse.model_validate(f) for f in fees])

@router.post(
    "",
    summary="Create Fee Due",
    dependencies=[Depends(require_permission("fee:manage"))],
    response_model=APIResponse[FeeDueResponse]
)
async def create_fee(
    data: FeeDueCreate,
    uow: UnitOfWork = Depends(get_uow)
):
    async with uow.transaction():
        student_user = await uow.db.get(User, data.student_id)
        if not student_user or student_user.user_type != UserType.student:
            raise HTTPException(status_code=400, detail="Target user not found or is not a student")

        fee = FeeDue(**data.model_dump())
        uow.db.add(fee)
        await uow.db.flush()
        return APIResponse(success=True, data=FeeDueResponse.model_validate(fee))

@router.patch(
    "/{id}",
    summary="Update Fee Due",
    dependencies=[Depends(require_permission("fee:manage"))],
    response_model=APIResponse[FeeDueResponse]
)
async def update_fee(
    id: UUID,
    data: FeeDueUpdate,
    uow: UnitOfWork = Depends(get_uow)
):
    async with uow.transaction():
        fee = await uow.db.get(FeeDue, id)
        if not fee:
            raise HTTPException(status_code=404, detail="Fee Due not found")
        
        if data.paid_amount is not None:
            if data.paid_amount < 0 or data.paid_amount > fee.total_amount:
                raise HTTPException(status_code=400, detail=f"Paid amount must be between 0 and {fee.total_amount}")
            fee.paid_amount = data.paid_amount

            # Auto-compute status if not explicitly passed
            if data.status is None:
                if fee.paid_amount >= fee.total_amount:
                    fee.status = FeeStatus.paid
                elif fee.paid_amount > 0:
                    fee.status = FeeStatus.partial
                else:
                    fee.status = FeeStatus.pending

        if data.status is not None:
            fee.status = data.status

        return APIResponse(success=True, data=FeeDueResponse.model_validate(fee))
