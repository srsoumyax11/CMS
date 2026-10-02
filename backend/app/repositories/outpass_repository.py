from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, or_, and_, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outpass import Outpass, OutpassStatus, OutpassStatusLog
from app.models.user import User
from app.models.profiles import StudentProfile
from app.repositories.base_repository import GenericRepository

class OutpassRepository(GenericRepository[Outpass]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Outpass)

    async def get_overlapping(self, student_id: UUID, departure_time: datetime, expected_return_time: datetime) -> Optional[Outpass]:
        stmt = select(Outpass).where(
            Outpass.student_id == student_id,
            Outpass.status.in_([OutpassStatus.pending, OutpassStatus.approved, OutpassStatus.active]),
            Outpass.departure_time < expected_return_time,
            Outpass.expected_return_time > departure_time
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_student(self, student_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[Outpass], int]:
        count_stmt = select(func.count()).where(Outpass.student_id == student_id)
        total = await self.db.scalar(count_stmt)

        stmt = select(Outpass).where(
            Outpass.student_id == student_id
        ).order_by(desc(Outpass.created_at)).offset(skip).limit(limit)
        
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        return items, total

    async def list_all(
        self, 
        status: Optional[OutpassStatus] = None, 
        is_overdue: Optional[bool] = None, 
        skip: int = 0, 
        limit: int = 100
    ) -> Tuple[List[Outpass], int]:
        from sqlalchemy.orm import joinedload
        stmt = select(Outpass).options(
            joinedload(Outpass.student).joinedload(User.student_profile).joinedload(StudentProfile.course)
        )
        count_stmt = select(func.count(Outpass.id))
        
        if status:
            stmt = stmt.where(Outpass.status == status)
            count_stmt = count_stmt.where(Outpass.status == status)
            
        if is_overdue is not None:
            now = datetime.now(timezone.utc)
            if is_overdue:
                overdue_cond = or_(
                    and_(Outpass.status == OutpassStatus.active, Outpass.expected_return_time < now),
                    and_(Outpass.status == OutpassStatus.completed, Outpass.actual_return_time > Outpass.expected_return_time)
                )
                stmt = stmt.where(overdue_cond)
                count_stmt = count_stmt.where(overdue_cond)
            else:
                not_overdue_cond = or_(
                    and_(Outpass.status == OutpassStatus.active, Outpass.expected_return_time >= now),
                    and_(Outpass.status == OutpassStatus.completed, Outpass.actual_return_time <= Outpass.expected_return_time),
                    Outpass.status.in_([OutpassStatus.pending, OutpassStatus.approved, OutpassStatus.rejected, OutpassStatus.cancelled])
                )
                stmt = stmt.where(not_overdue_cond)
                count_stmt = count_stmt.where(not_overdue_cond)

        total = await self.db.scalar(count_stmt)

        stmt = stmt.order_by(desc(Outpass.created_at)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        return items, total

    async def get_with_student(self, id: UUID) -> Optional[Outpass]:
        stmt = select(Outpass).options(selectinload(Outpass.student)).where(Outpass.id == id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
