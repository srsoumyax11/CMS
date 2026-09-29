from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class NoticeResponse(BaseModel):
    id: UUID
    title: str
    content: str
    author_id: UUID
    attachment_url: Optional[str] = None
    target_course_id: Optional[UUID] = None
    target_department_id: Optional[UUID] = None
    target_year: Optional[int] = None
    target_hostel: Optional[str] = None
    target_user_types: Optional[str] = None
    is_read: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class NoticeListResponse(BaseModel):
    total: int
    items: list[NoticeResponse]
