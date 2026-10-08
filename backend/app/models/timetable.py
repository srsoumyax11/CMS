import uuid
from typing import Optional
from sqlalchemy import String, Integer, Enum, Boolean, ForeignKey, Time, Date, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin
import enum

class DayOfWeek(int, enum.Enum):
    monday = 1
    tuesday = 2
    wednesday = 3
    thursday = 4
    friday = 5
    saturday = 6
    sunday = 7

class TimetableSlot(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "timetable_slots"

    term_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("academic_terms.id", ondelete="CASCADE"), nullable=False)
    class_group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("class_groups.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    faculty_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    room_location_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True) # Will link to map_locations later
    
    day_of_week: Mapped[DayOfWeek] = mapped_column(Enum(DayOfWeek, name="day_of_week_enum"), nullable=False)
    start_time: Mapped[Time] = mapped_column(Time, nullable=False)
    end_time: Mapped[Time] = mapped_column(Time, nullable=False)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class ExceptionType(str, enum.Enum):
    cancelled = "CANCELLED"
    substitute = "SUBSTITUTE"
    extra = "EXTRA"

class TimetableException(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "timetable_exceptions"

    slot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("timetable_slots.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    type: Mapped[ExceptionType] = mapped_column(Enum(ExceptionType, name="exception_type_enum"), nullable=False)
    substitute_faculty_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

class AttendanceStatus(str, enum.Enum):
    present = "PRESENT"
    absent = "ABSENT"
    late = "LATE"
    excused = "EXCUSED"

class AttendanceSession(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attendance_sessions"

    slot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("timetable_slots.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    taken_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String, default="OPEN", nullable=False) # OPEN or LOCKED

class AttendanceRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "attendance_records"

    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus, name="attendance_status_enum"), nullable=False)
