from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid
from app.models.user import UserType, AccountStatus
from app.models.profiles import AcademicStatus, EmploymentStatus

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    user_id: str
    photo_url: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_type: UserType
    account_status: AccountStatus
    academic_status: Optional[AcademicStatus] = None
    employment_status: Optional[EmploymentStatus] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RegisterResponseData(BaseModel):
    user_id: uuid.UUID
    account_status: AccountStatus
    academic_status: Optional[AcademicStatus] = None

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    user_id: Optional[str] = None
    account_status: AccountStatus
    status_note: Optional[str] = None
    user_type: UserType
    academic_status: Optional[AcademicStatus] = None
    employment_status: Optional[EmploymentStatus] = None
    name: Optional[str] = None
    photo_url: Optional[str] = None

class NameUpdateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)

class UserIdUpdateRequest(BaseModel):
    user_id: str

class StudentProfileCreateRequest(BaseModel):
    course_id: uuid.UUID
    branch_id: uuid.UUID
    year: int = Field(..., ge=1990, le=2100)
    hostel: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
