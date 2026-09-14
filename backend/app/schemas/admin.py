from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal
from uuid import UUID

class StudentApprovalRequest(BaseModel):
    status: Literal["approved", "rejected"]
    rejection_reason: Optional[str] = None

class StudentItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    email: str
    course_name: str
    branch_name: str
    year: int
    status: str
    
class FacultyCreateRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    department: str
    designation: str

class FacultyItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    email: str
    department: str
    designation: str

class FacultyUpdateRequest(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[Literal["active", "inactive"]] = None
