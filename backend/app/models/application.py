import uuid
import enum
from datetime import datetime, timezone
from typing import Optional, Any
from sqlalchemy import String, Enum, ForeignKey, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

class ApplicationStatus(str, enum.Enum):
    submitted = "SUBMITTED"
    needs_revision = "NEEDS_REVISION"
    approved = "APPROVED"
    rejected = "REJECTED"

class RoleApplication(Base):
    __tablename__ = "role_applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    
    form_data: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    status: Mapped[ApplicationStatus] = mapped_column(Enum(ApplicationStatus, name="application_status_enum"), default=ApplicationStatus.submitted, nullable=False)
    
    review_note: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id], back_populates="role_applications")
    role = relationship("Role")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    @property
    def created_at(self) -> datetime:
        return self.submitted_at

    @property
    def updated_at(self) -> Optional[datetime]:
        return self.reviewed_at or self.submitted_at

