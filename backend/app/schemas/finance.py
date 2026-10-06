import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional
from app.models.finance import FeeStatus

class FeeDueResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    description: str
    total_amount: float
    paid_amount: float
    due_date: datetime
    status: FeeStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FeeDueCreate(BaseModel):
    student_id: uuid.UUID
    description: str = Field(..., min_length=3, max_length=255)
    total_amount: float = Field(..., gt=0)
    due_date: datetime

class FeeDueUpdate(BaseModel):
    paid_amount: Optional[float] = None
    status: Optional[FeeStatus] = None
