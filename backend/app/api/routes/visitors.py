from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID
from sqlalchemy import select
from datetime import datetime, timezone

from app.api.deps import get_uow, require_permission
from app.core.uow import UnitOfWork
from app.models.visitor import VisitorLog, VisitorStatus
from app.schemas.common import APIResponse
from app.schemas.visitor import VisitorLogResponse, VisitorEntryCreate

router = APIRouter()

@router.get(
    "",
    summary="List Visitor Logs",
    dependencies=[Depends(require_permission("visitor:view"))],
    response_model=APIResponse[List[VisitorLogResponse]]
)
async def list_visitors(
    uow: UnitOfWork = Depends(get_uow)
):
    stmt = select(VisitorLog).order_by(VisitorLog.created_at.desc())
    result = await uow.db.execute(stmt)
    logs = result.scalars().all()
    return APIResponse(success=True, data=[VisitorLogResponse.model_validate(l) for l in logs])

@router.post(
    "/enter",
    summary="Log Visitor Entry",
    dependencies=[Depends(require_permission("visitor:manage"))],
    response_model=APIResponse[VisitorLogResponse]
)
async def visitor_enter(
    data: VisitorEntryCreate,
    uow: UnitOfWork = Depends(get_uow)
):
    async with uow.transaction():
        log = VisitorLog(**data.model_dump())
        uow.db.add(log)
        await uow.db.flush()
        return APIResponse(success=True, data=VisitorLogResponse.model_validate(log))

@router.patch(
    "/{id}/exit",
    summary="Log Visitor Exit",
    dependencies=[Depends(require_permission("visitor:manage"))],
    response_model=APIResponse[VisitorLogResponse]
)
async def visitor_exit(
    id: UUID,
    uow: UnitOfWork = Depends(get_uow)
):
    async with uow.transaction():
        log = await uow.db.get(VisitorLog, id)
        if not log:
            raise HTTPException(status_code=404, detail="Visitor log not found")
        if log.status == VisitorStatus.exited:
            raise HTTPException(status_code=400, detail="Visitor already exited")
            
        log.status = VisitorStatus.exited
        log.exit_time = datetime.now(timezone.utc)
        return APIResponse(success=True, data=VisitorLogResponse.model_validate(log))
