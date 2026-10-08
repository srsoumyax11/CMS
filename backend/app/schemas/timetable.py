from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from uuid import UUID
from datetime import date, time, datetime
from app.models.timetable import DayOfWeek, ExceptionType

class TimetableSlotCreate(BaseModel):
    term_id: UUID
    class_group_id: UUID
    subject_id: UUID
    faculty_user_id: UUID
    room_location_id: Optional[UUID] = None
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    status: bool = True

class TimetableSlotUpdate(BaseModel):
    term_id: Optional[UUID] = None
    class_group_id: Optional[UUID] = None
    subject_id: Optional[UUID] = None
    faculty_user_id: Optional[UUID] = None
    room_location_id: Optional[UUID] = None
    day_of_week: Optional[DayOfWeek] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[bool] = None

class TimetableSlotResponse(BaseModel):
    id: UUID
    term_id: UUID
    class_group_id: UUID
    subject_id: UUID
    faculty_user_id: UUID
    room_location_id: Optional[UUID] = None
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    status: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TimetableSlotListResponse(BaseModel):
    total: int
    items: List[TimetableSlotResponse]

class TimetableExceptionCreate(BaseModel):
    slot_id: UUID
    date: date
    type: ExceptionType
    substitute_faculty_id: Optional[UUID] = None
    note: Optional[str] = Field(None, max_length=500)

class TimetableExceptionResponse(BaseModel):
    id: UUID
    slot_id: UUID
    date: date
    type: ExceptionType
    substitute_faculty_id: Optional[UUID] = None
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TimetableExceptionListResponse(BaseModel):
    total: int
    items: List[TimetableExceptionResponse]

class EnrichedTimetableSlotResponse(TimetableSlotResponse):
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    faculty_name: Optional[str] = None
    room_name: Optional[str] = None
    class_group_name: Optional[str] = None

class MyScheduleResponse(BaseModel):
    slots: List[EnrichedTimetableSlotResponse]
    exceptions: List[TimetableExceptionResponse]
