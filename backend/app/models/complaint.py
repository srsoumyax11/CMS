import uuid
import enum
from sqlalchemy import Column, String, ForeignKey, Text, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDMixin

class ComplaintCategory(str, enum.Enum):
    electrical = "electrical"
    plumbing = "plumbing"
    wifi = "wifi"
    cleanliness = "cleanliness"
    furniture = "furniture"
    security = "security"
    other = "other"

class ComplaintVisibility(str, enum.Enum):
    public = "public"
    private = "private"

class ComplaintStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"
    cancelled = "cancelled"

class Complaint(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "complaints"

    raised_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    category: Mapped[ComplaintCategory] = mapped_column(Enum(ComplaintCategory, name="complaint_category_enum", create_type=True), nullable=False, index=True)
    location_hostel = Column(String, nullable=False, index=True)
    location_room = Column(String, nullable=True, index=True)
    description = Column(Text, nullable=False)
    photo_url = Column(String, nullable=True)
    
    visibility: Mapped[ComplaintVisibility] = mapped_column(Enum(ComplaintVisibility, name="complaint_visibility_enum", create_type=True), nullable=False, default=ComplaintVisibility.public)
    status: Mapped[ComplaintStatus] = mapped_column(Enum(ComplaintStatus, name="complaint_status_enum", create_type=True), nullable=False, default=ComplaintStatus.open, index=True)

    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    raiser = relationship("User", foreign_keys=[raised_by], backref="raised_complaints")
    assignee = relationship("User", foreign_keys=[assigned_to], backref="assigned_complaints")
    status_logs = relationship("ComplaintStatusLog", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintStatusLog.created_at")

class ComplaintStatusLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "complaint_status_logs"

    complaint_id = Column(UUID(as_uuid=True), ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[ComplaintStatus] = mapped_column(Enum(ComplaintStatus, name="complaint_status_enum", create_type=False), nullable=False)


    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note = Column(Text, nullable=True)
    
    # Relationships
    complaint = relationship("Complaint", back_populates="status_logs")
    changer = relationship("User", foreign_keys=[changed_by])
