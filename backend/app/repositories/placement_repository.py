from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.repositories.base_repository import GenericRepository
from app.models.placement import PlacementNotice, PlacementApplication, PlacementStatus, ApplicationStatus

class PlacementNoticeRepository(GenericRepository[PlacementNotice]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, PlacementNotice)

    async def list_published(self, skip: int = 0, limit: int = 100) -> Tuple[List[PlacementNotice], int]:
        stmt = select(PlacementNotice).where(PlacementNotice.status == PlacementStatus.published).order_by(PlacementNotice.created_at.desc())
        
        count_stmt = select(func.count()).select_from(PlacementNotice).where(PlacementNotice.status == PlacementStatus.published)
        count = await self.db.scalar(count_stmt)

        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), count or 0

class PlacementApplicationRepository(GenericRepository[PlacementApplication]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, PlacementApplication)

    async def get_by_student_and_notice(self, student_user_id: UUID, notice_id: UUID) -> Optional[PlacementApplication]:
        stmt = select(PlacementApplication).where(
            PlacementApplication.student_user_id == student_user_id,
            PlacementApplication.notice_id == notice_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_notice_applications(self, notice_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[PlacementApplication], int]:
        stmt = select(PlacementApplication).where(PlacementApplication.notice_id == notice_id).order_by(PlacementApplication.created_at.desc())
        
        count_stmt = select(func.count()).select_from(PlacementApplication).where(PlacementApplication.notice_id == notice_id)
        count = await self.db.scalar(count_stmt)

        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), count or 0

    async def get_student_applications(self, student_user_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[PlacementApplication], int]:
        stmt = select(PlacementApplication).where(PlacementApplication.student_user_id == student_user_id).order_by(PlacementApplication.created_at.desc())
        
        count_stmt = select(func.count()).select_from(PlacementApplication).where(PlacementApplication.student_user_id == student_user_id)
        count = await self.db.scalar(count_stmt)

        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), count or 0
