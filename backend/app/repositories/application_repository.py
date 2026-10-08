from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.models.application import RoleApplication
from app.repositories.base_repository import GenericRepository

class RoleApplicationRepository(GenericRepository[RoleApplication]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, RoleApplication)

    async def get_pending_by_user(self, user_id: UUID) -> Optional[RoleApplication]:
        stmt = select(RoleApplication).where(
            RoleApplication.user_id == user_id,
            RoleApplication.status == "SUBMITTED"
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
