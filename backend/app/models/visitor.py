import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User

from app.models.base import Base, UUIDMixin, TimestampMixin

class VisitorStatus(enum.Enum):
    entered = "entered"
    exited = "exited"

class VisitorLog(Base, UUIDMixin, TimestampMixin):
    """
    Minimal gate/visitor log model.
    """
    __tablename__ = "visitor_logs"

    visitor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    host_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    entry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    exit_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    status: Mapped[VisitorStatus] = mapped_column(SQLEnum(VisitorStatus, name="visitor_status_enum", create_type=False), default=VisitorStatus.entered, nullable=False)

    host: Mapped[Optional["User"]] = relationship("User")
