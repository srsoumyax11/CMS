from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime
from app.models.ai import AIMessageRole

class AIConversationCreate(BaseModel):
    title: Optional[str] = Field("New Conversation", max_length=255)

class AIConversationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AIConversationListResponse(BaseModel):
    total: int
    items: List[AIConversationResponse]

class AIMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class AIMessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: AIMessageRole
    content: str
    tool_calls: Optional[Any] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AIMessageListResponse(BaseModel):
    items: List[AIMessageResponse]
