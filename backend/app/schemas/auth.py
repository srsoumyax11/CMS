from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid
from app.models.user import UserType, AccountStatus
from app.models.profiles import AcademicStatus, EmploymentStatus

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    registration_no: Optional[str] = Field(None, pattern=r"^\d{10}$")
    roll_no: Optional[str] = None
    user_id: Optional[str] = None
    course_id: uuid.UUID
    department_id: uuid.UUID
    admission_year: int = Field(default=2024, ge=2000, le=2100)
    current_semester: int = Field(default=1, ge=1, le=10)
    section: Optional[str] = Field(default="A")
    year: int = Field(default=1, ge=1, le=7)
    hostel: Optional[str] = None
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
    account_status: AccountStatus
    status_note: Optional[str] = None
    user_type: UserType
    academic_status: Optional[AcademicStatus] = None
    employment_status: Optional[EmploymentStatus] = None
    name: Optional[str] = None
    photo_url: Optional[str] = None
    email_notifications: bool = True
    in_app_alerts: bool = True
    is_2fa_enabled: bool = False
    rbac_roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)

class UserPreferencesUpdateRequest(BaseModel):
    email_notifications: Optional[bool] = None
    in_app_alerts: Optional[bool] = None

class NameUpdateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)

class StudentProfileCreateRequest(BaseModel):
    course_id: uuid.UUID
    department_id: uuid.UUID
    year: int = Field(..., ge=1990, le=2100)
    hostel: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class EmailUpdateRequest(BaseModel):
    new_email: EmailStr

class EmailVerifyOTPRequest(BaseModel):
    otp: str
    session_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class OpenSignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class VerifySignUpOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    session_token: str
    name: str
    password: str

