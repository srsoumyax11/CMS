from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from datetime import datetime

from app.core.uow import UnitOfWork
from app.models.ai import AIConversation, AIMessage, AIMessageRole
from app.schemas.ai import AIConversationCreate, AIMessageCreate

class AIService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_conversation(self, user_id: UUID, req: AIConversationCreate) -> AIConversation:
        async with self.uow.transaction() as u:
            conv = AIConversation(
                user_id=user_id,
                title=req.title or "Campus Query"
            )
            created_conv = await u.ai_conversations.create(conv)

            # Insert system prompt context
            sys_msg = AIMessage(
                conversation_id=created_conv.id,
                role=AIMessageRole.system,
                content="You are CampusOne AI Assistant, helpful, friendly, and knowledgeable about academic schedules, notices, complaints, hostels, and campus navigation."
            )
            await u.ai_messages.create(sys_msg)
            return created_conv

    async def list_conversations(self, user_id: UUID, skip: int = 0, limit: int = 50) -> Tuple[List[AIConversation], int]:
        async with self.uow.transaction() as u:
            return await u.ai_conversations.list_user_conversations(user_id=user_id, skip=skip, limit=limit)

    async def get_messages(self, conversation_id: UUID, user_id: UUID) -> List[AIMessage]:
        async with self.uow.transaction() as u:
            conv = await u.ai_conversations.get_by_id(conversation_id)
            if not conv or conv.user_id != user_id:
                raise ValueError("Conversation not found or access denied.")
            return await u.ai_messages.get_conversation_messages(conversation_id)

    async def send_message(self, user_id: UUID, conversation_id: UUID, req: AIMessageCreate) -> AIMessage:
        async with self.uow.transaction() as u:
            conv = await u.ai_conversations.get_by_id(conversation_id)
            if not conv or conv.user_id != user_id:
                raise ValueError("Conversation not found or access denied.")

            # 1. Save User Message
            user_msg = AIMessage(
                conversation_id=conversation_id,
                role=AIMessageRole.user,
                content=req.content
            )
            await u.ai_messages.create(user_msg)

            # 2. Build Context Aware Response
            prompt_lower = req.content.lower()
            response_text = ""

            if "schedule" in prompt_lower or "class" in prompt_lower or "timetable" in prompt_lower:
                slots, _ = await u.timetable_slots.list(limit=5)
                response_text = f"You have {len(slots)} class slots scheduled in the timetable catalog. Check your Silent Mode calendar feed or Timetable tab for complete details!"
            elif "map" in prompt_lower or "navigate" in prompt_lower or "room" in prompt_lower or "building" in prompt_lower:
                locations, _ = await u.map_locations.list(limit=5)
                loc_names = [str(loc.name) for loc in locations] if locations else ["Main Academic Block"]
                response_text = f"Campus Navigation Active: Key locations near you include {', '.join(loc_names)}. Use our interactive Dijkstra navigation route tool under the Map tab to get step-by-step walking directions!"
            elif "notice" in prompt_lower or "announcement" in prompt_lower:
                notices, _ = await u.notices.list(limit=3)
                titles = [str(n.title) for n in notices] if notices else ["No active high priority notices today."]
                response_text = f"Latest Announcements: {'; '.join(titles)}"
            elif "hostel" in prompt_lower or "room" in prompt_lower:
                hostels, _ = await u.hostels.list(limit=3)
                h_names = [str(h.name) for h in hostels] if hostels else ["Boys Hostel 1", "Girls Hostel 1"]
                response_text = f"Hostel Infrastructure: Campus hostels include {', '.join(h_names)}. For room allocations or gate passes, visit your Hostel Portal."
            else:
                response_text = f"I am your CampusOne AI Assistant. How can I assist you with your academic schedule, hostel allocation, gate pass requests, digital notices, or campus map navigation?"

            # 3. Save Assistant Message
            assistant_msg = AIMessage(
                conversation_id=conversation_id,
                role=AIMessageRole.assistant,
                content=response_text
            )
            return await u.ai_messages.create(assistant_msg)
