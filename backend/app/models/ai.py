import uuid
from typing import Optional, Any
from sqlalchemy import String, Enum, ForeignKey, Integer, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin
import enum
from datetime import datetime

class SilentMode(str, enum.Enum):
    silent = "SILENT"
    vibrate = "VIBRATE"
    dnd = "DND"

class SilentSource(str, enum.Enum):
    timetable = "TIMETABLE"
    custom = "CUSTOM"
    both = "BOTH"

class UserSilentSetting(Base, TimestampMixin):
    __tablename__ = "user_silent_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mode: Mapped[SilentMode] = mapped_column(Enum(SilentMode, name="silent_mode_enum"), default=SilentMode.dnd, nullable=False)
    source: Mapped[SilentSource] = mapped_column(Enum(SilentSource, name="silent_source_enum"), default=SilentSource.timetable, nullable=False)
    
    minutes_before: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    minutes_after: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    allow_emergency: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    custom_ranges: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)

class AIConversation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ai_conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)

class AIMessageRole(str, enum.Enum):
    system = "SYSTEM"
    user = "USER"
    assistant = "ASSISTANT"
    tool = "TOOL"

class AIMessage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ai_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[AIMessageRole] = mapped_column(Enum(AIMessageRole, name="ai_message_role_enum"), nullable=False)
    content: Mapped[str] = mapped_column(String, nullable=False)
    tool_calls: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)
