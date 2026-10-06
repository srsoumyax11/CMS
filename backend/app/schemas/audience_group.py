from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class AudienceFilterRules(BaseModel):
    course_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    year: Optional[int] = Field(None, ge=1, le=7)
    hostel: Optional[str] = Field(None, max_length=100)
    user_types: Optional[str] = Field(None, description="Comma-separated user types, e.g. 'student', 'faculty'")

class AudienceGroupCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    filter_rules: Optional[AudienceFilterRules] = None
    initial_member_ids: Optional[List[UUID]] = None

class AudienceGroupUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    filter_rules: Optional[AudienceFilterRules] = None

class AudienceGroupMemberAddRequest(BaseModel):
    user_ids: List[UUID] = Field(..., min_length=1)

class AudienceGroupReapplyFilterRequest(BaseModel):
    keep_manual: bool = True

class AudienceGroupMemberItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    email: str
    user_type: str
    department_name: Optional[str] = None
    course_name: Optional[str] = None
    year: Optional[int] = None
    hostel: Optional[str] = None
    added_manually: bool
    added_at: datetime
    matches_filter: bool

    model_config = ConfigDict(from_attributes=True)

class AudienceGroupDetailResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    created_by_id: UUID
    created_by_name: Optional[str] = None
    filter_course_id: Optional[UUID] = None
    filter_course_name: Optional[str] = None
    filter_department_id: Optional[UUID] = None
    filter_department_name: Optional[str] = None
    filter_year: Optional[int] = None
    filter_hostel: Optional[str] = None
    filter_user_types: Optional[str] = None
    member_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AudienceGroupReapplyResponse(BaseModel):
    group_id: UUID
    previous_count: int
    new_count: int
    added_count: int
    removed_count: int
