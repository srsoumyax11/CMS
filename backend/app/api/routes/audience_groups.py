from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from uuid import UUID

from app.core.uow import UnitOfWork, get_uow
from app.api.deps import get_current_user, require_permission
from app.core.permissions import Perms
from app.models.user import User
from app.schemas.common import APIResponse
from app.services.audience_group_service import AudienceGroupService
from app.schemas.audience_group import (
    AudienceGroupCreateRequest,
    AudienceGroupUpdateRequest,
    AudienceGroupMemberAddRequest,
    AudienceGroupReapplyFilterRequest,
    AudienceGroupDetailResponse,
    AudienceGroupMemberItemResponse,
    AudienceGroupReapplyResponse
)

router = APIRouter(prefix="/audience-groups", tags=["Audience Groups"])

def get_audience_group_service(uow: UnitOfWork = Depends(get_uow)) -> AudienceGroupService:
    return AudienceGroupService(uow)

@router.post(
    "",
    response_model=APIResponse[AudienceGroupDetailResponse],
    status_code=status.HTTP_201_CREATED
)
async def create_audience_group(
    request: AudienceGroupCreateRequest,
    service: AudienceGroupService = Depends(get_audience_group_service),
    current_user: User = Depends(require_permission(Perms.AUDIENCE_GROUP_CREATE))
):
    try:
        group = await service.create_group(request, current_user)
        return APIResponse(success=True, message="Audience group created successfully", data=group)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get(
    "",
    response_model=APIResponse[List[AudienceGroupDetailResponse]]
)
async def list_audience_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: AudienceGroupService = Depends(get_audience_group_service),
    _ = Depends(require_permission(Perms.AUDIENCE_GROUP_LIST))
):
    groups = await service.list_groups(skip=skip, limit=limit)
    return APIResponse(success=True, data=groups)

@router.get(
    "/{id}",
    response_model=APIResponse[AudienceGroupDetailResponse]
)
async def get_audience_group(
    id: UUID,
    service: AudienceGroupService = Depends(get_audience_group_service),
    _ = Depends(require_permission(Perms.AUDIENCE_GROUP_VIEW))
):
    try:
        group = await service.get_group(id)
        return APIResponse(success=True, data=group)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.patch(
    "/{id}",
    response_model=APIResponse[AudienceGroupDetailResponse]
)
async def update_audience_group(
    id: UUID,
    request: AudienceGroupUpdateRequest,
    service: AudienceGroupService = Depends(get_audience_group_service),
    current_user: User = Depends(require_permission(Perms.AUDIENCE_GROUP_EDIT))
):
    try:
        group = await service.update_group(id, request, current_user)
        return APIResponse(success=True, message="Audience group updated successfully", data=group)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete(
    "/{id}",
    response_model=APIResponse[bool]
)
async def delete_audience_group(
    id: UUID,
    service: AudienceGroupService = Depends(get_audience_group_service),
    current_user: User = Depends(require_permission(Perms.AUDIENCE_GROUP_DELETE))
):
    try:
        deleted = await service.delete_group(id, current_user)
        return APIResponse(success=True, message="Audience group deleted successfully", data=deleted)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get(
    "/{id}/members",
    response_model=APIResponse[List[AudienceGroupMemberItemResponse]]
)
async def list_audience_group_members(
    id: UUID,
    service: AudienceGroupService = Depends(get_audience_group_service),
    _ = Depends(require_permission(Perms.AUDIENCE_GROUP_VIEW))
):
    try:
        members = await service.list_members(id)
        return APIResponse(success=True, data=members)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post(
    "/{id}/members",
    response_model=APIResponse[dict]
)
async def add_audience_group_members(
    id: UUID,
    request: AudienceGroupMemberAddRequest,
    service: AudienceGroupService = Depends(get_audience_group_service),
    current_user: User = Depends(require_permission(Perms.AUDIENCE_GROUP_EDIT))
):
    try:
        added_count = await service.add_members(id, request, current_user)
        return APIResponse(success=True, message=f"Added {added_count} members to group", data={"added_count": added_count})
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete(
    "/{id}/members/{user_id}",
    response_model=APIResponse[bool]
)
async def remove_audience_group_member(
    id: UUID,
    user_id: UUID,
    service: AudienceGroupService = Depends(get_audience_group_service),
    current_user: User = Depends(require_permission(Perms.AUDIENCE_GROUP_EDIT))
):
    try:
        removed = await service.remove_member(id, user_id, current_user)
        return APIResponse(success=True, message="Member removed from audience group", data=removed)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post(
    "/{id}/reapply-filter",
    response_model=APIResponse[AudienceGroupReapplyResponse]
)
async def reapply_audience_group_filter(
    id: UUID,
    request: AudienceGroupReapplyFilterRequest = AudienceGroupReapplyFilterRequest(),
    service: AudienceGroupService = Depends(get_audience_group_service),
    current_user: User = Depends(require_permission(Perms.AUDIENCE_GROUP_EDIT))
):
    try:
        res = await service.reapply_filter(id, request.keep_manual, current_user)
        return APIResponse(success=True, message="Group filter re-applied successfully", data=res)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
