import uuid
from typing import Optional, Any
from sqlalchemy import String, Enum, ForeignKey, Boolean, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin
import enum
from datetime import datetime

class DocumentRequestStatus(str, enum.Enum):
    submitted = "SUBMITTED"
    in_review = "IN_REVIEW"
    needs_revision = "NEEDS_REVISION"
    approved = "APPROVED"
    rejected = "REJECTED"
    issued = "ISSUED"

class DocumentType(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_types"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    template_file_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    fields_schema: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    approval_steps: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True) # Ordered list of role codes
    fee: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class DocumentRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_requests"

    type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_types.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    form_data: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    status: Mapped[DocumentRequestStatus] = mapped_column(Enum(DocumentRequestStatus, name="document_request_status_enum"), default=DocumentRequestStatus.submitted, nullable=False)
    current_step: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    issued_file_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    verify_code: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

class DocumentApproval(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_approvals"

    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_requests.id", ondelete="CASCADE"), nullable=False)
    step_no: Mapped[int] = mapped_column(Integer, nullable=False)
    approver_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    decision: Mapped[str] = mapped_column(String(50), nullable=False) # APPROVED, REJECTED, REVISION
    note: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
