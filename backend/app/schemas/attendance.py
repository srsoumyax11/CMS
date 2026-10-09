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
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AttendanceRecordListResponse(BaseModel):
    total: int
    items: List[AttendanceRecordResponse]

class AttendanceRosterStudentResponse(BaseModel):
    student_user_id: UUID
    student_name: str
    roll_number: Optional[str] = None
    status: AttendanceStatus = AttendanceStatus.present

class AttendanceRosterResponse(BaseModel):
    session_id: Optional[UUID] = None
    slot_id: UUID
    subject_name: str
    subject_code: Optional[str] = None
    class_group_name: str
    date: date
    session_status: str = "OPEN"
    students: List[AttendanceRosterStudentResponse]

class SubjectAttendanceStatResponse(BaseModel):
    subject_id: UUID
    subject_name: str
    subject_code: Optional[str] = None
    total_conducted: int
    total_attended: int
    percentage: float
    is_shortage: bool = False

class StudentAttendanceStatsResponse(BaseModel):
    overall_percentage: float
    overall_shortage: bool = False
    total_conducted: int
    total_attended: int
    subject_stats: List[SubjectAttendanceStatResponse]

