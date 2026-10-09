from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.ai import (
    AIConversationCreate, AIConversationResponse, AIConversationListResponse,
    AIMessageCreate, AIMessageResponse, AIMessageListResponse
)
from app.services.ai_service import AIService

router = APIRouter(tags=["AI Assistant"])

@router.post(
    "/conversations",
    summary="Start New AI Chat Session",
    description="Creates a new conversation context with CampusOne AI Assistant.",
    response_model=APIResponse[AIConversationResponse]
)
async def create_conversation(
    req: AIConversationCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AIService(uow)
    conv = await service.create_conversation(current_user.id, req)
    return APIResponse(success=True, data=AIConversationResponse.model_validate(conv))

@router.get(
    "/conversations",
    summary="List User AI Conversations",
    description="Retrieves active and past AI chat sessions for the authenticated user.",
    response_model=APIResponse[AIConversationListResponse]
)
async def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AIService(uow)
    items, total = await service.list_conversations(current_user.id, skip=skip, limit=limit)
    res_items = [AIConversationResponse.model_validate(item) for item in items]
    return APIResponse(success=True, data=AIConversationListResponse(total=total, items=res_items))

@router.get(
    "/conversations/{conv_id}/messages",
    summary="Get Conversation Messages",
    description="Fetch full message trajectory and chat history for a specific conversation.",
    response_model=APIResponse[AIMessageListResponse]
)
async def get_messages(
    conv_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AIService(uow)
    try:
        messages = await service.get_messages(conv_id, current_user.id)
        res_items = [AIMessageResponse.model_validate(m) for m in messages]
        return APIResponse(success=True, data=AIMessageListResponse(items=res_items))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post(
    "/conversations/{conv_id}/messages",
    summary="Send Message to Campus AI Assistant",
    description="Sends a query to the AI assistant and receives contextual campus intelligence.",
    response_model=APIResponse[AIMessageResponse]
)
async def send_message(
    conv_id: UUID,
    req: AIMessageCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AIService(uow)
    try:
        assistant_reply = await service.send_message(current_user.id, conv_id, req)
        return APIResponse(success=True, data=AIMessageResponse.model_validate(assistant_reply))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
