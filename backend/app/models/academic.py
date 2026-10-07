import uuid
from typing import Optional
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Enum, Time, Date, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

class Department(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "departments"

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    department_type: Mapped[str] = mapped_column(
        Enum('academic', 'administrative', name='departmenttype'),
        nullable=False,
        server_default='academic'
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    hod_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    hod = relationship("User", foreign_keys=[hod_user_id])

class Course(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "courses"

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    duration_years: Mapped[int] = mapped_column(Integer, default=4, nullable=False)


