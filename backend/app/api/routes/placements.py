from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.placement import (
    PlacementNoticeCreate,
    PlacementNoticeUpdate,
    PlacementNoticeResponse,
    PlacementNoticeListResponse,
    PlacementApplicationCreate,
    PlacementApplicationStatusUpdate,
    PlacementApplicationResponse,
    PlacementApplicationListResponse
)
from app.services.placement_service import PlacementService

router = APIRouter(tags=["Placement"])

@router.post(
    "/notices",
    summary="Create Placement Drive Notice",
    description="Creates a placement drive notice. **Requires:** `placement:manage`",
    response_model=APIResponse[PlacementNoticeResponse]
)
async def create_notice(
    req: PlacementNoticeCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.PLACEMENT_MANAGE))
):
    service = PlacementService(uow)
    try:
        notice = await service.create_notice(current_user.id, req)
        return APIResponse(success=True, data=PlacementNoticeResponse.model_validate(notice))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put(
    "/notices/{notice_id}",
    summary="Update Placement Notice",
    description="Updates a placement notice. **Requires:** `placement:manage`",
    response_model=APIResponse[PlacementNoticeResponse]
)
async def update_notice(
    notice_id: UUID,
    req: PlacementNoticeUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.PLACEMENT_MANAGE))
):
    service = PlacementService(uow)
    try:
        notice = await service.update_notice(notice_id, req)
        return APIResponse(success=True, data=PlacementNoticeResponse.model_validate(notice))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/notices",
    summary="List Placement Notices",
    description="Lists placement drives. **Requires:** `placement:view`",
    response_model=APIResponse[PlacementNoticeListResponse]
)
async def list_notices(
    published_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = PlacementService(uow)
    items_raw, total = await service.list_notices(published_only=published_only, skip=skip, limit=limit)
    items = [PlacementNoticeResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=PlacementNoticeListResponse(total=total, items=items))

@router.get(
    "/notices/{notice_id}",
    summary="Get Placement Notice Details",
    description="Fetches details of a specific placement drive.",
    response_model=APIResponse[PlacementNoticeResponse]
)
async def get_notice(
    notice_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = PlacementService(uow)
    try:
        notice = await service.get_notice(notice_id)
        return APIResponse(success=True, data=PlacementNoticeResponse.model_validate(notice))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post(
    "/notices/{notice_id}/apply",
    summary="Apply for Placement Drive",
    description="Submits an application for a placement drive after checking eligibility criteria. **Requires:** `placement:apply`",
    response_model=APIResponse[PlacementApplicationResponse]
)
async def apply_for_drive(
    notice_id: UUID,
    req: PlacementApplicationCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.PLACEMENT_APPLY))
):
    service = PlacementService(uow)
    try:
        application = await service.apply_for_drive(current_user.id, notice_id, req)
        return APIResponse(success=True, data=PlacementApplicationResponse.model_validate(application))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/notices/{notice_id}/applications",
    summary="View Applications for Notice",
    description="Lists all student applications for a specific drive. **Requires:** `placement:view_applicants`",
    response_model=APIResponse[PlacementApplicationListResponse]
)
async def list_notice_applications(
    notice_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.PLACEMENT_VIEW_APPLICANTS))
):
    service = PlacementService(uow)
    items_raw, total = await service.list_notice_applications(notice_id, skip=skip, limit=limit)
    items = [PlacementApplicationResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=PlacementApplicationListResponse(total=total, items=items))

@router.get(
    "/applications/mine",
    summary="Get My Placement Applications",
    description="Lists placement applications submitted by the authenticated student.",
    response_model=APIResponse[PlacementApplicationListResponse]
)
async def get_my_applications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = PlacementService(uow)
    items_raw, total = await service.get_student_applications(current_user.id, skip=skip, limit=limit)
    items = [PlacementApplicationResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=PlacementApplicationListResponse(total=total, items=items))

@router.put(
    "/applications/{application_id}/status",
    summary="Update Application Status",
    description="Shortlists, selects, or rejects a student's placement application. **Requires:** `placement:manage`",
    response_model=APIResponse[PlacementApplicationResponse]
)
async def update_application_status(
    application_id: UUID,
    req: PlacementApplicationStatusUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.PLACEMENT_MANAGE))
):
    service = PlacementService(uow)
    try:
        application = await service.update_application_status(current_user.id, application_id, req)
        return APIResponse(success=True, data=PlacementApplicationResponse.model_validate(application))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
