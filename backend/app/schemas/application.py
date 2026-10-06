from pydantic import BaseModel, Field, model_validator
from typing import Optional, Any, Dict
import uuid
from datetime import datetime
from app.models.user import AccountStatus

class StudentApplicationPayload(BaseModel):
    registration_no: Optional[str] = Field(None, description="10-digit BPUT Registration Number or Roll Number")
    roll_no: Optional[str] = Field(None, description="Class Roll Number e.g. 23/CSE/042")
    course_id: uuid.UUID
    department_id: uuid.UUID
    admission_year: Optional[int] = Field(None, ge=2000, le=2100)
    current_semester: int = Field(default=1, ge=1, le=10)
    section: Optional[str] = Field(default="A")
    year: int = Field(default=1, ge=1, le=5)
    user_id_str: Optional[str] = Field(None, description="Legacy Student Roll / Registration Number")
    hostel: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def sanitize_student_data(cls, data: Any) -> Any:
        if isinstance(data, dict):
            reg = data.get("registration_no") or data.get("user_id_str") or data.get("roll_no") or f"230123{str(uuid.uuid4().int)[:4]}"
            data["registration_no"] = str(reg).strip()
            if not data.get("roll_no"):
                data["roll_no"] = data["registration_no"]
            if not data.get("user_id_str"):
                data["user_id_str"] = data["registration_no"]
            
            if not data.get("admission_year"):
                try:
                    yr = int(data.get("year", 1))
                except (ValueError, TypeError):
                    yr = 1
                data["admission_year"] = datetime.now().year - (yr - 1)
        return data

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
