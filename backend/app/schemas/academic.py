from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime

# --- Department Schemas ---
class DepartmentCreate(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    department_type: str = Field("academic", description="academic or administrative")
    is_active: bool = True
    hod_user_id: Optional[UUID] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    department_type: Optional[str] = None
    is_active: Optional[bool] = None
    hod_user_id: Optional[UUID] = None

class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str
    department_type: str
    is_active: bool
    hod_user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DepartmentListResponse(BaseModel):
    total: int
    items: List[DepartmentResponse]

# --- Course Schemas ---
class CourseCreate(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    duration_years: int = Field(4, ge=1, le=6)
    is_active: bool = True

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    duration_years: Optional[int] = None
    is_active: Optional[bool] = None

class CourseResponse(BaseModel):
    id: UUID
    name: str
    code: str
    duration_years: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CourseListResponse(BaseModel):
    total: int
    items: List[CourseResponse]

# --- Academic Term Schemas ---
class AcademicTermCreate(BaseModel):
    name: str = Field(..., max_length=255)
    start_date: date
    end_date: date
    is_current: bool = False

class AcademicTermUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None

class AcademicTermResponse(BaseModel):
    id: UUID
    name: str
    start_date: date
    end_date: date
    is_current: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AcademicTermListResponse(BaseModel):
    total: int
    items: List[AcademicTermResponse]

# --- Subject Schemas ---
class SubjectCreate(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=255)
    department_id: UUID
    credits: int = Field(3, ge=1, le=10)
    status: bool = True

class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    department_id: Optional[UUID] = None
    credits: Optional[int] = None
    status: Optional[bool] = None

class SubjectResponse(BaseModel):
    id: UUID
    code: str
    name: str
    department_id: UUID
    credits: int
    status: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SubjectListResponse(BaseModel):
    total: int
    items: List[SubjectResponse]

# --- Class Group Schemas ---
class ClassGroupCreate(BaseModel):
    course_id: UUID
    department_id: UUID
    year: int = Field(..., ge=1, le=6)
    section: str = Field("A", max_length=10)
    status: bool = True

class ClassGroupUpdate(BaseModel):
    course_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    year: Optional[int] = None
    section: Optional[str] = None
    status: Optional[bool] = None

class ClassGroupResponse(BaseModel):
    id: UUID
    course_id: UUID
    department_id: UUID
    year: int
    section: str
    status: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ClassGroupListResponse(BaseModel):
    total: int
    items: List[ClassGroupResponse]

# --- Holiday Schemas ---
class HolidayCreate(BaseModel):
    date: date
    name: str = Field(..., max_length=255)
    applies_to: Optional[UUID] = Field(None, description="Department ID if department-specific, None if college-wide")

class HolidayUpdate(BaseModel):
    date: Optional[date] = None
    name: Optional[str] = None
    applies_to: Optional[UUID] = None

class HolidayResponse(BaseModel):
    id: UUID
    date: date
    name: str
    applies_to: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HolidayListResponse(BaseModel):
    total: int
    items: List[HolidayResponse]
