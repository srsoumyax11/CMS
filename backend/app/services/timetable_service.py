from typing import List, Optional
from uuid import UUID

from app.models.academic import TimetableSlot
from app.models.user import User, UserType
from app.schemas.timetable import TimetableSlotCreate, TimetableSlotUpdate
from app.repositories.timetable_repository import TimetableRepository
from app.core.uow import UnitOfWork

class TimetableService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.db = uow.db
        self.repository = TimetableRepository(self.db)
        
    async def get_my_timetable(self, current_user: User) -> List[TimetableSlot]:
        if current_user.user_type == UserType.student:
            if not current_user.student_profile:
                raise ValueError("Student profile not found")
            sp = current_user.student_profile
            return await self.repository.list_by_student_course(sp.course_id, sp.department_id, sp.year)

            
        elif current_user.user_type == UserType.faculty:
            return await self.repository.list_by_faculty(current_user.id)
            
        elif current_user.user_type == UserType.admin:
            return await self.repository.list_all()
            
        raise ValueError("Invalid user type")

    async def create_timetable_slot(self, payload: TimetableSlotCreate) -> TimetableSlot:
        overlapping = await self.repository.get_overlapping(
            payload.faculty_id, payload.day_of_week, payload.start_time, payload.end_time, room=payload.room
        )
        if overlapping:
            if overlapping.faculty_id == payload.faculty_id:
                raise ValueError("This faculty member is already booked for an overlapping time slot on this day.")
            else:
                raise ValueError(f"Room '{payload.room}' is already occupied during this time slot.")

        slot = TimetableSlot(**payload.model_dump())
        self.db.add(slot)
        await self.db.flush()
        await self.db.refresh(slot)
        return slot

    async def update_timetable_slot(self, slot_id: UUID, payload: TimetableSlotUpdate) -> TimetableSlot:
        slot = await self.repository.get_by_id(slot_id)
        if not slot:
            raise ValueError("Timetable slot not found")

        update_data = payload.model_dump(exclude_unset=True)
        
        new_faculty = update_data.get("faculty_id", slot.faculty_id)
        new_day = update_data.get("day_of_week", slot.day_of_week)
        new_start = update_data.get("start_time", slot.start_time)
        new_end = update_data.get("end_time", slot.end_time)
        new_room = update_data.get("room", slot.room)

        if any(k in update_data for k in ["faculty_id", "day_of_week", "start_time", "end_time", "room"]):
            overlapping = await self.repository.get_overlapping(
                new_faculty, new_day, new_start, new_end, exclude_id=slot_id, room=new_room
            )
            if overlapping:
                if overlapping.faculty_id == new_faculty:
                    raise ValueError("This faculty member is already booked for an overlapping time slot on this day.")
                else:
                    raise ValueError(f"Room '{new_room}' is already occupied during this time slot.")


        for key, value in update_data.items():
            setattr(slot, key, value)
            
        await self.db.flush()
        await self.db.refresh(slot)
        return slot

    async def delete_timetable_slot(self, slot_id: UUID) -> None:
        slot = await self.repository.get_by_id(slot_id)
        if not slot:
            raise ValueError("Timetable slot not found")
        await self.db.delete(slot)
        await self.db.flush()
