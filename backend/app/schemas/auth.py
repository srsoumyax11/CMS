from pydantic import BaseModel, EmailStr, Field
from typing import Optional
import uuid
from app.models.user import UserType
from app.models.profiles import StudentStatus

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    course_id: uuid.UUID
    branch_id: uuid.UUID
    year: int = Field(..., ge=1990, le=2100, description="Admission or current year depending on convention")
    photo_url: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_type: UserType
    status: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RegisterResponseData(BaseModel):
    user_id: uuid.UUID
    status: str

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    is_active: bool
    user_type: UserType
