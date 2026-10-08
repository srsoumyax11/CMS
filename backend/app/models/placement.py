import uuid
from typing import Optional, Any
from datetime import date
from sqlalchemy import String, Enum, ForeignKey, Float, Integer, Date, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin
import enum

class PlacementStatus(str, enum.Enum):
    draft = "DRAFT"
    published = "PUBLISHED"
    closed = "CLOSED"

class ApplicationStatus(str, enum.Enum):
    applied = "APPLIED"
    shortlisted = "SHORTLISTED"
    rejected = "REJECTED"
    selected = "SELECTED"

class PlacementNotice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "placement_notices"

    company: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    job_type: Mapped[str] = mapped_column(String(100), nullable=False)
    package_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    eligible_course_ids: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    eligible_department_ids: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    min_cgpa: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    passout_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    last_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    drive_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    
    status: Mapped[PlacementStatus] = mapped_column(Enum(PlacementStatus, name="placement_notice_status_enum"), default=PlacementStatus.draft, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

class PlacementApplication(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "placement_applications"

    notice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("placement_notices.id", ondelete="CASCADE"), nullable=False)
    student_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resume_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    status: Mapped[ApplicationStatus] = mapped_column(Enum(ApplicationStatus, name="placement_application_status_enum"), default=ApplicationStatus.applied, nullable=False)
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
