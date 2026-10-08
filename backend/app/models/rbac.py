import enum
import uuid
from sqlalchemy import String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.models.base import Base, TimestampMixin, UUIDMixin

class Asset(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "assets"
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

class Action(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "actions"
    code: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

class Permission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "permissions"
    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    action_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("actions.id", ondelete="CASCADE"), nullable=False)

    asset: Mapped["Asset"] = relationship("Asset")
    action: Mapped["Action"] = relationship("Action")

    __table_args__ = (
        UniqueConstraint('asset_id', 'action_id', name='uq_permission_asset_action'),
    )

class Role(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roles"
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_assignable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)

    permissions: Mapped[List["Permission"]] = relationship("Permission", secondary="role_permissions")

class RolePermission(Base, TimestampMixin):
    __tablename__ = "role_permissions"
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)


