from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Tuple, Optional
from uuid import UUID

from app.repositories.base_repository import GenericRepository
from app.models.timetable import AttendanceSession, AttendanceRecord

class AttendanceSessionRepository(GenericRepository[AttendanceSession]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, AttendanceSession)

class AttendanceRecordRepository(GenericRepository[AttendanceRecord]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, AttendanceRecord)

    async def get_student_records(self, student_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[AttendanceRecord], int]:
        stmt = select(AttendanceRecord).where(AttendanceRecord.student_user_id == student_id)
        count_stmt = select(func.count(AttendanceRecord.id)).where(AttendanceRecord.student_user_id == student_id)
        
        total = await self.db.scalar(count_stmt)
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), total or 0
