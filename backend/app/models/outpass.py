import uuid
import enum
from sqlalchemy import Column, String, ForeignKey, Text, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base, TimestampMixin

class OutpassStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    active = "active"
    completed = "completed"
    rejected = "rejected"
    cancelled = "cancelled"

class Outpass(Base, TimestampMixin):
    __tablename__ = "outpasses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    destination = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    
    departure_time = Column(DateTime(timezone=True), nullable=False)
    expected_return_time = Column(DateTime(timezone=True), nullable=False)
    actual_return_time = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(Enum(OutpassStatus, name="outpass_status_enum", create_type=True), nullable=False, default=OutpassStatus.pending, index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    student = relationship("User", foreign_keys=[student_id], backref="outpasses")
    approver = relationship("User", foreign_keys=[approved_by], backref="approved_outpasses")
    status_logs = relationship("OutpassStatusLog", back_populates="outpass", cascade="all, delete-orphan", order_by="OutpassStatusLog.created_at")

class OutpassStatusLog(Base):
    __tablename__ = "outpass_status_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    outpass_id = Column(UUID(as_uuid=True), ForeignKey("outpasses.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(OutpassStatus, name="outpass_status_enum", create_type=False), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    
    # Relationships
    outpass = relationship("Outpass", back_populates="status_logs")
    changer = relationship("User", foreign_keys=[changed_by])
