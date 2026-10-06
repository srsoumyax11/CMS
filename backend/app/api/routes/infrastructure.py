from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID

from app.core.database import get_db
from app.api.deps import require_permission, get_current_user
from app.core.permissions import Perms
from app.models.user import User
from app.models.infrastructure import BuildingType, RoomType
from app.services.infrastructure_service import InfrastructureService
from app.schemas.common import APIResponse
from app.schemas.infrastructure import (
    BuildingCreate,
    BuildingUpdate,
    BuildingResponse,
    BuildingDetailResponse,
    RoomCreate,
    RoomUpdate,
    RoomResponse,
)

router = APIRouter(tags=["Infrastructure"])

# ==========================================
# BUILDINGS ENDPOINTS
# ==========================================

@router.get(
    "/buildings",
    response_model=APIResponse[List[BuildingResponse]],
    summary="List Buildings",
    description="List all campus buildings. Accessible to all authenticated users."
)
async def list_buildings(
    building_type: Optional[BuildingType] = Query(None, alias="type"),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = InfrastructureService(db)
    items = await service.list_buildings(building_type, is_active)
    return APIResponse(success=True, data=items)

@router.get(
    "/buildings/{id}",
    response_model=APIResponse[BuildingDetailResponse],
    summary="Get Building Details",
    description="Fetch single building including its rooms."
)
async def get_building(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = InfrastructureService(db)
    item = await service.get_building(id)
    return APIResponse(success=True, data=item)

@router.post(
    "/buildings",
    response_model=APIResponse[BuildingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Building (Admin)",
    description="Create a new campus building. **Requires:** `building:create`"
)
async def create_building(
    data: BuildingCreate,
    current_user: User = Depends(require_permission("building:create")),
    db: AsyncSession = Depends(get_db)
):
    service = InfrastructureService(db)
    result = await service.create_building(data)
    return APIResponse(success=True, data=result)

@router.patch(
    "/buildings/{id}",
    response_model=APIResponse[BuildingResponse],
    summary="Update Building (Admin)",
    description="Update an existing campus building. **Requires:** `building:edit`"
)
async def update_building(
    id: UUID,
    data: BuildingUpdate,
    current_user: User = Depends(require_permission("building:edit")),
    db: AsyncSession = Depends(get_db)
):
    service = InfrastructureService(db)
    result = await service.update_building(id, data)
    return APIResponse(success=True, data=result)

# ==========================================
# ROOMS ENDPOINTS
# ==========================================

@router.get(
    "/rooms",
    response_model=APIResponse[List[RoomResponse]],
    summary="List Rooms",
    description="List all campus rooms with optional filters for building, department, and room type."
)
async def list_rooms(
    building_id: Optional[UUID] = Query(None),
    department_id: Optional[UUID] = Query(None),
    room_type: Optional[RoomType] = Query(None, alias="type"),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = InfrastructureService(db)
    items = await service.list_rooms(building_id, department_id, room_type, is_active)
    return APIResponse(success=True, data=items)

@router.get(
    "/rooms/{id}",
    response_model=APIResponse[RoomResponse],
    summary="Get Room Details",
    description="Fetch single room details."
)
async def get_room(
    id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = InfrastructureService(db)
    item = await service.get_room(id)
    return APIResponse(success=True, data=item)

@router.post(
    "/rooms",
    response_model=APIResponse[RoomResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create Room (Admin)",
    description="Create a new room assigned to a building and optional department. **Requires:** `room:create`"
)
async def create_room(
    data: RoomCreate,
    current_user: User = Depends(require_permission("room:create")),
    db: AsyncSession = Depends(get_db)
):
    service = InfrastructureService(db)
    result = await service.create_room(data)
    return APIResponse(success=True, data=result)

@router.patch(
    "/rooms/{id}",
    response_model=APIResponse[RoomResponse],
    summary="Update Room (Admin)",
    description="Update room attributes or department assignment. **Requires:** `room:edit`"
)
async def update_room(
    id: UUID,
    data: RoomUpdate,
    current_user: User = Depends(require_permission("room:edit")),
    db: AsyncSession = Depends(get_db)
):
    service = InfrastructureService(db)
    result = await service.update_room(id, data)
    return APIResponse(success=True, data=result)
