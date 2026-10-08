from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import time
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import GenericRepository
from app.models.timetable import TimetableSlot, TimetableException, DayOfWeek

class TimetableSlotRepository(GenericRepository[TimetableSlot]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, TimetableSlot)

    async def find_clashes(
        self,
        term_id: UUID,
        day_of_week: DayOfWeek,
        start_time: time,
        end_time: time,
        faculty_user_id: UUID,
        class_group_id: UUID,
        room_location_id: Optional[UUID] = None,
        exclude_slot_id: Optional[UUID] = None
    ) -> List[TimetableSlot]:
        """
        Finds any active timetable slot that conflicts in time for:
        1. Same faculty_user_id
        2. Same class_group_id
        3. Same room_location_id (if provided)
        within the given term and day_of_week.
        
        Time overlap condition: existing.start_time < new.end_time AND existing.end_time > new.start_time
        """
        stmt = select(TimetableSlot).where(
            TimetableSlot.term_id == term_id,
            TimetableSlot.day_of_week == day_of_week,
            TimetableSlot.status.is_(True),
            TimetableSlot.start_time < end_time,
            TimetableSlot.end_time > start_time,
        )

        conflict_conditions = [
            TimetableSlot.faculty_user_id == faculty_user_id,
            TimetableSlot.class_group_id == class_group_id,
        ]
        if room_location_id is not None:
            conflict_conditions.append(TimetableSlot.room_location_id == room_location_id)

        stmt = stmt.where(or_(*conflict_conditions))

        if exclude_slot_id:
            stmt = stmt.where(TimetableSlot.id != exclude_slot_id)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

class TimetableExceptionRepository(GenericRepository[TimetableException]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, TimetableException)
