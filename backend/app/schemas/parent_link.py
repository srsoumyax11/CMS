from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.parent_link import ParentLinkStatus

class ParentLinkResponse(BaseModel):
    id: UUID
    parent_user_id: UUID
    parent_name: Optional[str] = None
    parent_email: Optional[str] = None
    student_id: UUID
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    status: ParentLinkStatus
    relationship_type: str
    share_gate_pass: bool
    share_attendance: bool
    share_marksheet: bool
    share_outpass: bool
    created_at: datetime
    responded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ParentLinkRespondRequest(BaseModel):
    action: str  # "approve" | "reject"
    share_gate_pass: bool = True
    share_attendance: bool = True
    share_marksheet: bool = True
    share_outpass: bool = True

class ParentLinkPrivacyUpdateRequest(BaseModel):
    share_gate_pass: bool
    share_attendance: bool
    share_marksheet: bool
    share_outpass: bool

class ParentLinkCreateRequest(BaseModel):
    student_identifier: str
    relationship_type: str = "PARENT"

