from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any
from uuid import UUID
from datetime import date, datetime
from app.models.placement import PlacementStatus, ApplicationStatus

class PlacementNoticeCreate(BaseModel):
    company: str = Field(..., max_length=255)
    title: str = Field(..., max_length=255)
    description: str
    job_type: str = Field("Full-time", max_length=100)
    package_text: Optional[str] = Field(None, max_length=255)
    eligible_course_ids: Optional[List[str]] = None
    eligible_department_ids: Optional[List[str]] = None
    min_cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    passout_year: Optional[int] = None
    last_date: Optional[date] = None
    drive_date: Optional[date] = None
    status: PlacementStatus = PlacementStatus.draft

class PlacementNoticeUpdate(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    job_type: Optional[str] = None
    package_text: Optional[str] = None
    eligible_course_ids: Optional[List[str]] = None
    eligible_department_ids: Optional[List[str]] = None
    min_cgpa: Optional[float] = None
    passout_year: Optional[int] = None
    last_date: Optional[date] = None
    drive_date: Optional[date] = None
    status: Optional[PlacementStatus] = None

class PlacementNoticeResponse(BaseModel):
    id: UUID
    company: str
    title: str
    description: str
    job_type: str
    package_text: Optional[str] = None
    eligible_course_ids: Optional[List[str]] = None
    eligible_department_ids: Optional[List[str]] = None
    min_cgpa: Optional[float] = None
    passout_year: Optional[int] = None
    last_date: Optional[date] = None
    drive_date: Optional[date] = None
    status: PlacementStatus
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PlacementNoticeListResponse(BaseModel):
    total: int
    items: List[PlacementNoticeResponse]

class PlacementApplicationCreate(BaseModel):
    resume_url: Optional[str] = Field(None, max_length=1000)

class PlacementApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus

class PlacementApplicationResponse(BaseModel):
    id: UUID
    notice_id: UUID
    student_user_id: UUID
    resume_url: Optional[str] = None
    status: ApplicationStatus
    updated_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PlacementApplicationListResponse(BaseModel):
    total: int
    items: List[PlacementApplicationResponse]
