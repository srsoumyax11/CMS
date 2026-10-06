from pydantic import BaseModel, ConfigDict, UUID4, EmailStr, Field
from typing import Optional, List, Literal
from app.models.user import AccountStatus
from app.models.profiles import AcademicStatus, EmploymentStatus

# --- Course Management ---
class CourseCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Name of the course (e.g., B.Tech in Computer Science & Engineering)")
    code: str = Field(..., min_length=2, max_length=50, description="Short code of the course (e.g., BTECH-CSE)")
    is_active: Optional[bool] = True
    duration_years: int = Field(default=4, ge=1, le=7, description="Duration of the course in years")

class CourseUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    is_active: Optional[bool] = None
    duration_years: Optional[int] = Field(None, ge=1, le=7)

class CourseItemResponse(BaseModel):
    id: UUID4
    name: str
    code: str
    is_active: bool
    duration_years: int

    class Config:
        from_attributes = True

class StudentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    registration_no: str = Field(..., pattern=r"^\d{10}$", description="10-digit BPUT Registration Number")
    roll_no: Optional[str] = Field(None, description="Class Roll Number e.g. 23/CSE/042")
    course_id: UUID4
    department_id: UUID4
    admission_year: int = Field(default=2024, ge=2000, le=2100)
    current_semester: int = Field(default=1, ge=1, le=10)
    section: Optional[str] = Field(default="A")
    year: int = Field(default=1, ge=1, le=7)
    hostel: Optional[str] = None

class StudentStatusUpdateRequest(BaseModel):
    account_status: Optional[AccountStatus] = None
    academic_status: Optional[AcademicStatus] = None
    status_note: Optional[str] = None

class StudentItemResponse(BaseModel):
    id: UUID4
    user_id: Optional[str] = ""
    registration_no: Optional[str] = ""
    roll_no: Optional[str] = None
    name: str
    email: str
    course_id: Optional[UUID4] = None
    course_name: str
    department_id: Optional[UUID4] = None
    department_name: str
    admission_year: int = 2024
    current_semester: int = 1
    section: Optional[str] = "A"
    year: int
    hostel: Optional[str] = None
    hostel_name: Optional[str] = None
    room_id: Optional[UUID4] = None
    account_status: AccountStatus
    academic_status: Optional[AcademicStatus] = None
    status_note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class StudentAdminUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    registration_no: Optional[str] = Field(None, pattern=r"^\d{10}$")
    roll_no: Optional[str] = Field(None)
    course_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    admission_year: Optional[int] = Field(None, ge=2000, le=2100)
    current_semester: Optional[int] = Field(None, ge=1, le=10)
    section: Optional[str] = Field(None)
    year: Optional[int] = Field(None, ge=1, le=5)
    hostel: Optional[str] = Field(None, max_length=100)
    room_id: Optional[UUID4] = None

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
    user_id: Optional[str] = ""
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

    model_config = ConfigDict(from_attributes=True)

class FacultyUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    photo_url: Optional[str] = None
    course_id: Optional[UUID4] = None
    department_id: Optional[UUID4] = None
    designation: Optional[str] = None
    account_status: Optional[AccountStatus] = None
    employment_status: Optional[EmploymentStatus] = None

class FacultyStatusUpdateRequest(BaseModel):
    account_status: Optional[AccountStatus] = None
    employment_status: Optional[EmploymentStatus] = None
    status_note: Optional[str] = Field(None, max_length=1000)


class DepartmentResponse(BaseModel):
    id: UUID4
    name: str
    code: str
    department_type: Literal["academic", "administrative"]
    is_active: bool
    hod_user_id: Optional[UUID4] = None

    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)

class SystemSettingUpdateRequest(BaseModel):
    value: Optional[str] = None

class AdminItemResponse(BaseModel):
    id: UUID4
    user_id: Optional[str] = ""
    name: str
    email: str
    account_status: AccountStatus
    status_note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class OnboardingTask(BaseModel):
    id: str
    title: str
    description: str
    is_completed: bool
    action_url: str

class OnboardingStatusResponse(BaseModel):
    completion_percentage: int
    tasks: List[OnboardingTask]

    model_config = ConfigDict(from_attributes=True)
