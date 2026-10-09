from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.gate_pass import GatePassType, GatePassReason, GatePassStatus

class GatePassCreateRequest(BaseModel):
    type: GatePassType
    reason_category: GatePassReason
    reason: Optional[str] = None
    destination: str
    expected_return_at: Optional[datetime] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None

class GatePassReviewRequest(BaseModel):
    status: GatePassStatus
    note: Optional[str] = None

class GatePassCodeRequest(BaseModel):
    pass_code: str

class GatePassResponse(BaseModel):
    id: UUID
    student_user_id: UUID
    type: GatePassType
    reason_category: GatePassReason
    reason: Optional[str]
    destination: str
    out_at: Optional[datetime]
    expected_return_at: Optional[datetime]
    from_date: Optional[datetime]
    to_date: Optional[datetime]
    status: GatePassStatus
    approved_by: Optional[UUID]
    review_note: Optional[str]
    reviewed_at: Optional[datetime]
    pass_code: Optional[str]
    actual_out_at: Optional[datetime]
    actual_return_at: Optional[datetime]
    marked_out_by: Optional[UUID]
    marked_in_by: Optional[UUID]
    parent_notified: bool
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    roll_number: Optional[str] = None
    hostel_name: Optional[str] = None
    room_number: Optional[str] = None
    approver_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class GatePassListResponse(BaseModel):
    total: int
    items: List[GatePassResponse]
