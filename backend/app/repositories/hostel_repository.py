from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.repositories.base_repository import GenericRepository
from app.models.hostel import Hostel, HostelRoom

class HostelRepository(GenericRepository[Hostel]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Hostel)

    async def get_by_name(self, name: str) -> Optional[Hostel]:
        stmt = select(Hostel).where(Hostel.name == name)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

class HostelRoomRepository(GenericRepository[HostelRoom]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, HostelRoom)

    async def get_room_by_number(self, hostel_id: UUID, room_number: str) -> Optional[HostelRoom]:
        stmt = select(HostelRoom).where(
            HostelRoom.hostel_id == hostel_id,
            HostelRoom.room_number == room_number
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_hostel_rooms(self, hostel_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[HostelRoom], int]:
        stmt = select(HostelRoom).where(HostelRoom.hostel_id == hostel_id).order_by(HostelRoom.room_number.asc())
        count_stmt = select(func.count()).select_from(HostelRoom).where(HostelRoom.hostel_id == hostel_id)
        count = await self.db.scalar(count_stmt)

        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), count or 0
