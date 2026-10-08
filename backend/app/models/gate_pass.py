import uuid
from typing import Optional
from sqlalchemy import String, Enum, ForeignKey, DateTime, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin
import enum
from datetime import datetime

class GatePassType(str, enum.Enum):
    short = "SHORT"
    long = "LONG"

class GatePassReason(str, enum.Enum):
    tea = "TEA"
    market = "MARKET"
    medical = "MEDICAL"
    holiday = "HOLIDAY"
    other = "OTHER"

class GatePassStatus(str, enum.Enum):
    requested = "REQUESTED"
    approved = "APPROVED"
    rejected = "REJECTED"
    cancelled = "CANCELLED"
    out = "OUT"
    returned = "RETURNED"
    overdue = "OVERDUE"
    expired = "EXPIRED"

class GatePass(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "gate_passes"

    student_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[GatePassType] = mapped_column(Enum(GatePassType, name="gate_pass_type_enum"), nullable=False)
    reason_category: Mapped[GatePassReason] = mapped_column(Enum(GatePassReason, name="gate_pass_reason_enum"), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    
    out_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expected_return_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    from_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    to_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    status: Mapped[GatePassStatus] = mapped_column(Enum(GatePassStatus, name="gate_pass_status_enum"), default=GatePassStatus.requested, nullable=False)
    
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_note: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    pass_code: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    
    actual_out_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_return_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    marked_out_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    marked_in_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    parent_notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
