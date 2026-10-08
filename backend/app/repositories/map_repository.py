from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.repositories.base_repository import GenericRepository
from app.models.map import MapLocation, MapPath, LocationType

class MapLocationRepository(GenericRepository[MapLocation]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, MapLocation)

    async def get_by_code(self, code: str) -> Optional[MapLocation]:
        stmt = select(MapLocation).where(MapLocation.code == code)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_locations(
        self,
        location_type: Optional[LocationType] = None,
        floor: Optional[int] = None,
        parent_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[MapLocation], int]:
        stmt = select(MapLocation).where(MapLocation.status.is_(True))
        count_stmt = select(func.count()).select_from(MapLocation).where(MapLocation.status.is_(True))

        if location_type:
            stmt = stmt.where(MapLocation.type == location_type)
            count_stmt = count_stmt.where(MapLocation.type == location_type)
        if floor is not None:
            stmt = stmt.where(MapLocation.floor == floor)
            count_stmt = count_stmt.where(MapLocation.floor == floor)
        if parent_id:
            stmt = stmt.where(MapLocation.parent_id == parent_id)
            count_stmt = count_stmt.where(MapLocation.parent_id == parent_id)

        stmt = stmt.order_by(MapLocation.name.asc())
        count = await self.db.scalar(count_stmt)
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), count or 0

class MapPathRepository(GenericRepository[MapPath]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, MapPath)

    async def get_all_accessible_paths(self) -> List[MapPath]:
        stmt = select(MapPath).where(MapPath.accessible.is_(True))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
