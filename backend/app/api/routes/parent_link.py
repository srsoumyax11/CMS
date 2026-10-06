from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from uuid import UUID

from app.models.user import User
from app.schemas.parent_link import (
    ParentLinkResponse,
    ParentLinkRespondRequest,
    ParentLinkPrivacyUpdateRequest,
    ParentLinkCreateRequest
)
from app.schemas.common import APIResponse
from app.api.deps import get_current_user, get_parent_link_service
from app.services.parent_link_service import ParentLinkService

router = APIRouter(prefix="/parent-link", tags=["Parent Guardian Consent & Privacy Matrix"])

@router.post(
    "/request",
    summary="Parent Request Link to Student",
    description="Parent submits student identifier (roll number, email, or ID) to initiate a guardian link request.",
    response_model=APIResponse[ParentLinkResponse]
)
async def create_parent_link_request(
    request: ParentLinkCreateRequest,
    service: ParentLinkService = Depends(get_parent_link_service),
    current_user: User = Depends(get_current_user)
):
    try:
        async with service.uow.transaction():
            res = await service.create_link_request(current_user, request)
            return APIResponse(success=True, data=res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/my-requests",
    summary="Get Student's Incoming Parent Link Requests",
    description="Student fetches all pending and approved guardian linking requests.",
    response_model=APIResponse[List[ParentLinkResponse]]
)
async def get_my_link_requests(
    service: ParentLinkService = Depends(get_parent_link_service),
    current_user: User = Depends(get_current_user)
):
    items = await service.get_student_link_requests(current_user)
    return APIResponse(success=True, data=items)


@router.get(
    "/active",
    summary="Get Parent's Active Student Link",
    description="Parent fetches their active linked student and privacy permissions status.",
    response_model=APIResponse[Optional[ParentLinkResponse]]
)
async def get_parent_active_link(
    service: ParentLinkService = Depends(get_parent_link_service),
    current_user: User = Depends(get_current_user)
):
    item = await service.get_parent_active_link(current_user)
    return APIResponse(success=True, data=item)


@router.post(
    "/{id}/respond",
    summary="Student Respond to Parent Link Request",
    description="Student approves or rejects parent linking request with granular consent checkboxes.",
    response_model=APIResponse[ParentLinkResponse]
)
async def respond_to_link_request(
    id: UUID,
    request: ParentLinkRespondRequest,
    service: ParentLinkService = Depends(get_parent_link_service),
    current_user: User = Depends(get_current_user)
):
    try:
        async with service.uow.transaction():
            res = await service.respond_to_request(id, current_user, request)
            return APIResponse(success=True, data=res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch(
    "/{id}/privacy",
    summary="Student Update Privacy Sharing Toggles",
    description="Student updates privacy sharing toggles for live gate pass, attendance, marksheet, and outpasses.",
    response_model=APIResponse[ParentLinkResponse]
)
async def update_privacy_consent(
    id: UUID,
    request: ParentLinkPrivacyUpdateRequest,
    service: ParentLinkService = Depends(get_parent_link_service),
    current_user: User = Depends(get_current_user)
):
    try:
        async with service.uow.transaction():
            res = await service.update_privacy_consent(id, current_user, request)
            return APIResponse(success=True, data=res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
