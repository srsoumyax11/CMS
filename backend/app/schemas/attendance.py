from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from app.models.timetable import AttendanceStatus

class AttendanceSessionCreate(BaseModel):
    slot_id: UUID
    date: date

class AttendanceRecordSubmit(BaseModel):
    student_user_id: UUID
    status: AttendanceStatus

class AttendanceSubmitRequest(BaseModel):
    records: List[AttendanceRecordSubmit]

class AttendanceSessionResponse(BaseModel):
    id: UUID
    slot_id: UUID
    date: date
    taken_by: UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AttendanceRecordResponse(BaseModel):
    id: UUID
    session_id: UUID
    student_user_id: UUID
    status: AttendanceStatus
    marked_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AttendanceRecordListResponse(BaseModel):
    total: int
    items: List[AttendanceRecordResponse]
