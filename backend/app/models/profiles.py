import enum
import uuid
from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.academic import Course, Department

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
    department_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    registration_no: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    admission_year: Mapped[int] = mapped_column(nullable=False, default=2024)
    current_semester: Mapped[int] = mapped_column(nullable=False, default=1)
    section: Mapped[Optional[str]] = mapped_column(String(10), default="A", nullable=True)
    year: Mapped[int] = mapped_column(nullable=False, default=1)

    hostel_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("hostels.id", ondelete="SET NULL"), nullable=True)
    room_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    academic_status: Mapped[AcademicStatus] = mapped_column(Enum(AcademicStatus, name="academic_status_enum"), default=AcademicStatus.enrolled, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    course: Mapped["Course"] = relationship("Course")
    department: Mapped["Department"] = relationship("Department")


class FacultyProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "faculty_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    join_year: Mapped[Optional[int]] = mapped_column(nullable=True)
    department_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    designation: Mapped[str] = mapped_column(String(255), nullable=False)

    employment_status: Mapped[EmploymentStatus] = mapped_column(Enum(EmploymentStatus, name="employment_status_enum"), default=EmploymentStatus.active, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="faculty_profile")
    department: Mapped["Department"] = relationship("Department")


class StaffProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "staff_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    join_year: Mapped[Optional[int]] = mapped_column(nullable=True)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    designation: Mapped[str] = mapped_column(String(255), nullable=False)

    employment_status: Mapped[EmploymentStatus] = mapped_column(Enum(EmploymentStatus, name="employment_status_enum", create_type=False), default=EmploymentStatus.active, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="staff_profile")
    department: Mapped[Optional["Department"]] = relationship("Department")


class ParentProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "parent_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(50), default="Parent", nullable=False)
    emergency_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    emergency_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="parent_profile")
    student: Mapped["User"] = relationship("User", foreign_keys=[student_id])



