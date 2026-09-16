import enum
import uuid
from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin

class StudentStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class FacultyStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"

class StudentProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "student_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    year: Mapped[int] = mapped_column(nullable=False)
    hostel: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[StudentStatus] = mapped_column(Enum(StudentStatus, name="student_status_enum"), default=StudentStatus.pending, nullable=False)
    rejection_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    course: Mapped["Course"] = relationship("Course")
    branch: Mapped["Branch"] = relationship("Branch")


class FacultyProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "faculty_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    designation: Mapped[str] = mapped_column(String(255), nullable=False)

    status: Mapped[FacultyStatus] = mapped_column(Enum(FacultyStatus, name="faculty_status_enum"), default=FacultyStatus.active, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="faculty_profile")
