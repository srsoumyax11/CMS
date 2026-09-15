import enum
import uuid
import datetime
from sqlalchemy import String, Enum, ForeignKey, Date, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin

class MealType(str, enum.Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    snacks = "snacks"
    dinner = "dinner"

class DayOfWeek(str, enum.Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"
    saturday = "saturday"
    sunday = "sunday"

class MessMenu(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "mess_menu"

    day_of_week: Mapped[DayOfWeek] = mapped_column(Enum(DayOfWeek, name="day_of_week_enum"), nullable=False)
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType, name="meal_type_enum"), nullable=False)
    items: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint('day_of_week', 'meal_type', name='uq_mess_menu_day_meal'),
    )

class MessFeedback(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "mess_feedback"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType, name="meal_type_enum", create_type=False), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint('student_id', 'date', 'meal_type', name='uq_mess_feedback_student_date_meal'),
    )

class MessOptOut(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "mess_optout"

    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType, name="meal_type_enum", create_type=False), nullable=False, index=True)

    user: Mapped["User"] = relationship("User")

    __table_args__ = (
        UniqueConstraint('student_id', 'date', 'meal_type', name='uq_mess_optout_student_date_meal'),
    )
