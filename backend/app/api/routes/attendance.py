from typing import Any, Set
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import selectinload
from uuid import UUID
import datetime

from app.core.database import get_db
from app.models.user import User, UserType
from app.models.academic import TimetableSlot, AttendanceRecord
from app.models.profiles import StudentProfile
from app.api.deps import get_current_user, require_permission, get_user_permissions, can_mark_attendance
from app.core.permissions import Perms
from app.schemas.attendance import AttendanceBatchRequest, AttendanceStatsResponse
from app.schemas.common import APIResponse

router = APIRouter()

@router.get("/roster/{slot_id}", response_model=APIResponse)
async def get_attendance_roster(
    slot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_MARK)),
    user_permissions: Set[str] = Depends(get_user_permissions)
) -> Any:
    """
    Get the student roster for a specific timetable slot.
    """
    result = await db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")

    if not can_mark_attendance(slot, current_user, user_permissions):
        raise HTTPException(status_code=403, detail="Not authorized to mark attendance for this slot")

    # Fetch students matching the slot's criteria
    # StudentProfile has user_id, course_id, branch_id, year.
    # It also has the related User via relationship.
    stmt = select(StudentProfile).options(selectinload(StudentProfile.user)).where(
        StudentProfile.course_id == slot.course_id,
        StudentProfile.branch_id == slot.branch_id,
        StudentProfile.year == slot.year
    )
    students_res = await db.execute(stmt)
    students = students_res.scalars().all()
    
    roster = []
    for sp in students:
        if sp.user.is_active:  # Ensure user is active
            roster.append({
                "student_id": sp.user_id,
                "name": sp.name,
                "roll_number": None
            })

    return APIResponse(success=True, data=roster)

@router.post("/batch", response_model=APIResponse)
async def submit_attendance_batch(
    payload: AttendanceBatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_MARK)),
    user_permissions: Set[str] = Depends(get_user_permissions)
) -> Any:
    """
    Submit a batch of attendance records.
    Uses PostgreSQL Upsert logic to handle updates gracefully.
    """
    # 1. Load Slot & Verify Ownership
    result = await db.execute(select(TimetableSlot).where(TimetableSlot.id == payload.slot_id))
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")

    if not can_mark_attendance(slot, current_user, user_permissions):
        raise HTTPException(status_code=403, detail="Not authorized to mark attendance for this slot")

    # 2. Day Match Validation
    requested_weekday = payload.date.strftime("%A").lower()
    if requested_weekday != slot.day_of_week.lower():
        raise HTTPException(
            status_code=400,
            detail=f"Date weekday ({requested_weekday}) does not match slot day_of_week ({slot.day_of_week})"
        )

    # 3. Roster Validation (Ghost Student Prevention)
    stmt = select(StudentProfile.user_id).where(
        StudentProfile.course_id == slot.course_id,
        StudentProfile.branch_id == slot.branch_id,
        StudentProfile.year == slot.year
    )
    valid_student_ids_res = await db.execute(stmt)
    valid_student_ids = set(valid_student_ids_res.scalars().all())

    attendance_dicts = []
    for record in payload.records:
        if record.student_id not in valid_student_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Student {record.student_id} does not belong to this class roster"
            )
        attendance_dicts.append({
            "timetable_slot_id": payload.slot_id,
            "student_id": record.student_id,
            "date": payload.date,
            "status": record.status,
            "marked_by": current_user.id
        })

    if not attendance_dicts:
        return APIResponse(success=True, message="No records to process")

    # 4. Clear implicit transaction & perform Upsert
    await db.commit()
    async with db.begin():
        stmt_upsert = insert(AttendanceRecord).values(attendance_dicts)
        stmt_upsert = stmt_upsert.on_conflict_do_update(
            constraint='uq_attendance_slot_student_date',
            set_={
                "status": stmt_upsert.excluded.status, 
                "marked_by": stmt_upsert.excluded.marked_by,
                # Note: updated_at would normally go here if we had it. Since base.py automatically updates `updated_at` via SQLAlchemy events,
                # we don't necessarily need it, but let's just let SQLAlchemy handle it or we can manually set it if needed.
                # Base model usually has updated_at logic.
            }
        )
        await db.execute(stmt_upsert)

    return APIResponse(success=True, message="Attendance batch processed successfully")


@router.get("/mine/stats", response_model=APIResponse)
async def get_my_attendance_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_VIEW))
) -> Any:
    """
    Get aggregated attendance stats for the current user.
    Grouped by subject_name.
    """
    if current_user.user_type != UserType.student:
        raise HTTPException(status_code=400, detail="Stats are only available for students in this view")

    # Query: Join AttendanceRecord with TimetableSlot, group by subject_name
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
        AttendanceRecord.student_id == current_user.id
    ).group_by(TimetableSlot.subject_name)

    result = await db.execute(stmt)
    rows = result.all()
    
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
        
    return APIResponse(success=True, data=stats)
