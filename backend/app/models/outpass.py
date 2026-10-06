import uuid
import enum
from sqlalchemy import Column, String, ForeignKey, Text, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from app.models.base import Base, TimestampMixin, UUIDMixin

class OutpassStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    active = "active"
    overdue = "overdue"
    completed = "completed"
    rejected = "rejected"
    cancelled = "cancelled"

class Outpass(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "outpasses"

    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    destination = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    
    departure_time = Column(DateTime(timezone=True), nullable=False)
    expected_return_time = Column(DateTime(timezone=True), nullable=False)
    actual_return_time = Column(DateTime(timezone=True), nullable=True)
    
    status: Mapped[OutpassStatus] = mapped_column(Enum(OutpassStatus, name="outpass_status_enum", create_type=True), nullable=False, default=OutpassStatus.pending, index=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    student = relationship("User", foreign_keys=[student_id], backref="outpasses")
    approver = relationship("User", foreign_keys=[approved_by], backref="approved_outpasses")
    status_logs = relationship("OutpassStatusLog", back_populates="outpass", cascade="all, delete-orphan", order_by="OutpassStatusLog.created_at")

    @property
    def student_name(self) -> str | None:
        from sqlalchemy import inspect
        insp = inspect(self)
        if "student" in insp.unloaded:
            return None
        return self.student.name if self.student else None

    @property
    def student_course(self) -> str | None:
        from sqlalchemy import inspect
        insp = inspect(self)
        if "student" in insp.unloaded:
            return None
        if self.student:
            student_insp = inspect(self.student)
            if "student_profile" in student_insp.unloaded:
                return None
            if self.student.student_profile:
                profile_insp = inspect(self.student.student_profile)
                if "course" in profile_insp.unloaded:
                    return None
                return self.student.student_profile.course.name if self.student.student_profile.course else None
        return None

class OutpassStatusLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "outpass_status_logs"

    outpass_id = Column(UUID(as_uuid=True), ForeignKey("outpasses.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[OutpassStatus] = mapped_column(Enum(OutpassStatus, name="outpass_status_enum", create_type=False), nullable=False)


    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note = Column(Text, nullable=True)
    
    # Relationships
    outpass = relationship("Outpass", back_populates="status_logs")
    changer = relationship("User", foreign_keys=[changed_by])
