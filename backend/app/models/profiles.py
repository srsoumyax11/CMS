import enum
import uuid
from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin

class AcademicStatus(str, enum.Enum):
    enrolled = "enrolled"
    graduated = "graduated"
    dropped = "dropped"
    expelled = "expelled"

class EmploymentStatus(str, enum.Enum):
    active = "active"
    on_leave = "on_leave"
    resigned = "resigned"
    retired = "retired"
    terminated = "terminated"

class StudentProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "student_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    year: Mapped[int] = mapped_column(nullable=False)
    hostel: Mapped[str | None] = mapped_column(String(255), nullable=True)

    academic_status: Mapped[AcademicStatus] = mapped_column(Enum(AcademicStatus, name="academic_status_enum"), default=AcademicStatus.enrolled, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    course: Mapped["Course"] = relationship("Course")
    branch: Mapped["Branch"] = relationship("Branch")


class FacultyProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "faculty_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    designation: Mapped[str] = mapped_column(String(255), nullable=False)

    employment_status: Mapped[EmploymentStatus] = mapped_column(Enum(EmploymentStatus, name="employment_status_enum"), default=EmploymentStatus.active, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="faculty_profile")
