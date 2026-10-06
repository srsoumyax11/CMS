from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.user import AccountStatus
from app.models.profiles import EmploymentStatus

class StaffCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full Name of the staff member")
    email: EmailStr
    password: str = Field(..., min_length=8)
    department_id: Optional[UUID] = None
    designation: str = Field(..., min_length=2, max_length=255, description="Staff designation (e.g. Hostel Warden, Accountant, Lab Technician)")
    role_id: Optional[UUID] = None

class StaffUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    department_id: Optional[UUID] = None
    designation: Optional[str] = Field(None, min_length=2, max_length=255)
    role_id: Optional[UUID] = None

class StaffStatusUpdateRequest(BaseModel):
    account_status: Optional[AccountStatus] = None
    employment_status: Optional[EmploymentStatus] = None
    status_note: Optional[str] = Field(None, max_length=1000)

class StaffItemResponse(BaseModel):
    id: UUID
    user_id: Optional[str] = None
    name: str
    email: str
    photo_url: Optional[str] = None
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None
    designation: str
    role_id: Optional[UUID] = None
    role_name: Optional[str] = None
    account_status: AccountStatus
    employment_status: Optional[EmploymentStatus] = None
    status_note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
