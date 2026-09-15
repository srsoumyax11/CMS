from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.core.database import get_db
from app.models.user import User, UserType
from app.models.academic import TimetableSlot
from app.api.deps import get_current_user, require_permission
from app.core.permissions import Perms
from app.schemas.timetable import TimetableSlotCreate, TimetableSlotUpdate, TimetableSlotResponse
from app.schemas.common import APIResponse

router = APIRouter()

@router.get("/mine", response_model=APIResponse)
async def get_my_timetable(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_VIEW))
) -> Any:
    """
    Get the timetable for the current user.
    If student: filter by their course, branch, and year.
    If faculty: filter by their faculty_id.
    """
    stmt = select(TimetableSlot)
    if current_user.user_type == UserType.student:
        if not current_user.student_profile:
            raise HTTPException(status_code=400, detail="Student profile not found")
        sp = current_user.student_profile[0]
        stmt = stmt.where(
            TimetableSlot.course_id == sp.course_id,
            TimetableSlot.branch_id == sp.branch_id,
            TimetableSlot.year == sp.year
        )
    elif current_user.user_type == UserType.faculty:
        stmt = stmt.where(TimetableSlot.faculty_id == current_user.id)
    elif current_user.user_type == UserType.admin:
        # Admin gets everything for /mine? Or maybe just return empty or all. Let's return all.
        pass
    else:
        raise HTTPException(status_code=403, detail="Invalid user type")

    result = await db.execute(stmt)
    slots = result.scalars().all()
    
    return APIResponse(
        success=True,
        data=[TimetableSlotResponse.model_validate(slot).model_dump() for slot in slots]
    )

@router.post("/", response_model=APIResponse)
async def create_timetable_slot(
    payload: TimetableSlotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_MANAGE))
) -> Any:
    """
    Create a new timetable slot.
    """
    # Overlap validation
    overlap_stmt = select(TimetableSlot).where(
        TimetableSlot.faculty_id == payload.faculty_id,
        TimetableSlot.day_of_week == payload.day_of_week,
        TimetableSlot.start_time < payload.end_time,
        TimetableSlot.end_time > payload.start_time
    )
    overlap_result = await db.execute(overlap_stmt)
    if overlap_result.first():
        raise HTTPException(
            status_code=400, 
            detail="This faculty member is already booked for an overlapping time slot on this day."
        )

    slot = TimetableSlot(**payload.model_dump())
    db.add(slot)
    await db.commit()
    await db.refresh(slot)

    return APIResponse(
        success=True,
        data=TimetableSlotResponse.model_validate(slot).model_dump()
    )

@router.patch("/{slot_id}", response_model=APIResponse)
async def update_timetable_slot(
    slot_id: UUID,
    payload: TimetableSlotUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_MANAGE))
) -> Any:
    """
    Update a timetable slot.
    """
    result = await db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")

    update_data = payload.model_dump(exclude_unset=True)
    
    # Check overlap if changing time/faculty/day
    new_faculty = update_data.get("faculty_id", slot.faculty_id)
    new_day = update_data.get("day_of_week", slot.day_of_week)
    new_start = update_data.get("start_time", slot.start_time)
    new_end = update_data.get("end_time", slot.end_time)

    if any(k in update_data for k in ["faculty_id", "day_of_week", "start_time", "end_time"]):
        overlap_stmt = select(TimetableSlot).where(
            TimetableSlot.id != slot_id,
            TimetableSlot.faculty_id == new_faculty,
            TimetableSlot.day_of_week == new_day,
            TimetableSlot.start_time < new_end,
            TimetableSlot.end_time > new_start
        )
        overlap_result = await db.execute(overlap_stmt)
        if overlap_result.first():
            raise HTTPException(
                status_code=400, 
                detail="This faculty member is already booked for an overlapping time slot on this day."
            )

    for key, value in update_data.items():
        setattr(slot, key, value)
        
    await db.commit()
    await db.refresh(slot)

    return APIResponse(
        success=True,
        data=TimetableSlotResponse.model_validate(slot).model_dump()
    )

@router.delete("/{slot_id}", response_model=APIResponse)
async def delete_timetable_slot(
    slot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_MANAGE))
) -> Any:
    """
    Delete a timetable slot.
    """
    result = await db.execute(select(TimetableSlot).where(TimetableSlot.id == slot_id))
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Timetable slot not found")

    await db.delete(slot)
    await db.commit()

    return APIResponse(
        success=True,
        message="Timetable slot deleted successfully"
    )
