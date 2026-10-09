import uuid
from typing import Optional, Any
from sqlalchemy import String, Enum, ForeignKey, Float, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin
import enum

class LocationType(str, enum.Enum):
    building = "BUILDING"
    classroom = "CLASSROOM"
    lab = "LAB"
    hostel = "HOSTEL"
    library = "LIBRARY"
    canteen = "CANTEEN"
    gate = "GATE"
    office = "OFFICE"
    ground = "GROUND"
    parking = "PARKING"
    stairs = "STAIRS"
    elevator = "ELEVATOR"
    other = "OTHER"

class MapLocation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "map_locations"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    type: Mapped[LocationType] = mapped_column(Enum(LocationType, name="location_type_enum"), index=True, nullable=False)
    
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("map_locations.id", ondelete="SET NULL"), index=True, nullable=True)
    floor: Mapped[Optional[int]] = mapped_column(Integer, index=True, nullable=True)
    
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    geometry: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True) # GeoJSON
    
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class MapPath(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "map_paths"

    from_location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("map_locations.id", ondelete="CASCADE"), index=True, nullable=False)
    to_location_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("map_locations.id", ondelete="CASCADE"), index=True, nullable=False)
    distance_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    path_geojson: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    accessible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

