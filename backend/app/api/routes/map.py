from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from uuid import UUID

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.models.map import LocationType
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.map import (
    MapLocationCreate, MapLocationUpdate, MapLocationResponse, MapLocationListResponse,
    MapPathCreate, MapPathResponse, RouteResponse
)
from app.services.map_service import MapService

router = APIRouter(tags=["Campus Map & Navigation"])

@router.get(
    "/locations",
    summary="List Campus Map Locations",
    description="Retrieve campus locations, buildings, floors, and rooms. Supports filtering by type, floor, or parent ID.",
    response_model=APIResponse[MapLocationListResponse]
)
async def list_locations(
    location_type: Optional[LocationType] = Query(None),
    floor: Optional[int] = Query(None),
    parent_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow)
):
    service = MapService(uow)
    items, total = await service.list_locations(
        location_type=location_type,
        floor=floor,
        parent_id=parent_id,
        skip=skip,
        limit=limit
    )
    res_items = [MapLocationResponse.model_validate(item) for item in items]
    return APIResponse(success=True, data=MapLocationListResponse(total=total, items=res_items))

@router.get(
    "/locations/{loc_id}",
    summary="Get Map Location Details",
    description="Fetch single location metadata, coordinates, and GeoJSON boundaries.",
    response_model=APIResponse[MapLocationResponse]
)
async def get_location(
    loc_id: UUID,
    uow: UnitOfWork = Depends(get_uow)
):
    async with uow.transaction() as u:
        loc = await u.map_locations.get_by_id(loc_id)
        if not loc:
            raise HTTPException(status_code=404, detail="Map location not found")
        return APIResponse(success=True, data=MapLocationResponse.model_validate(loc))

@router.post(
    "/locations",
    summary="Create Campus Location",
    description="Add a new building, floor, room, POI, or navigation node. **Requires:** `map:edit`",
    response_model=APIResponse[MapLocationResponse]
)
async def create_location(
    req: MapLocationCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.MAP_EDIT))
):
    service = MapService(uow)
    try:
        loc = await service.create_location(req)
        return APIResponse(success=True, data=MapLocationResponse.model_validate(loc))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put(
    "/locations/{loc_id}",
    summary="Update Campus Location",
    description="Update coordinates, name, or metadata of a map node. **Requires:** `map:edit`",
    response_model=APIResponse[MapLocationResponse]
)
async def update_location(
    loc_id: UUID,
    req: MapLocationUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.MAP_EDIT))
):
    service = MapService(uow)
    try:
        loc = await service.update_location(loc_id, req)
        return APIResponse(success=True, data=MapLocationResponse.model_validate(loc))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/paths",
    summary="Create Navigation Path Edge",
    description="Connect two location nodes with a walking distance path edge for routing. **Requires:** `map:manage`",
    response_model=APIResponse[MapPathResponse]
)
async def create_path(
    req: MapPathCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.MAP_MANAGE))
):
    service = MapService(uow)
    try:
        path = await service.create_path(req)
        return APIResponse(success=True, data=MapPathResponse.model_validate(path))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/route",
    summary="Calculate Walking Route (Dijkstra Shortest Path)",
    description="Computes step-by-step navigation path between source and destination nodes across multi-floor buildings.",
    response_model=APIResponse[RouteResponse]
)
async def calculate_route(
    from_location_id: UUID = Query(...),
    to_location_id: UUID = Query(...),
    uow: UnitOfWork = Depends(get_uow)
):
    service = MapService(uow)
    try:
        route = await service.calculate_shortest_path(from_location_id, to_location_id)
        return APIResponse(success=True, data=route)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
