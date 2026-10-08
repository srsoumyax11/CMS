from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base_repository import GenericRepository
from app.models.settings import SystemSetting, UserSilentSetting

class SystemSettingRepository(GenericRepository[SystemSetting]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, SystemSetting)

    async def get_by_key(self, key: str) -> Optional[SystemSetting]:
        stmt = select(SystemSetting).where(SystemSetting.key == key)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_public_settings(self) -> List[SystemSetting]:

        stmt = select(SystemSetting).where(SystemSetting.is_public.is_(True))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_category(self, category: str) -> List[SystemSetting]:
        stmt = select(SystemSetting).where(SystemSetting.category == category)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

class UserSilentSettingRepository(GenericRepository[UserSilentSetting]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, UserSilentSetting)

    async def get_by_user_id(self, user_id: UUID) -> Optional[UserSilentSetting]:
        stmt = select(UserSilentSetting).where(UserSilentSetting.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
