from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.complaint import ComplaintCategory, ComplaintVisibility, ComplaintStatus

class ComplaintCreateRequest(BaseModel):
    category: ComplaintCategory
    location_hostel: str
    location_room: Optional[str] = None
    description: str
    visibility: ComplaintVisibility = ComplaintVisibility.public
    
    model_config = ConfigDict(from_attributes=True)

class ComplaintStatusUpdateRequest(BaseModel):
    status: ComplaintStatus
    note: Optional[str] = None

class ComplaintAssignRequest(BaseModel):
    assigned_to: UUID

class ComplaintResponse(BaseModel):
    id: UUID
    raised_by: UUID
    category: ComplaintCategory
    location_hostel: str
    location_room: Optional[str]
    description: str
    photo_url: Optional[str] # Will be a signed URL
    visibility: ComplaintVisibility
    status: ComplaintStatus
    assigned_to: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

class ComplaintListResponse(BaseModel):
    total: int
    items: List[ComplaintResponse]

class RecurringIssueResponse(BaseModel):
    category: ComplaintCategory
    location_hostel: str
    count: int
    window_days: int

class AgeingComplaintResponse(BaseModel):
    id: UUID
    category: ComplaintCategory
    location_hostel: str
    location_room: Optional[str]
    status: ComplaintStatus
    created_at: datetime
    age_days: int
    
    model_config = ConfigDict(from_attributes=True)
