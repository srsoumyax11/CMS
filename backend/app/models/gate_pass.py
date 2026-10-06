import uuid
import enum
from typing import Optional
from datetime import datetime
from sqlalchemy import String, ForeignKey, Enum, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from app.models.base import Base, TimestampMixin, UUIDMixin

class GatePassReason(str, enum.Enum):
    tea_snack = "tea_snack"
    market_errand = "market_errand"
    walk_exercise = "walk_exercise"
    personal_work = "personal_work"
    other = "other"

class GatePassStatus(str, enum.Enum):
    checked_out = "checked_out"
    checked_in = "checked_in"
    overdue = "overdue"
    cancelled = "cancelled"

class QuickGatePass(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "quick_gate_passes"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pass_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    
    reason: Mapped[GatePassReason] = mapped_column(Enum(GatePassReason, name="gate_pass_reason_enum"), nullable=False, default=GatePassReason.tea_snack)
    custom_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    status: Mapped[GatePassStatus] = mapped_column(Enum(GatePassStatus, name="gate_pass_status_enum"), nullable=False, default=GatePassStatus.checked_out, index=True)
    
    exit_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expected_return_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    actual_return_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    scanned_out_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    scanned_in_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    emergency_alert_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    qr_token_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    student = relationship("User", foreign_keys=[student_id], backref="quick_gate_passes")
    guard_out = relationship("User", foreign_keys=[scanned_out_by])
    guard_in = relationship("User", foreign_keys=[scanned_in_by])
