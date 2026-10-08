from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from datetime import date, datetime, timezone
from sqlalchemy import select, and_

from app.core.uow import UnitOfWork
from app.models.timetable import AttendanceSession, AttendanceRecord, AttendanceStatus, TimetableSlot
from app.models.user import User

class AttendanceService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def open_session(self, faculty_id: UUID, slot_id: UUID, session_date: date) -> AttendanceSession:
        async with self.uow.transaction() as u:
            # Check if session already exists
            filters = {"slot_id": slot_id, "date": session_date}
            existing, _ = await u.attendance_sessions.list(filters=filters)
            if existing:
                return existing[0]

            # Verify slot belongs to faculty
            slot = await u.timetable_slots.get_by_id(slot_id)
            if not slot or slot.faculty_user_id != faculty_id:
                raise ValueError("Slot not found or unauthorized.")

            session = AttendanceSession(
                slot_id=slot_id,
                date=session_date,
                taken_by=faculty_id,
                status="OPEN"
            )
            session = await u.attendance_sessions.create(session)
            return session

    async def submit_attendance(self, faculty_id: UUID, session_id: UUID, records: List[Dict[str, Any]]) -> None:
        async with self.uow.transaction() as u:
            session = await u.attendance_sessions.get_by_id(session_id)
            if not session:
                raise ValueError("Session not found.")
            if session.taken_by != faculty_id:
                raise ValueError("Unauthorized.")
            if session.status == "LOCKED":
                raise ValueError("Session is locked.")

            for req_record in records:
                student_id = req_record["student_user_id"]
                status = AttendanceStatus(req_record["status"])
                
                # Check if record exists
                rec_filters = {"session_id": session_id, "student_user_id": student_id}
                existing, _ = await u.attendance_records.list(filters=rec_filters)
                
                if existing:
                    existing[0].status = status
                    existing[0].marked_by = faculty_id
                    await u.attendance_records.update(existing[0], {})
                else:
                    new_rec = AttendanceRecord(
                        session_id=session_id,
                        student_user_id=student_id,
                        status=status,
                        marked_by=faculty_id
                    )
                    await u.attendance_records.create(new_rec)

    async def lock_session(self, faculty_id: UUID, session_id: UUID) -> AttendanceSession:
        async with self.uow.transaction() as u:
            session = await u.attendance_sessions.get_by_id(session_id)
            if not session or session.taken_by != faculty_id:
                raise ValueError("Session not found or unauthorized.")
                
            session.status = "LOCKED"
            await u.attendance_sessions.update(session, {})
            return session

    async def get_student_attendance(self, student_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[AttendanceRecord], int]:
        async with self.uow.transaction() as u:
            return await u.attendance_records.get_student_records(student_id, skip, limit)
