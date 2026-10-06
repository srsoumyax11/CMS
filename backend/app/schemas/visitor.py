import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
from app.models.visitor import VisitorStatus

class VisitorLogResponse(BaseModel):
    id: uuid.UUID
    visitor_name: str
    purpose: str
    host_user_id: Optional[uuid.UUID]
    entry_time: datetime
    exit_time: Optional[datetime]
    status: VisitorStatus

    class Config:
        from_attributes = True

class VisitorEntryCreate(BaseModel):
    visitor_name: str = Field(..., min_length=2, max_length=255)
    purpose: str = Field(..., min_length=2, max_length=255)
    host_user_id: Optional[uuid.UUID] = None
