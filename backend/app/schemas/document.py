from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.document import DocumentType, DocumentStatus, DocumentUrgency

class DocumentRequestCreate(BaseModel):
    document_type: DocumentType
    purpose: str = Field(..., min_length=5, max_length=1000, description="Reason and context for requesting this document")
    urgency: DocumentUrgency = DocumentUrgency.normal
    attachment_url: Optional[str] = Field(None, max_length=500)

class DocumentRequestApprove(BaseModel):
    issued_file_url: Optional[str] = Field(None, max_length=500, description="URL of generated or uploaded certificate file")
    admin_notes: Optional[str] = Field(None, max_length=1000)

class DocumentRequestReject(BaseModel):
    rejection_reason: str = Field(..., min_length=5, max_length=1000, description="Mandatory reason explaining why the request was rejected")
    admin_notes: Optional[str] = Field(None, max_length=1000)

class DocumentRequestMarkReady(BaseModel):
    issued_file_url: str = Field(..., min_length=5, max_length=500, description="URL to the generated certificate")
    admin_notes: Optional[str] = Field(None, max_length=1000)

class DocumentStatusLogResponse(BaseModel):
    id: UUID
    request_id: UUID
    old_status: Optional[str] = None
    new_status: str
    changed_by: Optional[UUID] = None
    changer_name: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentRequestResponse(BaseModel):
    id: UUID
    student_id: UUID
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    document_type: DocumentType
    purpose: str
    status: DocumentStatus
    urgency: DocumentUrgency
    attachment_url: Optional[str] = None
    issued_file_url: Optional[str] = None
    processed_by: Optional[UUID] = None
    processor_name: Optional[str] = None
    processed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status_logs: Optional[List[DocumentStatusLogResponse]] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentRequestListResponse(BaseModel):
    items: List[DocumentRequestResponse]
    total: int
    page: int
    size: int
