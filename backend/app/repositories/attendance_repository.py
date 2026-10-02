from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert

from app.models.academic import TimetableSlot, AttendanceRecord
from app.models.profiles import StudentProfile

class AttendanceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_slot(self, slot_id: UUID) -> Optional[TimetableSlot]:
        result = await self.db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
        return result.scalar_one_or_none()

    async def get_students_for_class(self, course_id: UUID, department_id: UUID, year: int) -> List[StudentProfile]:
        stmt = select(StudentProfile).options(selectinload(StudentProfile.user)).where(
            StudentProfile.course_id == course_id,
            StudentProfile.department_id == department_id,
            StudentProfile.year == year
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def upsert_attendance(self, attendance_dicts: List[Dict[str, Any]]) -> None:
        if not attendance_dicts:
            return
            
        stmt_upsert = insert(AttendanceRecord).values(attendance_dicts)
        stmt_upsert = stmt_upsert.on_conflict_do_update(
            constraint='uq_attendance_slot_student_date',
            set_={
                "status": stmt_upsert.excluded.status, 
                "marked_by": stmt_upsert.excluded.marked_by,
            }
        )
        await self.db.execute(stmt_upsert)

    async def get_attendance_stats(self, student_id: str) -> List[Any]:
        stmt = select(
            TimetableSlot.subject_name,
            func.count(AttendanceRecord.id).label("total"),
            func.sum(
                case(
                    (AttendanceRecord.status == 'present', 1),
                    else_=0
                )
            ).label("present"),
            func.sum(
                case(
                    (AttendanceRecord.status == 'absent', 1),
                    else_=0
                )
            ).label("absent"),
            func.sum(
                case(
                    (AttendanceRecord.status == 'late', 1),
                    else_=0
                )
            ).label("late"),
            func.sum(
                case(
                    (AttendanceRecord.status == 'excused', 1),
                    else_=0
                )
            ).label("excused")
        ).select_from(AttendanceRecord).join(
            TimetableSlot, AttendanceRecord.timetable_slot_id == TimetableSlot.id
        ).where(
            AttendanceRecord.student_id == student_id
        ).group_by(TimetableSlot.subject_name)

        result = await self.db.execute(stmt)
        return result.all()
