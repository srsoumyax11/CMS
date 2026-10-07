from sqlalchemy import Column, String, Text, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base, TimestampMixin, UUIDMixin

class NoticeRead(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notice_reads"
    notice_id = Column(UUID(as_uuid=True), ForeignKey("notices.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    read_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class Notice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notices"

    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    attachment_url = Column(String, nullable=True)
    
    target_course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=True)
    target_department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=True)
    target_year = Column(Integer, nullable=True)
    target_hostel = Column(String(255), nullable=True)
    target_user_types = Column(String(255), nullable=True)

    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    target_course = relationship("Course", foreign_keys=[target_course_id])
    target_department = relationship("Department", foreign_keys=[target_department_id])
    reads = relationship("NoticeRead", cascade="all, delete-orphan")

