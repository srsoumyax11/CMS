import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from app.models.hostel import AllocationStatus

class HostelAllocationResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    room_id: uuid.UUID
    allocated_at: datetime
    vacated_at: Optional[datetime] = None
    status: AllocationStatus

    # Enriched details
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    room_number: Optional[str] = None
    building_name: Optional[str] = None
    building_id: Optional[uuid.UUID] = None
    room_capacity: Optional[int] = None
    occupied_count: Optional[int] = None

    class Config:
        from_attributes = True


class HostelAllocationCreate(BaseModel):
    student_id: uuid.UUID
    room_id: uuid.UUID
