from datetime import datetime
from typing import Optional, List
import uuid
from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

class AudienceGroup(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "audience_groups"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Dynamic filter criteria (saved snapshot / rules)
    filter_course_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    filter_department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    filter_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    filter_hostel: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    filter_user_types: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    filter_course = relationship("Course", foreign_keys=[filter_course_id])
    filter_department = relationship("Department", foreign_keys=[filter_department_id])
    members: Mapped[List["AudienceGroupMember"]] = relationship("AudienceGroupMember", back_populates="group", cascade="all, delete-orphan")


class AudienceGroupMember(Base, UUIDMixin):
    __tablename__ = "audience_group_members"

    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("audience_groups.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    added_manually: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_audience_group_member"),
    )

    # Relationships
    group: Mapped["AudienceGroup"] = relationship("AudienceGroup", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
