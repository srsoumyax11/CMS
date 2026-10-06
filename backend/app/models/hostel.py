import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Enum as SQLEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.infrastructure import Room


from app.models.base import Base, UUIDMixin, TimestampMixin

class AllocationStatus(enum.Enum):
    active = "active"
    vacated = "vacated"

class HostelAllocation(Base, UUIDMixin, TimestampMixin):
    """
    Hostel Room Allocation.
    """
    __tablename__ = "hostel_allocations"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    room_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="RESTRICT"), nullable=False)
    
    allocated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    vacated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    status: Mapped[AllocationStatus] = mapped_column(SQLEnum(AllocationStatus, name="allocation_status_enum", create_type=False), default=AllocationStatus.active, nullable=False)

    student: Mapped["User"] = relationship("User")
    room: Mapped["Room"] = relationship("Room")
