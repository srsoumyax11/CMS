from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from sqlalchemy import select

from app.core.uow import UnitOfWork
from app.models.hostel import Hostel, HostelRoom
from app.models.profiles import StudentProfile
from app.schemas.hostel import (
    HostelCreate, HostelUpdate,
    HostelRoomCreate, HostelRoomUpdate,
    RoomAllocationRequest, RoomAllocationResponse
)

class HostelService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_hostel(self, hostel_in: HostelCreate) -> Hostel:
        async with self.uow.transaction() as u:
            existing = await u.hostels.get_by_name(hostel_in.name)
            if existing:
                raise ValueError(f"Hostel with name '{hostel_in.name}' already exists.")

            hostel = Hostel(
                name=hostel_in.name,
                warden_user_id=hostel_in.warden_user_id,
                capacity=hostel_in.capacity,
                status=hostel_in.status
            )
            return await u.hostels.create(hostel)

    async def update_hostel(self, hostel_id: UUID, hostel_in: HostelUpdate) -> Hostel:
        async with self.uow.transaction() as u:
            hostel = await u.hostels.get_by_id(hostel_id)
            if not hostel:
                raise ValueError("Hostel not found.")
            return await u.hostels.update(hostel, hostel_in.model_dump(exclude_unset=True))

    async def list_hostels(self, skip: int = 0, limit: int = 100) -> Tuple[List[Hostel], int]:
        async with self.uow.transaction() as u:
            return await u.hostels.list(skip=skip, limit=limit)

    async def get_hostel(self, hostel_id: UUID) -> Hostel:
        async with self.uow.transaction() as u:
            hostel = await u.hostels.get_by_id(hostel_id)
            if not hostel:
                raise ValueError("Hostel not found.")
            return hostel

    async def create_room(self, hostel_id: UUID, room_in: HostelRoomCreate) -> HostelRoom:
        async with self.uow.transaction() as u:
            hostel = await u.hostels.get_by_id(hostel_id)
            if not hostel:
                raise ValueError("Hostel not found.")

            existing = await u.hostel_rooms.get_room_by_number(hostel_id, room_in.room_number)
            if existing:
                raise ValueError(f"Room '{room_in.room_number}' already exists in this hostel.")

            room = HostelRoom(
                hostel_id=hostel_id,
                room_number=room_in.room_number,
                capacity=room_in.capacity,
                current_occupancy=0,
                status=room_in.status
            )
            return await u.hostel_rooms.create(room)

    async def list_rooms(self, hostel_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[HostelRoom], int]:
        async with self.uow.transaction() as u:
            return await u.hostel_rooms.list_hostel_rooms(hostel_id, skip=skip, limit=limit)

    async def allocate_room(self, req: RoomAllocationRequest) -> RoomAllocationResponse:
        async with self.uow.transaction() as u:
            # Check student profile
            stmt = select(StudentProfile).where(StudentProfile.user_id == req.student_user_id)
            res = await u.db.execute(stmt)
            profile = res.scalar_one_or_none()
            if not profile:
                raise ValueError("Student profile not found.")

            # Check room
            room = await u.hostel_rooms.get_room_by_number(req.hostel_id, req.room_number)
            if not room or not room.status:
                raise ValueError("Specified hostel room is invalid or inactive.")

            if room.current_occupancy >= room.capacity:
                raise ValueError(f"Room '{req.room_number}' is fully occupied ({room.current_occupancy}/{room.capacity}).")

            # Deallocate previous room if any
            if profile.hostel_id and profile.room_number:
                prev_room = await u.hostel_rooms.get_room_by_number(profile.hostel_id, profile.room_number)
                if prev_room and prev_room.current_occupancy > 0:
                    prev_room.current_occupancy -= 1
                    await u.hostel_rooms.update(prev_room, {})

            profile.hostel_id = req.hostel_id
            profile.room_number = req.room_number

            room.current_occupancy += 1
            await u.hostel_rooms.update(room, {})

            return RoomAllocationResponse(
                success=True,
                message=f"Room '{req.room_number}' allocated successfully.",
                student_user_id=req.student_user_id,
                hostel_id=req.hostel_id,
                room_number=req.room_number
            )

    async def deallocate_room(self, student_user_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            stmt = select(StudentProfile).where(StudentProfile.user_id == student_user_id)
            res = await u.db.execute(stmt)
            profile = res.scalar_one_or_none()
            if not profile:
                raise ValueError("Student profile not found.")

            if profile.hostel_id and profile.room_number:
                room = await u.hostel_rooms.get_room_by_number(profile.hostel_id, profile.room_number)
                if room and room.current_occupancy > 0:
                    room.current_occupancy -= 1
                    await u.hostel_rooms.update(room, {})

                profile.hostel_id = None
                profile.room_number = None

            return True
