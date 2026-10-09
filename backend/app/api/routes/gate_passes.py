from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.gate_pass import GatePassCreateRequest, GatePassReviewRequest, GatePassCodeRequest, GatePassResponse, GatePassListResponse
from app.services.gate_pass_service import GatePassService

router = APIRouter(tags=["Gate Passes"])

@router.post(
    "",
    summary="Request Gate Pass",
    description="Creates a new gate pass request for a student. **Requires:** `gatepass:create`",
    response_model=APIResponse[GatePassResponse]
)
async def request_gate_pass(
    req: GatePassCreateRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.GATEPASS_CREATE))
):
    service = GatePassService(uow)
    try:
        gate_pass = await service.request_gate_pass(current_user.id, req.model_dump())
        return APIResponse(success=True, data=gate_pass)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/mine",
    summary="Get My Gate Passes",
    description="Fetches all gate passes belonging to the authenticated student.",
    response_model=APIResponse[GatePassListResponse]
)
async def get_my_gate_passes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = GatePassService(uow)
    passes, total = await service.get_student_passes(current_user.id, skip, limit)
    return APIResponse(success=True, data=GatePassListResponse(total=total, items=passes))

@router.get(
    "",
    summary="List All Gate Passes",
    description="Fetches all gate passes for review. **Requires:** `gatepass:review`",
    response_model=APIResponse[GatePassListResponse]
)
async def list_gate_passes(
    status_filter: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    uow: UnitOfWork = Depends(get_uow),
    _: User = Depends(require_permission(Perms.GATEPASS_REVIEW))
):
    service = GatePassService(uow)
    passes, total = await service.list_all_passes(status_filter, skip, limit)
    return APIResponse(success=True, data=GatePassListResponse(total=total, items=passes))

@router.patch(
    "/{pass_id}/review",
    summary="Review Gate Pass",
    description="Approves or rejects a gate pass. **Requires:** `gatepass:review`",
    response_model=APIResponse[GatePassResponse]
)
async def review_gate_pass(
    pass_id: UUID,
    req: GatePassReviewRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.GATEPASS_REVIEW))
):
    service = GatePassService(uow)
    try:
        gate_pass = await service.review_gate_pass(current_user.id, pass_id, req.status, req.note)
        return APIResponse(success=True, data=gate_pass)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/mark-out",
    summary="Mark Exit",
    description="Security guard scans the pass code to mark the student as exiting. **Requires:** `gatepass:scan`",
    response_model=APIResponse[GatePassResponse]
)
async def mark_exit(
    req: GatePassCodeRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.GATEPASS_SCAN))
):
    service = GatePassService(uow)
    try:
        gate_pass = await service.mark_exit(current_user.id, req.pass_code)
        return APIResponse(success=True, data=gate_pass)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/mark-return",
    summary="Mark Return",
    description="Security guard scans the pass code to mark the student as returning. **Requires:** `gatepass:scan`",
    response_model=APIResponse[GatePassResponse]
)
async def mark_return(
    req: GatePassCodeRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.GATEPASS_SCAN))
):
    service = GatePassService(uow)
    try:
        gate_pass = await service.mark_return(current_user.id, req.pass_code)
        return APIResponse(success=True, data=gate_pass)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
