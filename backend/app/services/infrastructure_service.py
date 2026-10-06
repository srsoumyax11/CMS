from typing import Optional, List
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.infrastructure_repository import InfrastructureRepository
from app.models.infrastructure import Building, Room, BuildingType, RoomType
from app.schemas.infrastructure import (
    BuildingCreate,
    BuildingUpdate,
    BuildingResponse,
    BuildingDetailResponse,
    RoomCreate,
    RoomUpdate,
    RoomResponse,
)

class InfrastructureService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = InfrastructureRepository(db)

    def _map_room(self, r: Room) -> RoomResponse:
        from sqlalchemy import inspect
        insp = inspect(r)
        
        building_name = None
        building_code = None
        if "building" not in insp.unloaded and r.building:
            building_name = r.building.name
            building_code = r.building.code

        department_name = None
        if "department" not in insp.unloaded and r.department:
            department_name = r.department.name

        return RoomResponse(
            id=r.id,
            building_id=r.building_id,
            building_name=building_name,
            building_code=building_code,
            room_number=r.room_number,
            floor=r.floor,
            room_type=r.room_type,
            capacity=r.capacity,
            department_id=r.department_id,
            department_name=department_name,
            is_active=r.is_active,
            created_at=r.created_at,
        )

    def _map_building(self, b: Building, include_rooms: bool = False) -> BuildingResponse | BuildingDetailResponse:
        from sqlalchemy import inspect
        insp = inspect(b)
        
        rooms_list = []
        rooms_count = 0
        if "rooms" not in insp.unloaded and b.rooms is not None:
            rooms_count = len(b.rooms)
            if include_rooms:
                rooms_list = [self._map_room(r) for r in b.rooms]

        if include_rooms:
            return BuildingDetailResponse(
                id=b.id,
                name=b.name,
                code=b.code,
                building_type=b.building_type,
                total_floors=b.total_floors,
                is_active=b.is_active,
                rooms_count=rooms_count,
                rooms=rooms_list,
                created_at=b.created_at,
            )
        return BuildingResponse(
            id=b.id,
            name=b.name,
            code=b.code,
            building_type=b.building_type,
            total_floors=b.total_floors,
            is_active=b.is_active,
            rooms_count=rooms_count,
            created_at=b.created_at,
        )

    # Buildings
    async def list_buildings(
        self,
        building_type: Optional[BuildingType] = None,
        is_active: Optional[bool] = None
    ) -> List[BuildingResponse]:
        buildings = await self.repo.list_buildings(building_type, is_active)
        return [self._map_building(b) for b in buildings]

    async def get_building(self, building_id: UUID) -> BuildingDetailResponse:
        b = await self.repo.get_building_by_id(building_id)
        if not b:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Building not found"
            )
        return self._map_building(b, include_rooms=True)

    async def create_building(self, data: BuildingCreate) -> BuildingResponse:
        existing = await self.repo.get_building_by_code(data.code.strip().upper())
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Building with code '{data.code.strip().upper()}' already exists"
            )

        b = Building(
            name=data.name.strip(),
            code=data.code.strip().upper(),
            building_type=data.building_type,
            total_floors=data.total_floors,
            is_active=data.is_active,
        )
        created = await self.repo.create_building(b)
        await self.db.commit()
        return self._map_building(created)

    async def update_building(self, building_id: UUID, data: BuildingUpdate) -> BuildingResponse:
        b = await self.repo.get_building_by_id(building_id)
        if not b:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Building not found")

        if data.code is not None:
            code_clean = data.code.strip().upper()
            if code_clean != b.code:
                existing = await self.repo.get_building_by_code(code_clean)
                if existing:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Building code '{code_clean}' already in use")
                b.code = code_clean

        if data.name is not None:
            b.name = data.name.strip()
        if data.building_type is not None:
            b.building_type = data.building_type
        if data.total_floors is not None:
            b.total_floors = data.total_floors
        if data.is_active is not None:
            b.is_active = data.is_active

        await self.db.commit()
        return self._map_building(b)

    # Rooms
    async def list_rooms(
        self,
        building_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        room_type: Optional[RoomType] = None,
        is_active: Optional[bool] = None
    ) -> List[RoomResponse]:
        rooms = await self.repo.list_rooms(building_id, department_id, room_type, is_active)
        return [self._map_room(r) for r in rooms]

    async def get_room(self, room_id: UUID) -> RoomResponse:
        r = await self.repo.get_room_by_id(room_id)
        if not r:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
        return self._map_room(r)

    async def create_room(self, data: RoomCreate) -> RoomResponse:
        b = await self.repo.get_building_by_id(data.building_id)
        if not b:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Building not found")

        existing = await self.repo.get_room_by_number(data.building_id, data.room_number.strip())
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room '{data.room_number.strip()}' already exists in building '{b.name}'"
            )

        r = Room(
            building_id=data.building_id,
            room_number=data.room_number.strip(),
            floor=data.floor,
            room_type=data.room_type,
            capacity=data.capacity,
            department_id=data.department_id,
            is_active=data.is_active,
        )
        created = await self.repo.create_room(r)
        await self.db.commit()

        loaded = await self.repo.get_room_by_id(created.id)
        return self._map_room(loaded or created)

    async def update_room(self, room_id: UUID, data: RoomUpdate) -> RoomResponse:
        r = await self.repo.get_room_by_id(room_id)
        if not r:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

        if data.room_number is not None:
            rn_clean = data.room_number.strip()
            if rn_clean != r.room_number:
                existing = await self.repo.get_room_by_number(r.building_id, rn_clean)
                if existing:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Room number '{rn_clean}' already exists in this building")
                r.room_number = rn_clean

        if data.floor is not None:
            r.floor = data.floor
        if data.room_type is not None:
            r.room_type = data.room_type
        if data.capacity is not None:
            r.capacity = data.capacity
        if data.department_id is not None:
            r.department_id = data.department_id
        if data.is_active is not None:
            r.is_active = data.is_active

        await self.db.commit()
        loaded = await self.repo.get_room_by_id(r.id)
        return self._map_room(loaded or r)
