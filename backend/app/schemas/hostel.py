from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class HostelCreate(BaseModel):
    name: str = Field(..., max_length=255)
    warden_user_id: Optional[UUID] = None
    capacity: Optional[int] = Field(None, ge=1)
    status: bool = True

class HostelUpdate(BaseModel):
    name: Optional[str] = None
    warden_user_id: Optional[UUID] = None
    capacity: Optional[int] = None
    status: Optional[bool] = None

class HostelResponse(BaseModel):
    id: UUID
    name: str
    warden_user_id: Optional[UUID] = None
    capacity: Optional[int] = None
    status: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HostelListResponse(BaseModel):
    total: int
    items: List[HostelResponse]

class HostelRoomCreate(BaseModel):
    room_number: str = Field(..., max_length=50)
    capacity: int = Field(2, ge=1, le=10)
    status: bool = True

class HostelRoomUpdate(BaseModel):
    room_number: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[bool] = None

class HostelRoomResponse(BaseModel):
    id: UUID
    hostel_id: UUID
    room_number: str
    capacity: int
    current_occupancy: int
    status: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HostelRoomListResponse(BaseModel):
    total: int
    items: List[HostelRoomResponse]

class RoomAllocationRequest(BaseModel):
    student_user_id: UUID
    hostel_id: UUID
    room_number: str

class RoomAllocationResponse(BaseModel):
    success: bool
    message: str
    student_user_id: UUID
    hostel_id: UUID
    room_number: str

class StudentHostelAllocationResponse(BaseModel):
    hostel_id: Optional[UUID] = None
    building_name: Optional[str] = None
    room_number: Optional[str] = None
    room_capacity: int = 2
    occupied_count: int = 0
    status: str = "allocated"
    allocated_at: Optional[datetime] = None
    warden_name: Optional[str] = None
    warden_email: Optional[str] = None

