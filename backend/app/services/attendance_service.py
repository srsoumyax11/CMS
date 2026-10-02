from typing import List, Dict, Any, Set
from uuid import UUID

from app.models.user import User, UserType, AccountStatus
from app.schemas.attendance import AttendanceBatchRequest, AttendanceStatsResponse
from app.repositories.attendance_repository import AttendanceRepository
from app.core.uow import UnitOfWork
from app.api.deps import can_mark_attendance

class AttendanceService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.db = uow.db
        self.repository = AttendanceRepository(self.db)

    async def get_attendance_roster(self, slot_id: UUID, current_user: User, user_permissions: Set[str]) -> List[Dict[str, Any]]:
        slot = await self.repository.get_slot(slot_id)
        if not slot:
            raise ValueError("Timetable slot not found")

        if not can_mark_attendance(slot, current_user, user_permissions):
            raise PermissionError("Not authorized to mark attendance for this slot")

        students = await self.repository.get_students_for_class(slot.course_id, slot.department_id, slot.year)
        
        roster = []
        for sp in students:
            if sp.user.account_status == AccountStatus.active:
                roster.append({
                    "student_id": sp.user_id,
                    "name": sp.user.name,
                    "roll_number": None
                })
        return roster

    async def submit_attendance_batch(
        self, 
        payload: AttendanceBatchRequest, 
        current_user: User, 
        user_permissions: Set[str]
    ) -> None:
        slot = await self.repository.get_slot(payload.slot_id)
        if not slot:
            raise ValueError("Timetable slot not found")

        if not can_mark_attendance(slot, current_user, user_permissions):
            raise PermissionError("Not authorized to mark attendance for this slot")

        requested_weekday = payload.date.strftime("%A").lower()
        if requested_weekday != slot.day_of_week.lower():
            raise ValueError(f"Date weekday ({requested_weekday}) does not match slot day_of_week ({slot.day_of_week})")

        students = await self.repository.get_students_for_class(slot.course_id, slot.department_id, slot.year)
        valid_student_ids = {sp.user_id for sp in students}

        attendance_dicts = []
        for record in payload.records:
            if record.student_id not in valid_student_ids:
                raise ValueError(f"Student {record.student_id} does not belong to this class roster")
                
            attendance_dicts.append({
                "timetable_slot_id": payload.slot_id,
                "student_id": record.student_id,
                "date": payload.date,
                "status": record.status,
                "marked_by": current_user.id
            })

        await self.repository.upsert_attendance(attendance_dicts)

    async def get_my_attendance_stats(self, current_user: User) -> List[Dict[str, Any]]:
        if current_user.user_type != UserType.student:
            raise ValueError("Stats are only available for students in this view")

        rows = await self.repository.get_attendance_stats(current_user.id)
        
        stats = []
        for row in rows:
            stats.append(AttendanceStatsResponse(
                subject_name=row.subject_name,
                total=row.total or 0,
                present=row.present or 0,
                absent=row.absent or 0,
                late=row.late or 0,
                excused=row.excused or 0
            ).model_dump())
            
        return stats
