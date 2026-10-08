from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.repositories.base_repository import GenericRepository

class NotificationRepository(GenericRepository[Notification]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Notification)

    async def list_by_user(self, user_id: str, limit: int = 50) -> List[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id).order_by(desc(Notification.created_at)).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_unread_count(self, user_id: str) -> int:
        stmt = select(func.count()).where(Notification.user_id == user_id, Notification.is_read == False)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_by_id(self, notification_id: UUID) -> Optional[Notification]:
        stmt = select(Notification).where(Notification.id == notification_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_unread_by_user(self, user_id: str) -> List[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id, Notification.is_read == False)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
