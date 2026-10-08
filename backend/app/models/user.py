import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Enum, ForeignKey, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, Any, TYPE_CHECKING
from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.profiles import StudentProfile, FacultyProfile, StaffProfile, ParentProfile
    from app.models.rbac import Role
    from app.models.notification import Notification
    from app.models.application import RoleApplication

class UserType(str, enum.Enum):
    user = "user"
    student = "student"
    faculty = "faculty"
    staff = "staff"
    parent = "parent"
    admin = "admin"

class AccountStatus(str, enum.Enum):
    base = "base"
    pending = "pending"
    revision = "revision"
    active = "active"
    suspended = "suspended"

class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    account_status: Mapped[AccountStatus] = mapped_column(Enum(AccountStatus, name="account_status_enum"), default=AccountStatus.pending, nullable=False)
    status_note: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    user_type: Mapped[UserType] = mapped_column(Enum(UserType, name="user_type_enum"), default=UserType.user, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Preferences
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    in_app_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_2fa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Onboarding Application Data

    student_profile: Mapped[Optional["StudentProfile"]] = relationship("StudentProfile", back_populates="user", cascade="all, delete-orphan", uselist=False)
    faculty_profile: Mapped[Optional["FacultyProfile"]] = relationship("FacultyProfile", back_populates="user", cascade="all, delete-orphan", uselist=False)
    staff_profile: Mapped[Optional["StaffProfile"]] = relationship("StaffProfile", back_populates="user", cascade="all, delete-orphan", uselist=False)
    parent_profile: Mapped[Optional["ParentProfile"]] = relationship("ParentProfile", foreign_keys="ParentProfile.user_id", back_populates="user", cascade="all, delete-orphan", uselist=False)
    role_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    role: Mapped[Optional["Role"]] = relationship("Role")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    
    role_applications: Mapped[list["RoleApplication"]] = relationship("RoleApplication", foreign_keys="RoleApplication.user_id", back_populates="user", cascade="all, delete-orphan")
    
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
