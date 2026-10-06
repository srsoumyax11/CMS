from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.infrastructure import BuildingType, RoomType

class BuildingCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Building name (e.g. Academic Block A)")
    code: str = Field(..., min_length=1, max_length=50, description="Unique code (e.g. AB-A)")
    building_type: BuildingType
    total_floors: int = Field(1, ge=1, le=100)
    is_active: bool = True

class BuildingUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    building_type: Optional[BuildingType] = None
    total_floors: Optional[int] = Field(None, ge=1, le=100)
    is_active: Optional[bool] = None

class RoomCreate(BaseModel):
    building_id: UUID
    room_number: str = Field(..., min_length=1, max_length=50, description="Room label or number (e.g. LH-101, Lab-2)")
    floor: int = Field(0, ge=-2, le=100)
    room_type: RoomType = RoomType.lecture_hall
    capacity: int = Field(40, ge=1, le=1000)
    department_id: Optional[UUID] = None
    is_active: bool = True

class RoomUpdate(BaseModel):
    room_number: Optional[str] = Field(None, min_length=1, max_length=50)
    floor: Optional[int] = Field(None, ge=-2, le=100)
    room_type: Optional[RoomType] = None
    capacity: Optional[int] = Field(None, ge=1, le=1000)
    department_id: Optional[UUID] = None
    is_active: Optional[bool] = None

class RoomResponse(BaseModel):
    id: UUID
    building_id: UUID
    building_name: Optional[str] = None
    building_code: Optional[str] = None
    room_number: str
    floor: int
    room_type: RoomType
    capacity: int
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BuildingResponse(BaseModel):
    id: UUID
    name: str
    code: str
    building_type: BuildingType
    total_floors: int
    is_active: bool
    rooms_count: Optional[int] = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BuildingDetailResponse(BuildingResponse):
    rooms: List[RoomResponse] = []
