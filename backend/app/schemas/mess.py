import uuid
import datetime
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional
from zoneinfo import ZoneInfo
from app.models.mess import MealType, DayOfWeek

IST = ZoneInfo("Asia/Kolkata")

def today_ist() -> datetime.date:
    return datetime.datetime.now(IST).date()

# ================= Mess Menu Schemas =================

class MessMenuCreate(BaseModel):
    day_of_week: DayOfWeek
    meal_type: MealType
    items: str = Field(..., min_length=2, max_length=1000)

class MessMenuResponse(BaseModel):
    id: uuid.UUID
    day_of_week: DayOfWeek
    meal_type: MealType
    items: str

    class Config:
        from_attributes = True

# ================= Mess Feedback Schemas =================

class MessFeedbackCreate(BaseModel):
    date: datetime.date
    meal_type: MealType
    rating: int = Field(..., description="Rating from 1 to 5")
    comments: Optional[str] = Field(None, max_length=500)

    @field_validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be strictly between 1 and 5.')
        return v

    @model_validator(mode='after')
    def validate_date_not_future(self) -> 'MessFeedbackCreate':
        if self.date > today_ist():
            raise ValueError('Cannot submit feedback for a future date.')
        return self


class MessFeedbackResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    date: datetime.date
    meal_type: MealType
    rating: int
    comments: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ================= Mess OptOut Schemas =================

class MessOptOutCreate(BaseModel):
    date: datetime.date
    meal_type: MealType

    @model_validator(mode='after')
    def validate_date_not_past(self) -> 'MessOptOutCreate':
        if self.date < today_ist():
            raise ValueError('Cannot opt-out of a past date.')
        return self

class MessOptOutResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    date: datetime.date
    meal_type: MealType
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# ================= Mess Analytics Schemas =================

class MealRatingAgg(BaseModel):
    meal_type: MealType
    average_rating: float
    total_reviews: int

class OptOutAgg(BaseModel):
    date: datetime.date
    meal_type: MealType
    total_opt_outs: int

class MessAnalyticsResponse(BaseModel):
    today_average_ratings: List[MealRatingAgg]
    opt_outs_today_tomorrow: List[OptOutAgg]


# ================= Mess Scan Verification Schemas =================

class MessScanRequest(BaseModel):
    student_identifier: str  # Roll number, student email, or user UUID
    meal_type: MealType

class MessScanResponse(BaseModel):
    success: bool
    message: str
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    meal_type: MealType
    scanned_at: datetime.datetime

