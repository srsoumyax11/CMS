from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from sqlalchemy import select

from app.core.uow import UnitOfWork
from app.models.hostel import Hostel, HostelRoom
from app.models.profiles import StudentProfile
from app.schemas.hostel import (
    HostelCreate, HostelUpdate,
    HostelRoomCreate, HostelRoomUpdate,
    RoomAllocationRequest, RoomAllocationResponse,
    StudentHostelAllocationResponse
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

    async def delete_hostel(self, hostel_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            hostel = await u.hostels.get_by_id(hostel_id)
            if not hostel:
                raise ValueError("Hostel not found.")

            stmt = select(StudentProfile).where(StudentProfile.hostel_id == hostel_id)
            res = await u.db.execute(stmt)
            occupants = res.scalars().all()
            if len(occupants) > 0:
                raise ValueError(
                    f"Cannot delete hostel '{hostel.name}' because {len(occupants)} student(s) are currently residing here. Please deallocate or reassign all students first."
                )

            await u.db.delete(hostel)
            return True

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

            # Check if student is already in this exact room
            if profile.hostel_id == req.hostel_id and profile.room_number == req.room_number:
                return RoomAllocationResponse(
                    success=True,
                    message=f"Student is already allocated to Room '{req.room_number}'.",
                    student_user_id=req.student_user_id,
                    hostel_id=req.hostel_id,
                    room_number=req.room_number
                )

            # Check room with row-level lock
            stmt_room = select(HostelRoom).where(
                HostelRoom.hostel_id == req.hostel_id,
                HostelRoom.room_number == req.room_number
            ).with_for_update()
            res_room = await u.db.execute(stmt_room)
            room = res_room.scalar_one_or_none()

            if not room or not room.status:
                raise ValueError("Specified hostel room is invalid or inactive.")

            if room.current_occupancy >= room.capacity:
                raise ValueError(f"Room '{req.room_number}' is fully occupied ({room.current_occupancy}/{room.capacity}).")

            # Deallocate previous room if any
            if profile.hostel_id and profile.room_number:
                prev_stmt = select(HostelRoom).where(
                    HostelRoom.hostel_id == profile.hostel_id,
                    HostelRoom.room_number == profile.room_number
                ).with_for_update()
                prev_res = await u.db.execute(prev_stmt)
                prev_room = prev_res.scalar_one_or_none()
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

    async def get_my_allocation(self, student_user_id: UUID) -> Optional[StudentHostelAllocationResponse]:
        async with self.uow.transaction() as u:
            stmt = select(StudentProfile).where(StudentProfile.user_id == student_user_id)
            res = await u.db.execute(stmt)
            profile = res.scalar_one_or_none()
            if not profile or not profile.hostel_id or not profile.room_number:
                return None

            hostel = await u.hostels.get_by_id(profile.hostel_id)
            room = await u.hostel_rooms.get_room_by_number(profile.hostel_id, profile.room_number)

            warden_name = None
            warden_email = None
            if hostel and hostel.warden_user_id:
                warden = await u.users.get_by_id(hostel.warden_user_id)
                if warden:
                    warden_name = warden.name
                    warden_email = warden.email

            return StudentHostelAllocationResponse(
                hostel_id=profile.hostel_id,
                building_name=hostel.name if hostel else "Hostel Building",
                room_number=profile.room_number,
                room_capacity=room.capacity if room else 2,
                occupied_count=room.current_occupancy if room else 1,
                status="allocated",
                allocated_at=profile.updated_at or profile.created_at,
                warden_name=warden_name,
                warden_email=warden_email
            )

