from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.hostel import (
    HostelCreate, HostelUpdate, HostelResponse, HostelListResponse,
    HostelRoomCreate, HostelRoomUpdate, HostelRoomResponse, HostelRoomListResponse,
    RoomAllocationRequest, RoomAllocationResponse
)
from app.services.hostel_service import HostelService

router = APIRouter(tags=["Hostels"])

@router.post(
    "/",
    summary="Create Hostel",
    description="Creates a new hostel building record. **Requires:** `hostel:manage`",
    response_model=APIResponse[HostelResponse]
)
async def create_hostel(
    req: HostelCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.HOSTEL_MANAGE))
):
    service = HostelService(uow)
    try:
        hostel = await service.create_hostel(req)
        return APIResponse(success=True, data=HostelResponse.model_validate(hostel))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/",
    summary="List Hostels",
    description="Lists all hostels. **Requires:** `hostel:view`",
    response_model=APIResponse[HostelListResponse]
)
async def list_hostels(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = HostelService(uow)
    items_raw, total = await service.list_hostels(skip=skip, limit=limit)
    items = [HostelResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=HostelListResponse(total=total, items=items))

@router.post(
    "/{hostel_id}/rooms",
    summary="Create Hostel Room",
    description="Creates a room inside a hostel building. **Requires:** `hostel:manage`",
    response_model=APIResponse[HostelRoomResponse]
)
async def create_room(
    hostel_id: UUID,
    req: HostelRoomCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.HOSTEL_MANAGE))
):
    service = HostelService(uow)
    try:
        room = await service.create_room(hostel_id, req)
        return APIResponse(success=True, data=HostelRoomResponse.model_validate(room))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/{hostel_id}/rooms",
    summary="List Rooms in Hostel",
    description="Lists rooms inside a specific hostel building.",
    response_model=APIResponse[HostelRoomListResponse]
)
async def list_rooms(
    hostel_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = HostelService(uow)
    items_raw, total = await service.list_rooms(hostel_id, skip=skip, limit=limit)
    items = [HostelRoomResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=HostelRoomListResponse(total=total, items=items))

@router.post(
    "/allocate",
    summary="Allocate Hostel Room to Student",
    description="Assigns a student to a hostel room and updates occupancy. **Requires:** `hostel:allocate`",
    response_model=APIResponse[RoomAllocationResponse]
)
async def allocate_room(
    req: RoomAllocationRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.HOSTEL_ALLOCATE))
):
    service = HostelService(uow)
    try:
        res = await service.allocate_room(req)
        return APIResponse(success=True, data=res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/deallocate/{student_user_id}",
    summary="Deallocate Student Room",
    description="Deallocates a student's hostel room assignment. **Requires:** `hostel:allocate`",
    response_model=APIResponse[dict]
)
async def deallocate_room(
    student_user_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.HOSTEL_ALLOCATE))
):
    service = HostelService(uow)
    try:
        await service.deallocate_room(student_user_id)
        return APIResponse(success=True, data={"message": "Student room deallocated successfully."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
