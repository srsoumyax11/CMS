from pydantic import BaseModel, UUID4, EmailStr, Field
from typing import Optional, List
from app.models.user import AccountStatus
from app.models.profiles import AcademicStatus, EmploymentStatus

class StudentStatusUpdateRequest(BaseModel):
    account_status: Optional[AccountStatus] = None
    academic_status: Optional[AcademicStatus] = None
    status_note: Optional[str] = None

class StudentItemResponse(BaseModel):
    id: UUID4
    user_id: str
    user_uuid: UUID4
    name: str
    email: str
    course_id: Optional[UUID4] = None
    course_name: str
    branch_id: Optional[UUID4] = None
    branch_name: str
    year: int
    hostel: Optional[str] = None
    account_status: AccountStatus
    academic_status: Optional[AcademicStatus] = None
    status_note: Optional[str] = None

class StudentAdminUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    course_id: Optional[UUID4] = None
    branch_id: Optional[UUID4] = None
    year: Optional[int] = Field(None, ge=1, le=5)
    hostel: Optional[str] = Field(None, max_length=100)

class FacultyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    department_id: UUID4
    designation: str = Field(..., min_length=2, max_length=255)

class FacultyItemResponse(BaseModel):
    id: UUID4
    user_id: str
    user_uuid: UUID4
    name: str
    email: str
    department_id: UUID4
    department_name: str
    designation: str
    account_status: AccountStatus
    employment_status: EmploymentStatus
    status_note: Optional[str] = None

class FacultyUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    department_id: Optional[UUID4] = None
    designation: Optional[str] = None
    account_status: Optional[AccountStatus] = None
    employment_status: Optional[EmploymentStatus] = None

class DepartmentResponse(BaseModel):
    id: UUID4
    name: str
    code: str
    is_active: bool

class DepartmentCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)
    is_active: bool = True

class DepartmentUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    is_active: Optional[bool] = None

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
    user_uuid: UUID4
    name: str
    email: str
    account_status: AccountStatus
    status_note: Optional[str] = None
