from typing import Tuple, List
from uuid import UUID

from app.models.user import User
from app.models.notification import Notification
from app.repositories.notification_repository import NotificationRepository
from app.core.uow import UnitOfWork

class NotificationService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.db = uow.db
        self.repository = NotificationRepository(self.db)

    async def list_my_notifications(self, current_user: User) -> Tuple[List[Notification], int]:
        items = await self.repository.list_by_user(current_user.id)
        unread_count = await self.repository.get_unread_count(current_user.id)
        return items, unread_count

    async def mark_notification_read(self, notification_id: UUID, current_user: User) -> Notification:
        notification = await self.repository.get_by_id(notification_id)
        if not notification or notification.user_id != current_user.id:
            raise ValueError("Notification not found")
            
        notification.is_read = True
        await self.db.flush()
        await self.db.refresh(notification)
        return notification

    async def mark_all_notifications_read(self, current_user: User) -> None:
        notifications = await self.repository.get_unread_by_user(current_user.id)
        for notification in notifications:
            notification.is_read = True
        await self.db.flush()
