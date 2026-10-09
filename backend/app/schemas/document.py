from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict
from uuid import UUID
from datetime import datetime
from app.models.documents import DocumentRequestStatus

class DocumentTypeCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    template_file_url: Optional[str] = None
    fields_schema: Optional[Dict[str, Any]] = None
    approval_steps: Optional[List[str]] = None # List of role codes e.g. ["HOD", "REGISTRAR"]
    fee: int = 0
    status: bool = True

class DocumentTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_file_url: Optional[str] = None
    fields_schema: Optional[Dict[str, Any]] = None
    approval_steps: Optional[List[str]] = None
    fee: Optional[int] = None
    status: Optional[bool] = None

class DocumentTypeResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    template_file_url: Optional[str] = None
    fields_schema: Optional[Dict[str, Any]] = None
    approval_steps: Optional[List[str]] = None
    fee: int
    status: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentTypeListResponse(BaseModel):
    total: int
    items: List[DocumentTypeResponse]

class DocumentRequestCreate(BaseModel):
    type_id: UUID
    form_data: Optional[Dict[str, Any]] = None

class DocumentApprovalSubmit(BaseModel):
    decision: str = Field(..., description="APPROVED, REJECTED, or REVISION")
    note: Optional[str] = Field(None, max_length=1000)
    issued_file_url: Optional[str] = None

class DocumentApprovalResponse(BaseModel):
    id: UUID
    request_id: UUID
    step_no: int
    approver_user_id: UUID
    approver_name: Optional[str] = None
    decision: str
    note: Optional[str] = None
    decided_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentRequestResponse(BaseModel):
    id: UUID
    type_id: UUID
    user_id: UUID
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    roll_number: Optional[str] = None
    document_type_name: Optional[str] = None
    document_type_code: Optional[str] = None
    form_data: Optional[Dict[str, Any]] = None
    status: DocumentRequestStatus
    current_step: int
    issued_file_url: Optional[str] = None
    verify_code: Optional[str] = None
    issued_at: Optional[datetime] = None
    approvals: List[DocumentApprovalResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentRequestListResponse(BaseModel):
    total: int
    items: List[DocumentRequestResponse]

class DocumentVerifyResponse(BaseModel):
    valid: bool
    message: str
    request_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    document_type_code: Optional[str] = None
    issued_at: Optional[datetime] = None
    verify_code: Optional[str] = None
