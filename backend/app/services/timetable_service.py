from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from datetime import date, time
from app.core.uow import UnitOfWork
from app.models.timetable import TimetableSlot, TimetableException, ExceptionType, DayOfWeek
from app.schemas.timetable import (
    TimetableSlotCreate,
    TimetableSlotUpdate,
    TimetableExceptionCreate
)

class TimetableService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_slot(self, slot_in: TimetableSlotCreate) -> TimetableSlot:
        if slot_in.start_time >= slot_in.end_time:
            raise ValueError("start_time must be strictly earlier than end_time.")

        async with self.uow.transaction() as u:
            # Check clash detection
            clashes = await u.timetable_slots.find_clashes(
                term_id=slot_in.term_id,
                day_of_week=slot_in.day_of_week,
                start_time=slot_in.start_time,
                end_time=slot_in.end_time,
                faculty_user_id=slot_in.faculty_user_id,
                class_group_id=slot_in.class_group_id,
                room_location_id=slot_in.room_location_id
            )

            if clashes:
                reasons = []
                for c in clashes:
                    if c.faculty_user_id == slot_in.faculty_user_id:
                        reasons.append(f"Faculty is already assigned to a slot ({c.start_time.strftime('%H:%M')} - {c.end_time.strftime('%H:%M')})")
                    if c.class_group_id == slot_in.class_group_id:
                        reasons.append(f"Class group is already scheduled for a slot ({c.start_time.strftime('%H:%M')} - {c.end_time.strftime('%H:%M')})")
                    if slot_in.room_location_id and c.room_location_id == slot_in.room_location_id:
                        reasons.append(f"Room is already occupied for a slot ({c.start_time.strftime('%H:%M')} - {c.end_time.strftime('%H:%M')})")
                
                detail = "; ".join(set(reasons))
                raise ValueError(f"Timetable clash detected: {detail}")

            slot = TimetableSlot(
                term_id=slot_in.term_id,
                class_group_id=slot_in.class_group_id,
                subject_id=slot_in.subject_id,
                faculty_user_id=slot_in.faculty_user_id,
                room_location_id=slot_in.room_location_id,
                day_of_week=slot_in.day_of_week,
                start_time=slot_in.start_time,
                end_time=slot_in.end_time,
                status=slot_in.status
            )
            created_slot = await u.timetable_slots.create(slot)
            return created_slot

    async def update_slot(self, slot_id: UUID, slot_in: TimetableSlotUpdate) -> TimetableSlot:
        async with self.uow.transaction() as u:
            existing = await u.timetable_slots.get_by_id(slot_id)
            if not existing:
                raise ValueError("Timetable slot not found.")

            merged_term_id = slot_in.term_id if slot_in.term_id is not None else existing.term_id
            merged_day = slot_in.day_of_week if slot_in.day_of_week is not None else existing.day_of_week
            merged_start = slot_in.start_time if slot_in.start_time is not None else existing.start_time
            merged_end = slot_in.end_time if slot_in.end_time is not None else existing.end_time
            merged_faculty = slot_in.faculty_user_id if slot_in.faculty_user_id is not None else existing.faculty_user_id
            merged_class_group = slot_in.class_group_id if slot_in.class_group_id is not None else existing.class_group_id
            merged_room = slot_in.room_location_id if slot_in.room_location_id is not None else existing.room_location_id

            if merged_start >= merged_end:
                raise ValueError("start_time must be strictly earlier than end_time.")

            clashes = await u.timetable_slots.find_clashes(
                term_id=merged_term_id,
                day_of_week=merged_day,
                start_time=merged_start,
                end_time=merged_end,
                faculty_user_id=merged_faculty,
                class_group_id=merged_class_group,
                room_location_id=merged_room,
                exclude_slot_id=slot_id
            )

            if clashes:
                reasons = []
                for c in clashes:
                    if c.faculty_user_id == merged_faculty:
                        reasons.append(f"Faculty is already assigned to a slot ({c.start_time.strftime('%H:%M')} - {c.end_time.strftime('%H:%M')})")
                    if c.class_group_id == merged_class_group:
                        reasons.append(f"Class group is already scheduled for a slot ({c.start_time.strftime('%H:%M')} - {c.end_time.strftime('%H:%M')})")
                    if merged_room and c.room_location_id == merged_room:
                        reasons.append(f"Room is already occupied for a slot ({c.start_time.strftime('%H:%M')} - {c.end_time.strftime('%H:%M')})")
                
                detail = "; ".join(set(reasons))
                raise ValueError(f"Timetable clash detected: {detail}")

            update_data = slot_in.model_dump(exclude_unset=True)
            updated_slot = await u.timetable_slots.update(existing, update_data)
            return updated_slot

    async def get_slot(self, slot_id: UUID) -> TimetableSlot:
        async with self.uow.transaction() as u:
            slot = await u.timetable_slots.get_by_id(slot_id)
            if not slot:
                raise ValueError("Timetable slot not found.")
            return slot

    async def list_slots(
        self,
        term_id: Optional[UUID] = None,
        class_group_id: Optional[UUID] = None,
        faculty_user_id: Optional[UUID] = None,
        day_of_week: Optional[DayOfWeek] = None,
        room_location_id: Optional[UUID] = None,
        status: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[TimetableSlot], int]:
        filters: Dict[str, Any] = {}
        if term_id is not None:
            filters["term_id"] = term_id
        if class_group_id is not None:
            filters["class_group_id"] = class_group_id
        if faculty_user_id is not None:
            filters["faculty_user_id"] = faculty_user_id
        if day_of_week is not None:
            filters["day_of_week"] = day_of_week
        if room_location_id is not None:
            filters["room_location_id"] = room_location_id
        if status is not None:
            filters["status"] = status

        async with self.uow.transaction() as u:
            return await u.timetable_slots.list(filters=filters, skip=skip, limit=limit)

    async def delete_slot(self, slot_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            slot = await u.timetable_slots.get_by_id(slot_id)
            if not slot:
                raise ValueError("Timetable slot not found.")
            return await u.timetable_slots.delete(slot_id)

    async def create_exception(self, exc_in: TimetableExceptionCreate) -> TimetableException:
        async with self.uow.transaction() as u:
            slot = await u.timetable_slots.get_by_id(exc_in.slot_id)
            if not slot:
                raise ValueError("Referenced timetable slot not found.")

            if exc_in.type == ExceptionType.substitute and not exc_in.substitute_faculty_id:
                raise ValueError("substitute_faculty_id is required for SUBSTITUTE exception.")

            exc = TimetableException(
                slot_id=exc_in.slot_id,
                date=exc_in.date,
                type=exc_in.type,
                substitute_faculty_id=exc_in.substitute_faculty_id,
                note=exc_in.note
            )
            return await u.timetable_exceptions.create(exc)

    async def list_exceptions(
        self,
        slot_id: Optional[UUID] = None,
        exception_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[TimetableException], int]:
        filters: Dict[str, Any] = {}
        if slot_id is not None:
            filters["slot_id"] = slot_id
        if exception_date is not None:
            filters["date"] = exception_date

        async with self.uow.transaction() as u:
            return await u.timetable_exceptions.list(filters=filters, skip=skip, limit=limit)

    async def delete_exception(self, exception_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            exc = await u.timetable_exceptions.get_by_id(exception_id)
            if not exc:
                raise ValueError("Timetable exception not found.")
            return await u.timetable_exceptions.delete(exception_id)

    async def get_my_schedule(self, user: Any) -> Any:
        from sqlalchemy import select
        from app.models.user import UserType, User as UserModel
        from app.models.profiles import StudentProfile
        from app.models.academic import Subject, ClassGroup
        from app.models.map import MapLocation
        from app.schemas.timetable import MyScheduleResponse, EnrichedTimetableSlotResponse, TimetableExceptionResponse

        async with self.uow.transaction() as u:
            slots: List[TimetableSlot] = []
            
            if user.user_type == UserType.student:
                prof_stmt = select(StudentProfile).where(StudentProfile.user_id == user.id)
                prof_res = await u.db.execute(prof_stmt)
                student_prof = prof_res.scalar_one_or_none()
                
                if student_prof:
                    cg_stmt = select(ClassGroup).where(
                        ClassGroup.course_id == student_prof.course_id,
                        ClassGroup.department_id == student_prof.department_id,
                        ClassGroup.year == student_prof.year,
                        ClassGroup.section == (student_prof.section or "A")
                    )
                    cg_res = await u.db.execute(cg_stmt)
                    cg = cg_res.scalar_one_or_none()
                    if cg:
                        slots_stmt = select(TimetableSlot).where(
                            TimetableSlot.class_group_id == cg.id,
                            TimetableSlot.status.is_(True)
                        )
                        slots = list((await u.db.execute(slots_stmt)).scalars().all())
            elif user.user_type in [UserType.faculty, UserType.admin]:
                slots_stmt = select(TimetableSlot).where(
                    TimetableSlot.faculty_user_id == user.id,
                    TimetableSlot.status.is_(True)
                )
                slots = list((await u.db.execute(slots_stmt)).scalars().all())

            enriched_slots: List[EnrichedTimetableSlotResponse] = []
            slot_ids = [s.id for s in slots]
            
            subj_ids = {s.subject_id for s in slots if s.subject_id}
            cg_ids = {s.class_group_id for s in slots if s.class_group_id}
            faculty_ids = {s.faculty_user_id for s in slots if s.faculty_user_id}
            room_ids = {s.room_location_id for s in slots if s.room_location_id}

            subjects_map: Dict[UUID, Subject] = {}
            if subj_ids:
                s_stmt = select(Subject).where(Subject.id.in_(subj_ids))
                subjects_map = {s.id: s for s in (await u.db.execute(s_stmt)).scalars().all()}

            cgroups_map: Dict[UUID, ClassGroup] = {}
            if cg_ids:
                cg_stmt = select(ClassGroup).where(ClassGroup.id.in_(cg_ids))
                cgroups_map = {cg.id: cg for cg in (await u.db.execute(cg_stmt)).scalars().all()}

            faculty_map: Dict[UUID, UserModel] = {}
            if faculty_ids:
                f_stmt = select(UserModel).where(UserModel.id.in_(faculty_ids))
                faculty_map = {f.id: f for f in (await u.db.execute(f_stmt)).scalars().all()}

            room_map: Dict[UUID, MapLocation] = {}
            if room_ids:
                r_stmt = select(MapLocation).where(MapLocation.id.in_(room_ids))
                room_map = {r.id: r for r in (await u.db.execute(r_stmt)).scalars().all()}

            for s in slots:
                res_obj = EnrichedTimetableSlotResponse.model_validate(s)
                subj = subjects_map.get(s.subject_id)
                if subj:
                    res_obj.subject_code = subj.code
                    res_obj.subject_name = subj.name
                
                fac = faculty_map.get(s.faculty_user_id)
                if fac:
                    res_obj.faculty_name = fac.name or fac.email
                    
                rm = room_map.get(s.room_location_id) if s.room_location_id else None
                if rm:
                    res_obj.room_name = rm.name

                cg = cgroups_map.get(s.class_group_id)
                if cg:
                    res_obj.class_group_name = f"Year {cg.year} Sec {cg.section}"
                
                enriched_slots.append(res_obj)

            exceptions: List[TimetableException] = []
            if slot_ids:
                exc_stmt = select(TimetableException).where(TimetableException.slot_id.in_(slot_ids))
                exceptions = list((await u.db.execute(exc_stmt)).scalars().all())

            exc_responses = [TimetableExceptionResponse.model_validate(e) for e in exceptions]

            return MyScheduleResponse(slots=enriched_slots, exceptions=exc_responses)
