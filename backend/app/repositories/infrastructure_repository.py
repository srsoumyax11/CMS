from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.repositories.base_repository import GenericRepository
from app.models.infrastructure import Building, Room, BuildingType, RoomType
from app.models.academic import Department

class InfrastructureRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ==========================
    # BUILDINGS
    # ==========================
    async def list_buildings(
        self,
        building_type: Optional[BuildingType] = None,
        is_active: Optional[bool] = None
    ) -> List[Building]:
        filters = []
        if building_type:
            filters.append(Building.building_type == building_type)
        if is_active is not None:
            filters.append(Building.is_active == is_active)

        stmt = (
            select(Building)
            .options(selectinload(Building.rooms))
            .order_by(Building.name.asc())
        )
        if filters:
            stmt = stmt.where(and_(*filters))

        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_building_by_id(self, building_id: UUID) -> Optional[Building]:
        stmt = (
            select(Building)
            .where(Building.id == building_id)
            .options(selectinload(Building.rooms).selectinload(Room.department))
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_building_by_code(self, code: str) -> Optional[Building]:
        stmt = select(Building).where(Building.code == code)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_building(self, building: Building) -> Building:
        self.db.add(building)
        await self.db.flush()
        return building

    # ==========================
    # ROOMS
    # ==========================
    async def list_rooms(
        self,
        building_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        room_type: Optional[RoomType] = None,
        is_active: Optional[bool] = None
    ) -> List[Room]:
        filters = []
        if building_id:
            filters.append(Room.building_id == building_id)
        if department_id:
            filters.append(Room.department_id == department_id)
        if room_type:
            filters.append(Room.room_type == room_type)
        if is_active is not None:
            filters.append(Room.is_active == is_active)

        stmt = (
            select(Room)
            .options(
                selectinload(Room.building),
                selectinload(Room.department)
            )
            .order_by(Room.floor.asc(), Room.room_number.asc())
        )
        if filters:
            stmt = stmt.where(and_(*filters))

        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_room_by_id(self, room_id: UUID) -> Optional[Room]:
        stmt = (
            select(Room)
            .where(Room.id == room_id)
            .options(
                selectinload(Room.building),
                selectinload(Room.department)
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_room_by_number(self, building_id: UUID, room_number: str) -> Optional[Room]:
        stmt = (
            select(Room)
            .where(and_(Room.building_id == building_id, Room.room_number == room_number))
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_room(self, room: Room) -> Room:
        self.db.add(room)
        await self.db.flush()
        return room
