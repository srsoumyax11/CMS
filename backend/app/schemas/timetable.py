from typing import Optional
from datetime import time
from pydantic import BaseModel, ConfigDict, model_validator
from uuid import UUID

class TimetableSlotBase(BaseModel):
    course_id: UUID
    branch_id: UUID
    year: int
    subject_name: str
    faculty_id: UUID
    day_of_week: str
    start_time: time
    end_time: time
    room: Optional[str] = None

class TimetableSlotCreate(TimetableSlotBase):
    @model_validator(mode="after")
    def check_time(self) -> 'TimetableSlotCreate':
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be strictly before end_time")
        return self

class TimetableSlotUpdate(BaseModel):
    course_id: Optional[UUID] = None
    branch_id: Optional[UUID] = None
    year: Optional[int] = None
    subject_name: Optional[str] = None
    faculty_id: Optional[UUID] = None
    day_of_week: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room: Optional[str] = None
    
    @model_validator(mode="after")
    def check_time(self) -> 'TimetableSlotUpdate':
        if self.start_time is not None and self.end_time is not None:
            if self.start_time >= self.end_time:
                raise ValueError("start_time must be strictly before end_time")
        return self

class TimetableSlotResponse(TimetableSlotBase):
    id: UUID
    
    model_config = ConfigDict(from_attributes=True)
