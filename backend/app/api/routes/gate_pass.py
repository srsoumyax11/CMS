from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional
from uuid import UUID

from app.models.user import User
from app.schemas.gate_pass import (
    QuickGatePassCreateRequest,
    QuickGatePassResponse,
    GateScanRequest,
    GateScanResponse,
    ParentSafetyDashboardResponse,
    QuickGatePassListResponse
)
from app.schemas.common import APIResponse
from app.api.deps import get_current_user, get_gate_pass_service
from app.services.gate_pass_service import GatePassService

router = APIRouter(prefix="/gate-pass", tags=["Quick Gate Pass & Safety Matrix"])

@router.post(
    "/quick-exit",
    summary="1-Tap Quick Gate Pass Exit",
    description="Generates instant 1-tap tea/casual exit pass with dynamic QR payload and notifies parent in real-time.",
    response_model=APIResponse[QuickGatePassResponse]
)
async def create_quick_exit_pass(
    request: QuickGatePassCreateRequest,
    background_tasks: BackgroundTasks,
    service: GatePassService = Depends(get_gate_pass_service),
    current_user: User = Depends(get_current_user)
):
    try:
        async with service.uow.transaction():
            pass_obj = await service.create_quick_pass(current_user, request, background_tasks)
            resp_data = service._to_response(pass_obj)
            return APIResponse(success=True, data=resp_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/my-active",
    summary="Get Active Student Gate Pass",
    description="Fetches current student's active gate pass (if checked out or overdue).",
    response_model=APIResponse[Optional[QuickGatePassResponse]]
)
async def get_my_active_pass(
    service: GatePassService = Depends(get_gate_pass_service),
    current_user: User = Depends(get_current_user)
):
    pass_obj = await service.get_my_active_pass(current_user)
    resp_data = service._to_response(pass_obj) if pass_obj else None
    return APIResponse(success=True, data=resp_data)


@router.post(
    "/scan",
    summary="Gate Guard QR & Roll Number Scanner",
    description="Main Gate Security scans student dynamic QR code or inputs roll number to verify and check IN.",
    response_model=GateScanResponse
)
async def scan_gate_pass(
    scan_req: GateScanRequest,
    background_tasks: BackgroundTasks,
    service: GatePassService = Depends(get_gate_pass_service),
    current_user: User = Depends(get_current_user)
):
    async with service.uow.transaction():
        return await service.scan_gate_pass(scan_req, current_user, background_tasks)


@router.get(
    "/parent-safety",
    summary="Parent Guardian Safety Matrix Dashboard",
    description="Live status overview for Parents (Location status, Attendance, Recent Gate Movements, Marksheet).",
    response_model=APIResponse[ParentSafetyDashboardResponse]
)
async def get_parent_safety_dashboard(
    student_id: Optional[UUID] = Query(None, description="Target student ID for multi-student parents"),
    service: GatePassService = Depends(get_gate_pass_service),
    current_user: User = Depends(get_current_user)
):
    try:
        data = await service.get_parent_safety_dashboard(current_user, requested_student_id=student_id)
        return APIResponse(success=True, data=data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/trigger-overdue",
    summary="Trigger Overdue Emergency Alerts",
    description="System background check endpoint to send overdue SMS/Email alerts for unreturned gate passes.",
    response_model=APIResponse[dict]
)
async def trigger_overdue_alerts(
    background_tasks: BackgroundTasks,
    service: GatePassService = Depends(get_gate_pass_service),
    current_user: User = Depends(get_current_user)
):
    async with service.uow.transaction():
        count = await service.trigger_overdue_checks(background_tasks)
        return APIResponse(success=True, data={"overdue_flagged_count": count})
