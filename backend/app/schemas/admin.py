from pydantic import BaseModel, UUID4, EmailStr, Field
from typing import Optional, List, Literal
from app.models.user import AccountStatus
from app.models.profiles import AcademicStatus, EmploymentStatus

# --- Course Management ---
class CourseCreateRequest(BaseModel):
    name: str = Field(..., description="Name of the course (e.g., B.Tech, M.Tech)")
    is_active: Optional[bool] = True
    duration_years: int = Field(default=4, ge=1, le=7, description="Duration of the course in years")

class CourseUpdateRequest(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    duration_years: Optional[int] = Field(None, ge=1, le=7)

class CourseItemResponse(BaseModel):
    id: UUID4
    name: str
    is_active: bool
    duration_years: int

    class Config:
        from_attributes = True

class StudentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    course_id: UUID4
    department_id: UUID4
    year: int = Field(default=1, ge=1, le=7)
    hostel: Optional[str] = None

class StudentStatusUpdateRequest(BaseModel):
    account_status: Optional[AccountStatus] = None
    academic_status: Optional[AcademicStatus] = None
    status_note: Optional[str] = None

class StudentItemResponse(BaseModel):
    id: UUID4
    user_id: str
    name: str
    email: str
    course_id: Optional[UUID4] = None
    course_name: str
    department_id: Optional[UUID4] = None
    department_name: str
    year: int
    hostel: Optional[str] = None
    account_status: AccountStatus
    academic_status: Optional[AcademicStatus] = None
    status_note: Optional[str] = None

class StudentAdminUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    course_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    year: Optional[int] = Field(None, ge=1, le=5)
    hostel: Optional[str] = Field(None, max_length=100)

class FacultyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    course_id: UUID4
    department_id: UUID4
    designation: str = Field(..., min_length=2, max_length=255)
    role_id: Optional[UUID4] = None

class FacultyItemResponse(BaseModel):
    id: UUID4
    user_id: str
    name: str
    email: str
    photo_url: Optional[str] = None
    course_id: UUID4
    course_name: str
    department_id: UUID4
    department_name: str
    designation: str
    is_hod: bool
    account_status: AccountStatus
    employment_status: EmploymentStatus
    status_note: Optional[str] = None

class FacultyUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    user_id: Optional[str] = None
    photo_url: Optional[str] = None
    course_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    designation: Optional[str] = None
    account_status: Optional[AccountStatus] = None
    employment_status: Optional[EmploymentStatus] = None

class DepartmentResponse(BaseModel):
    id: UUID4
    name: str
    code: str
    department_type: Literal["academic", "administrative"]
    is_active: bool
    hod_user_id: Optional[UUID4] = None

class DepartmentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    department_type: Literal["academic", "administrative"] = "academic"
    is_active: bool = True
    hod_user_id: Optional[UUID4] = None

class DepartmentUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    department_type: Optional[Literal["academic", "administrative"]] = None
    is_active: Optional[bool] = None
    hod_user_id: Optional[UUID4] = None

class AnalyticsParams(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: Optional[int] = 10

class SystemSettingResponse(BaseModel):
    key: str
    value: Optional[str] = None
    category: str
    data_type: str
    is_public: bool
    description: Optional[str] = None

class SystemSettingUpdateRequest(BaseModel):
    value: Optional[str] = None

class AdminItemResponse(BaseModel):
    id: UUID4
    user_id: str
    name: str
    email: str
    account_status: AccountStatus
    status_note: Optional[str] = None

class OnboardingTask(BaseModel):
    id: str
    title: str
    description: str
    is_completed: bool
    action_url: str

class OnboardingStatusResponse(BaseModel):
    completion_percentage: int
    tasks: List[OnboardingTask]
