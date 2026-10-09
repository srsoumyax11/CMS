from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional
from uuid import UUID

from app.api.deps import get_current_user, get_uow, require_permission
from app.core.uow import UnitOfWork
from app.core.permissions import Perms
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.application import (
    RoleApplicationCreateRequest,
    RoleApplicationResponse,
    ApplicationActionRequest
)
from app.services.application_service import ApplicationService

router = APIRouter(prefix="/applications", tags=["Applications"])

def get_application_service(uow: UnitOfWork = Depends(get_uow)) -> ApplicationService:
    return ApplicationService(uow)

@router.post(
    "/apply",
    summary="Submit Role Application",
    description="Allows a logged-in user to submit an application for Student, Parent, Faculty, or Staff role.",
    response_model=APIResponse[RoleApplicationResponse]
)
async def apply_for_role(
    req: RoleApplicationCreateRequest,
    current_user: User = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service)
):
    try:
        res = await service.submit_application(current_user, req)
        return APIResponse(success=True, data=res, message="Application submitted successfully!")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/my-status",
    summary="Get My Application Status",
    description="Returns the latest role application submitted by the current user.",
    response_model=APIResponse[Optional[RoleApplicationResponse]]
)
async def get_my_status(
    current_user: User = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service)
):
    status_res = await service.get_my_status(current_user)
    return APIResponse(success=True, data=status_res)

@router.get(
    "/",
    summary="List Pending Role Applications (Admin)",
    description="Returns all role applications for admin review.",
    response_model=APIResponse[List[RoleApplicationResponse]]
)
async def list_applications(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    service: ApplicationService = Depends(get_application_service),
    _ = Depends(require_permission(Perms.ROLE_APPROVE))
):
    apps = await service.list_applications(status=status_filter, skip=skip, limit=limit)
    return APIResponse(success=True, data=apps)

@router.get(
    "/check-identifier",
    summary="Check Identifier Uniqueness",
    description="Check if a given registration number or employee ID is already assigned to a profile.",
    response_model=APIResponse[dict]
)
async def check_identifier(
    role: str,
    value: str,
    service: ApplicationService = Depends(get_application_service)
):
    available = await service.check_identifier(role, value)
    if available:
        return APIResponse(success=True, data={"available": True}, message="Identifier is available.")
    else:
        return APIResponse(success=True, data={"available": False}, message="This identifier is already in use.")

@router.post(
    "/{id}/approve",
    summary="Approve Role Application (Admin)",
    description="Approves a role application, creates the corresponding profile, elevates user role, and notifies the applicant via email & in-app notification.",
    response_model=APIResponse[RoleApplicationResponse]
)
async def approve_application(
    id: UUID,
    background_tasks: BackgroundTasks,
    req: Optional[ApplicationActionRequest] = None,
    current_user: User = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service),
    _ = Depends(require_permission(Perms.ROLE_APPROVE))
):
    try:
        notes = req.admin_notes if req else None
        res = await service.approve_application(id, reviewer=current_user, admin_notes=notes, background_tasks=background_tasks)
        return APIResponse(success=True, data=res, message="Application approved successfully!")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/{id}/reject",
    summary="Reject Role Application (Admin)",
    description="Rejects a role application and notifies the applicant with optional notes via email & in-app notification.",
    response_model=APIResponse[RoleApplicationResponse]
)
async def reject_application(
    id: UUID,
    background_tasks: BackgroundTasks,
    req: Optional[ApplicationActionRequest] = None,
    current_user: User = Depends(get_current_user),
    service: ApplicationService = Depends(get_application_service),
    _ = Depends(require_permission(Perms.ROLE_APPROVE))
):
    try:
        notes = req.admin_notes if req else None
        res = await service.reject_application(id, reviewer=current_user, admin_notes=notes, background_tasks=background_tasks)
        return APIResponse(success=True, data=res, message="Application rejected.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
