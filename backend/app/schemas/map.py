from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime
from app.models.map import LocationType

class MapLocationCreate(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    type: LocationType
    parent_id: Optional[UUID] = None
    floor: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geometry: Optional[Any] = None # GeoJSON object
    description: Optional[str] = Field(None, max_length=1000)
    image_url: Optional[str] = None
    is_public: bool = True
    status: bool = True

class MapLocationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[LocationType] = None
    parent_id: Optional[UUID] = None
    floor: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geometry: Optional[Any] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_public: Optional[bool] = None
    status: Optional[bool] = None

class MapLocationResponse(BaseModel):
    id: UUID
    code: str
    name: str
    type: LocationType
    parent_id: Optional[UUID] = None
    floor: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geometry: Optional[Any] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_public: bool
    status: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MapLocationListResponse(BaseModel):
    total: int
    items: List[MapLocationResponse]

class MapPathCreate(BaseModel):
    from_location_id: UUID
    to_location_id: UUID
    distance_m: Optional[float] = Field(None, ge=0.0)
    path_geojson: Optional[Any] = None
    accessible: bool = True

class MapPathResponse(BaseModel):
    id: UUID
    from_location_id: UUID
    to_location_id: UUID
    distance_m: Optional[float] = None
    path_geojson: Optional[Any] = None
    accessible: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RouteStep(BaseModel):
    location_id: UUID
    name: str
    type: LocationType
    floor: Optional[int] = None

class RouteResponse(BaseModel):
    found: bool
    total_distance_m: float
    steps: List[RouteStep]
    message: str
