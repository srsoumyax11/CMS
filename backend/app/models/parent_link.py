import enum
import uuid
from sqlalchemy import Column, String, ForeignKey, Enum as SQLEnum, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from app.models.base import Base, TimestampMixin, UUIDMixin

class ParentLinkStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    revoked = "revoked"

class ParentLinkRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "parent_link_requests"

    parent_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    relationship_type: Mapped[str] = mapped_column(String(50), default="Parent", nullable=False)
    status: Mapped[ParentLinkStatus] = mapped_column(SQLEnum(ParentLinkStatus, name="parent_link_status_enum"), default=ParentLinkStatus.pending, nullable=False, index=True)

    # Granular privacy sharing permissions controlled by Student
    share_gate_pass: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_attendance: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_marksheet: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    share_outpass: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    from typing import Optional
    from datetime import datetime

    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


    # Relationships
    parent_user = relationship("User", foreign_keys=[parent_user_id], backref="outgoing_parent_link_requests")
    student_user = relationship("User", foreign_keys=[student_id], backref="incoming_parent_link_requests")
