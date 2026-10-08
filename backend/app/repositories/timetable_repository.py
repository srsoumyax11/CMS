from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base_repository import GenericRepository
from app.models.timetable import TimetableSlot, TimetableException

class TimetableSlotRepository(GenericRepository[TimetableSlot]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, TimetableSlot)

class TimetableExceptionRepository(GenericRepository[TimetableException]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, TimetableException)
