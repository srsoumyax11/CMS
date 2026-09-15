import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Enum, Time, Date, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    branches = relationship("Branch", back_populates="course")


class Branch(Base):
    __tablename__ = "branches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    course = relationship("Course", back_populates="branches")


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    subject_name = Column(String, nullable=False)
    faculty_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(
        Enum('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', name='dayofweek'),
        nullable=False
    )
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    room = Column(String, nullable=True)

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timetable_slot_id = Column(UUID(as_uuid=True), ForeignKey("timetable_slots.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(
        Enum('present', 'absent', 'late', 'excused', name='attendancestatus'),
        nullable=False
    )
    marked_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint('timetable_slot_id', 'student_id', 'date', name='uq_attendance_slot_student_date'),
    )

