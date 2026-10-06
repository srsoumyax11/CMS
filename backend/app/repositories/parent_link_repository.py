from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, desc
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parent_link import ParentLinkRequest, ParentLinkStatus
from app.models.user import User
from app.repositories.base_repository import GenericRepository

class ParentLinkRepository(GenericRepository[ParentLinkRequest]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, ParentLinkRequest)

    async def get_by_parent_and_student(self, parent_user_id: UUID, student_id: UUID) -> Optional[ParentLinkRequest]:
        stmt = select(ParentLinkRequest).options(
            joinedload(ParentLinkRequest.parent_user),
            joinedload(ParentLinkRequest.student_user).joinedload(User.student_profile)
        ).where(
            ParentLinkRequest.parent_user_id == parent_user_id,
            ParentLinkRequest.student_id == student_id
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_approved_link_for_parent(self, parent_user_id: UUID) -> Optional[ParentLinkRequest]:
        stmt = select(ParentLinkRequest).options(
            joinedload(ParentLinkRequest.parent_user),
            joinedload(ParentLinkRequest.student_user).joinedload(User.student_profile)
        ).where(
            ParentLinkRequest.parent_user_id == parent_user_id,
            ParentLinkRequest.status == ParentLinkStatus.approved
        ).order_by(desc(ParentLinkRequest.updated_at))
        
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_by_student(self, student_id: UUID) -> List[ParentLinkRequest]:
        stmt = select(ParentLinkRequest).options(
            joinedload(ParentLinkRequest.parent_user),
            joinedload(ParentLinkRequest.student_user).joinedload(User.student_profile)
        ).where(
            ParentLinkRequest.student_id == student_id
        ).order_by(desc(ParentLinkRequest.created_at))
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

