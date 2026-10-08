import uuid
from typing import Optional, Any
import enum
from sqlalchemy import String, Boolean, ForeignKey, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin

class SilentMode(str, enum.Enum):
    SILENT = "silent"
    VIBRATE = "vibrate"
    DND = "dnd"

class SilentSource(str, enum.Enum):
    TIMETABLE = "timetable"
    CUSTOM = "custom"
    BOTH = "both"

class SystemSetting(Base, TimestampMixin):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    value: Mapped[str] = mapped_column(String(2000), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="General")
    data_type: Mapped[str] = mapped_column(String(20), nullable=False, default="string")
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)

class UserSilentSetting(Base, TimestampMixin):
    __tablename__ = "user_silent_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    mode: Mapped[SilentMode] = mapped_column(Enum(SilentMode, name="silent_mode_enum", values_callable=lambda x: [e.value for e in x]), default=SilentMode.SILENT, nullable=False)
    source: Mapped[SilentSource] = mapped_column(Enum(SilentSource, name="silent_source_enum", values_callable=lambda x: [e.value for e in x]), default=SilentSource.TIMETABLE, nullable=False)
    minutes_before: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    minutes_after: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    allow_emergency: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    custom_ranges: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
