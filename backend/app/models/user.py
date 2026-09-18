import enum
from sqlalchemy import String, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from app.models.base import Base, TimestampMixin, UUIDMixin

class UserType(str, enum.Enum):
    student = "student"
    faculty = "faculty"
    admin = "admin"

class AccountStatus(str, enum.Enum):
    pending = "pending"
    revision = "revision"
    active = "active"
    suspended = "suspended"
    rejected = "rejected"

class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    account_status: Mapped[AccountStatus] = mapped_column(Enum(AccountStatus, name="account_status_enum"), default=AccountStatus.pending, nullable=False)
    status_note: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    user_type: Mapped[UserType] = mapped_column(Enum(UserType, name="user_type_enum"), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    student_profile: Mapped[Optional["StudentProfile"]] = relationship("StudentProfile", back_populates="user", cascade="all, delete-orphan", uselist=False)
    faculty_profile: Mapped[Optional["FacultyProfile"]] = relationship("FacultyProfile", back_populates="user", cascade="all, delete-orphan", uselist=False)
    user_roles: Mapped[list["UserRole"]] = relationship("UserRole", cascade="all, delete-orphan")
