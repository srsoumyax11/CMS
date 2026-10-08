from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict
from uuid import UUID
from datetime import date, datetime

class SystemSettingCreateUpdate(BaseModel):
    key: str = Field(..., max_length=100)
    value: Optional[str] = Field(None, max_length=2000)
    category: str = Field("General", max_length=50)
    data_type: str = Field("string", max_length=20)
    description: Optional[str] = Field(None, max_length=500)
    is_public: bool = False

class SystemSettingResponse(BaseModel):
    key: str
    value: Optional[str] = None
    category: str
    data_type: str
    description: Optional[str] = None
    is_public: bool

    model_config = ConfigDict(from_attributes=True)

class SystemSettingListResponse(BaseModel):
    total: int
    items: List[SystemSettingResponse]

class UserSilentSettingRequest(BaseModel):
    enabled: bool = True
    mode: str = Field("SILENT", description="SILENT, VIBRATE, DND")
    source: str = Field("TIMETABLE", description="TIMETABLE, CUSTOM, BOTH")
    minutes_before: int = Field(5, ge=0, le=60)
    minutes_after: int = Field(5, ge=0, le=60)
    allow_emergency: bool = True
    custom_ranges: Optional[List[Dict[str, Any]]] = None

class UserSilentSettingResponse(BaseModel):
    user_id: UUID
    enabled: bool
    mode: str
    source: str
    minutes_before: int
    minutes_after: int
    allow_emergency: bool
    custom_ranges: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(from_attributes=True)

class SilentScheduleItem(BaseModel):
    title: str
    start_time: str
    end_time: str
    mode: str
    location: Optional[str] = None

class SilentScheduleResponse(BaseModel):
    date: date
    items: List[SilentScheduleItem]
