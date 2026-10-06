import enum
import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, ForeignKey, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class DocumentType(str, enum.Enum):
    bonafide = "bonafide"
    noc = "noc"
    fee_clearance = "fee_clearance"
    character_certificate = "character_certificate"
    transcript = "transcript"
    other = "other"

class DocumentStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    ready = "ready"

class DocumentUrgency(str, enum.Enum):
    normal = "normal"
    urgent = "urgent"

class DocumentRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_requests"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType, name="document_type_enum"), nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus, name="document_status_enum"), default=DocumentStatus.pending, nullable=False)
    urgency: Mapped[DocumentUrgency] = mapped_column(Enum(DocumentUrgency, name="document_urgency_enum"), default=DocumentUrgency.normal, nullable=False)
    
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    issued_file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    processed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    student: Mapped["User"] = relationship("User", foreign_keys=[student_id])
    processor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[processed_by])
    status_logs: Mapped[List["DocumentStatusLog"]] = relationship("DocumentStatusLog", cascade="all, delete-orphan", back_populates="request")

class DocumentStatusLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_status_logs"

    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_requests.id", ondelete="CASCADE"), nullable=False)
    old_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    request: Mapped["DocumentRequest"] = relationship("DocumentRequest", back_populates="status_logs")
    changer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[changed_by])
