from typing import List
from datetime import date
from pydantic import BaseModel, ConfigDict, field_validator
from uuid import UUID

class AttendanceRosterItem(BaseModel):
    student_id: UUID
    status: str

class AttendanceBatchRequest(BaseModel):
    slot_id: UUID
    date: date
    records: List[AttendanceRosterItem]

    @field_validator("date")
    @classmethod
    def date_must_not_be_in_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("date cannot be in the future")
        return v

class AttendanceRosterStudentResponse(BaseModel):
    student_id: UUID
    name: str
    roll_number: str

class AttendanceStatsResponse(BaseModel):
    subject_name: str
    total_classes: int
    attended: int
    percentage: int
    present: int
    absent: int
    late: int
    excused: int
    total: int

