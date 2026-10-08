import uuid
from typing import Optional
from datetime import date
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


class AcademicTerm(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "academic_terms"

    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)



class Subject(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "subjects"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    department_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    department = relationship("Department")


class ClassGroup(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "class_groups"

    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False)
    department_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    course = relationship("Course")
    department = relationship("Department")


class Holiday(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "holidays"

    date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    applies_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=True) # Null means ALL


    department = relationship("Department")


