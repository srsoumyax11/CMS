from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import TimetableSlot

class TimetableRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def get_by_id(self, slot_id: UUID) -> Optional[TimetableSlot]:
        result = await self.db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
        return result.scalar_one_or_none()

    async def list_all(self) -> List[TimetableSlot]:
        result = await self.db.execute(select(TimetableSlot))
        return list(result.scalars().all())
        
    async def list_by_faculty(self, faculty_id: UUID) -> List[TimetableSlot]:
        result = await self.db.execute(
            select(TimetableSlot).where(TimetableSlot.faculty_id == faculty_id)
        )
        return list(result.scalars().all())
        
    async def list_by_student_course(self, course_id: UUID, department_id: UUID, year: int) -> List[TimetableSlot]:
        result = await self.db.execute(
            select(TimetableSlot).where(
                TimetableSlot.course_id == course_id,
                TimetableSlot.department_id == department_id,
                TimetableSlot.year == year
            )
        )
        return list(result.scalars().all())

    async def get_overlapping(
        self, 
        faculty_id: UUID, 
        day_of_week: str, 
        start_time, 
        end_time, 
        exclude_id: Optional[UUID] = None
    ) -> Optional[TimetableSlot]:
        stmt = select(TimetableSlot).where(
            TimetableSlot.faculty_id == faculty_id,
            TimetableSlot.day_of_week == day_of_week,
            TimetableSlot.start_time < end_time,
            TimetableSlot.end_time > start_time
        )
        if exclude_id:
            stmt = stmt.where(TimetableSlot.id != exclude_id)
            
        result = await self.db.execute(stmt)
        return result.first()
