from typing import List, Tuple, Optional
from uuid import UUID
from sqlalchemy import select
from app.repositories.base_repository import GenericRepository
from app.models.ai import AIConversation, AIMessage

class AIConversationRepository(GenericRepository[AIConversation]):
    def __init__(self, db):
        super().__init__(db, AIConversation)

    async def list_user_conversations(self, user_id: UUID, skip: int = 0, limit: int = 50) -> Tuple[List[AIConversation], int]:
        stmt = (
            select(AIConversation)
            .where(AIConversation.user_id == user_id)
            .order_by(AIConversation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        items = list(res.scalars().all())

        count_stmt = select(AIConversation).where(AIConversation.user_id == user_id)
        count_res = await self.db.execute(count_stmt)
        total = len(list(count_res.scalars().all()))

        return items, total

class AIMessageRepository(GenericRepository[AIMessage]):
    def __init__(self, db):
        super().__init__(db, AIMessage)

    async def get_conversation_messages(self, conversation_id: UUID) -> List[AIMessage]:
        stmt = (
            select(AIMessage)
            .where(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at.asc())
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())
