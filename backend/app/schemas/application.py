from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
import uuid
from datetime import datetime
from app.models.user import AccountStatus

class StudentApplicationPayload(BaseModel):
    registration_no: str = Field(..., pattern=r"^\d{10}$", description="10-digit BPUT Registration Number")
    roll_no: Optional[str] = Field(None, description="Class Roll Number e.g. 23/CSE/042")
    course_id: uuid.UUID
    department_id: uuid.UUID
    admission_year: int = Field(..., ge=2000, le=2100)
    current_semester: int = Field(default=1, ge=1, le=10)
    section: Optional[str] = Field(default="A")
    year: int = Field(default=1, ge=1, le=5)
    user_id_str: Optional[str] = Field(None, description="Legacy Student Roll / Registration Number")
    hostel: Optional[str] = None

class ParentApplicationPayload(BaseModel):
    student_id_str: str = Field(..., description="Student Roll Number or Email of Child")
    relationship_type: str = "Parent"
    emergency_contact: Optional[str] = None

class FacultyApplicationPayload(BaseModel):
    employee_id: str
    department_id: uuid.UUID
    course_id: uuid.UUID
    designation: str

class StaffApplicationPayload(BaseModel):
    employee_id: str
    department_id: Optional[uuid.UUID] = None
    designation: str

class RoleApplicationCreateRequest(BaseModel):
    target_role: str = Field(..., description="Target role: student, parent, faculty, staff")
    data: Dict[str, Any]

class RoleApplicationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    applicant_name: Optional[str] = None
    applicant_email: Optional[str] = None
    target_role: str
    application_data: Dict[str, Any]
    status: str
    admin_notes: Optional[str] = None
    reviewed_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

class ApplicationActionRequest(BaseModel):
    admin_notes: Optional[str] = None
