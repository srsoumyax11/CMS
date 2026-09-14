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

class CourseEnum(str, enum.Enum):
    BTECH = "B.Tech"
    MTECH = "M.Tech"
    BCA = "BCA"
    MCA = "MCA"
    PHD = "PhD"

class BranchEnum(str, enum.Enum):
    CSE = "CSE"
    ECE = "ECE"
    ME = "ME"
    CE = "CE"
    EE = "EE"
    IT = "IT"

class StudentProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "student_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    course: Mapped[CourseEnum] = mapped_column(Enum(CourseEnum, name="course_enum"), nullable=False)
    branch: Mapped[BranchEnum] = mapped_column(Enum(BranchEnum, name="branch_enum"), nullable=False)
    year: Mapped[int] = mapped_column(nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[StudentStatus] = mapped_column(Enum(StudentStatus, name="student_status_enum"), default=StudentStatus.pending, nullable=False)
    rejection_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="student_profile")


class FacultyProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "faculty_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(255), nullable=False)
    designation: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[FacultyStatus] = mapped_column(Enum(FacultyStatus, name="faculty_status_enum"), default=FacultyStatus.active, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="faculty_profile")
