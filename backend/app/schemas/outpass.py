from pydantic import BaseModel, ConfigDict, computed_field, model_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from app.models.outpass import OutpassStatus

class OutpassCreateRequest(BaseModel):
    destination: str
    reason: str
    departure_time: datetime
    expected_return_time: datetime

    @model_validator(mode='after')
    def check_dates(self) -> 'OutpassCreateRequest':
        if self.departure_time >= self.expected_return_time:
            raise ValueError('departure_time must be before expected_return_time')
        return self

class OutpassResponse(BaseModel):
    id: UUID
    student_id: UUID
    destination: str
    reason: str
    departure_time: datetime
    expected_return_time: datetime
    actual_return_time: Optional[datetime]
    status: OutpassStatus
    approved_by: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]
    student_name: Optional[str] = None
    student_course: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    def is_overdue(self) -> bool:
        now = datetime.now(timezone.utc)
        if self.status == OutpassStatus.active:
            return now > self.expected_return_time
        if self.status == OutpassStatus.completed and self.actual_return_time:
            return self.actual_return_time > self.expected_return_time
        return False

    @computed_field
    def overdue_hours(self) -> int:
        if not self.is_overdue:
            return 0
        end_time = self.actual_return_time if self.status == OutpassStatus.completed else datetime.now(timezone.utc)
        delta = end_time - self.expected_return_time
        return max(0, int(delta.total_seconds() // 3600))

class OutpassListResponse(BaseModel):
    total: int
    items: List[OutpassResponse]

class OutpassRejectRequest(BaseModel):
    note: Optional[str] = None

class OutpassApprovalActionResponse(BaseModel):
    success: bool
    data: Optional[OutpassResponse]
    error: Optional[str] = None
