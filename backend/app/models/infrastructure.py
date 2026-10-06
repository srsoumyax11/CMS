import enum
import uuid
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.academic import Department


class BuildingType(str, enum.Enum):
    academic = "academic"
    hostel = "hostel"
    administrative = "administrative"
    facility = "facility"

class RoomType(str, enum.Enum):
    lecture_hall = "lecture_hall"
    lab = "lab"
    hostel_room = "hostel_room"
    faculty_office = "faculty_office"
    meeting_room = "meeting_room"
    other = "other"

class Building(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "buildings"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    building_type: Mapped[BuildingType] = mapped_column(Enum(BuildingType, name="building_type_enum"), nullable=False)
    total_floors: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    rooms: Mapped[List["Room"]] = relationship("Room", back_populates="building", cascade="all, delete-orphan")

class Room(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "rooms"

    building_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)
    room_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    floor: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    room_type: Mapped[RoomType] = mapped_column(Enum(RoomType, name="room_type_enum"), default=RoomType.lecture_hall, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("building_id", "room_number", name="uq_building_room_number"),
    )

    building: Mapped["Building"] = relationship("Building", back_populates="rooms")
    department: Mapped[Optional["Department"]] = relationship("Department")
