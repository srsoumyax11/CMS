import uuid
from typing import Optional
from sqlalchemy import String, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin

class Hostel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hostels"

    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    warden_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    capacity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    warden = relationship("User", foreign_keys=[warden_user_id])
