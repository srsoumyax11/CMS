from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from datetime import date, datetime, timezone
from sqlalchemy import select, and_, func

from app.core.uow import UnitOfWork
from app.models.timetable import AttendanceSession, AttendanceRecord, AttendanceStatus, TimetableSlot
from app.models.academic import Subject, ClassGroup
from app.models.profiles import StudentProfile
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

    async def get_session_roster(self, faculty_id: UUID, slot_id: UUID, session_date: date) -> dict:
        async with self.uow.transaction() as u:
            # 1. Fetch slot
            slot = await u.timetable_slots.get_by_id(slot_id)
            if not slot:
                raise ValueError("Timetable slot not found")

            # 2. Fetch subject and class group names
            subject = await u.subjects.get_by_id(slot.subject_id)
            class_group = await u.class_groups.get_by_id(slot.class_group_id)

            subject_name = subject.name if subject else "Subject"
            subject_code = subject.code if subject else ""
            class_group_name = f"Year {class_group.year} - Section {class_group.section}" if class_group else "Class Group"

            # 3. Check for existing session
            stmt_sess = select(AttendanceSession).where(
                AttendanceSession.slot_id == slot_id,
                AttendanceSession.date == session_date
            )
            sess_res = await u.db.execute(stmt_sess)
            session = sess_res.scalar_one_or_none()

            session_id = session.id if session else None
            session_status = session.status if session else "OPEN"

            # 4. Fetch students in this class group (matched by course, department, year, section)
            stmt_students = (
                select(User, StudentProfile)
                .join(StudentProfile, User.id == StudentProfile.user_id)
                .where(
                    StudentProfile.course_id == class_group.course_id,
                    StudentProfile.department_id == class_group.department_id,
                    StudentProfile.year == class_group.year,
                    StudentProfile.section == class_group.section
                )
                .order_by(StudentProfile.registration_no.asc(), User.name.asc())
            )
            students_res = await u.db.execute(stmt_students)
            student_rows = students_res.all()

            # 5. Fetch existing attendance records if session exists
            existing_status_map = {}
            if session:
                stmt_recs = select(AttendanceRecord).where(AttendanceRecord.session_id == session.id)
                recs_res = await u.db.execute(stmt_recs)
                for r in recs_res.scalars().all():
                    existing_status_map[r.student_user_id] = r.status

            student_list = []
            for user, prof in student_rows:
                st = existing_status_map.get(user.id, AttendanceStatus.present)
                student_list.append({
                    "student_user_id": user.id,
                    "student_name": user.name,
                    "roll_number": prof.registration_no,
                    "status": st
                })

            return {
                "session_id": session_id,
                "slot_id": slot_id,
                "subject_name": subject_name,
                "subject_code": subject_code,
                "class_group_name": class_group_name,
                "date": session_date,
                "session_status": session_status,
                "students": student_list
            }

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
                    await u.attendance_records.update(existing[0], {})
                else:
                    new_rec = AttendanceRecord(
                        session_id=session_id,
                        student_user_id=student_id,
                        status=status
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

    async def get_student_stats(self, student_id: UUID) -> dict:
        async with self.uow.transaction() as u:
            # Query all attendance records for student with slot and subject info
            stmt = (
                select(AttendanceRecord, AttendanceSession, TimetableSlot, Subject)
                .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
                .join(TimetableSlot, AttendanceSession.slot_id == TimetableSlot.id)
                .join(Subject, TimetableSlot.subject_id == Subject.id)
                .where(AttendanceRecord.student_user_id == student_id)
            )
            res = await u.db.execute(stmt)
            rows = res.all()

            subject_map = {}
            total_conducted = 0
            total_attended = 0

            for rec, sess, slot, subj in rows:
                if subj.id not in subject_map:
                    subject_map[subj.id] = {
                        "subject_id": subj.id,
                        "subject_name": subj.name,
                        "subject_code": subj.code,
                        "conducted": 0,
                        "attended": 0
                    }
                
                subject_map[subj.id]["conducted"] += 1
                total_conducted += 1

                if rec.status in [AttendanceStatus.present, AttendanceStatus.late, AttendanceStatus.excused]:
                    subject_map[subj.id]["attended"] += 1
                    total_attended += 1

            subject_stats = []
            overall_shortage = False

            for s_id, s_data in subject_map.items():
                cond = s_data["conducted"]
                att = s_data["attended"]
                pct = round((att / cond * 100.0), 1) if cond > 0 else 100.0
                is_short = pct < 75.0
                if is_short:
                    overall_shortage = True

                subject_stats.append({
                    "subject_id": s_id,
                    "subject_name": s_data["subject_name"],
                    "subject_code": s_data["subject_code"],
                    "total_conducted": cond,
                    "total_attended": att,
                    "percentage": pct,
                    "is_shortage": is_short
                })

            overall_pct = round((total_attended / total_conducted * 100.0), 1) if total_conducted > 0 else 100.0

            return {
                "overall_percentage": overall_pct,
                "overall_shortage": overall_shortage,
                "total_conducted": total_conducted,
                "total_attended": total_attended,
                "subject_stats": subject_stats
            }

