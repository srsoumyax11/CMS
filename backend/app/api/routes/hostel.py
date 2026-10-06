from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID
from sqlalchemy import select
from datetime import datetime, timezone

from app.api.deps import get_current_user, get_uow, require_permission
from app.core.uow import UnitOfWork
from app.models.user import User, UserType
from app.models.hostel import HostelAllocation, AllocationStatus
from app.models.infrastructure import Room
from app.schemas.common import APIResponse
from app.schemas.hostel import HostelAllocationResponse, HostelAllocationCreate

router = APIRouter()

from sqlalchemy.orm import selectinload
from app.models.profiles import StudentProfile
from app.models.infrastructure import Building

async def _build_enriched_response(alloc: HostelAllocation, db) -> HostelAllocationResponse:
    res = HostelAllocationResponse.model_validate(alloc)
    
    # Fill student details
    if alloc.student:
        res.student_name = alloc.student.name
        res.student_email = alloc.student.email

    # Fill room and building details
    if alloc.room:
        res.room_number = alloc.room.room_number
        res.room_capacity = alloc.room.capacity
        if alloc.room.building:
            res.building_id = alloc.room.building_id
            res.building_name = alloc.room.building.name
        elif alloc.room.building_id:
            bldg = await db.get(Building, alloc.room.building_id)
            if bldg:
                res.building_id = bldg.id
                res.building_name = bldg.name

    # Active occupants count
    stmt_occ = select(HostelAllocation).where(
        HostelAllocation.room_id == alloc.room_id,
        HostelAllocation.status == AllocationStatus.active
    )
    occ_res = await db.execute(stmt_occ)
    res.occupied_count = len(occ_res.scalars().all())
    
    return res

@router.get(
    "/mine",
    summary="Get My Hostel Allocation",
    response_model=APIResponse[HostelAllocationResponse]
)
async def get_my_allocation(
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    stmt = (
        select(HostelAllocation)
        .options(
            selectinload(HostelAllocation.student),
            selectinload(HostelAllocation.room).selectinload(Room.building)
        )
        .where(
            HostelAllocation.student_id == current_user.id,
            HostelAllocation.status == AllocationStatus.active
        )
    )
    result = await uow.db.execute(stmt)
    alloc = result.scalar_one_or_none()
    if not alloc:
        raise HTTPException(status_code=404, detail="No active hostel allocation found")
    enriched = await _build_enriched_response(alloc, uow.db)
    return APIResponse(success=True, data=enriched)

@router.get(
    "/allocations",
    summary="List All Allocations",
    dependencies=[Depends(require_permission("hostel:manage"))],
    response_model=APIResponse[List[HostelAllocationResponse]]
)
async def list_allocations(
    uow: UnitOfWork = Depends(get_uow)
):
    stmt = (
        select(HostelAllocation)
        .options(
            selectinload(HostelAllocation.student),
            selectinload(HostelAllocation.room).selectinload(Room.building)
        )
        .order_by(HostelAllocation.created_at.desc())
    )
    result = await uow.db.execute(stmt)
    allocs = result.scalars().all()
    enriched_list = [await _build_enriched_response(a, uow.db) for a in allocs]
    return APIResponse(success=True, data=enriched_list)

@router.post(
    "/allocations",
    summary="Allocate Room",
    dependencies=[Depends(require_permission("hostel:manage"))],
    response_model=APIResponse[HostelAllocationResponse]
)
async def allocate_room(
    data: HostelAllocationCreate,
    uow: UnitOfWork = Depends(get_uow)
):
    async with uow.transaction():
        # Check target student user exists and is a student
        student_user = await uow.db.get(User, data.student_id)
        if not student_user or student_user.user_type != UserType.student:
            raise HTTPException(status_code=400, detail="Target user not found or is not a student")

        # Check capacity / existing allocations
        room = await uow.db.get(Room, data.room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
            
        stmt = select(HostelAllocation).where(
            HostelAllocation.room_id == data.room_id,
            HostelAllocation.status == AllocationStatus.active
        )
        result = await uow.db.execute(stmt)
        active_allocations = len(result.scalars().all())
        
        if active_allocations >= room.capacity:
            raise HTTPException(status_code=400, detail="Room is at full capacity")
            
        # Check if student already allocated
        stmt_student = select(HostelAllocation).where(
            HostelAllocation.student_id == data.student_id,
            HostelAllocation.status == AllocationStatus.active
        )
        result_student = await uow.db.execute(stmt_student)
        if result_student.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Student already has an active allocation")
            
        alloc = HostelAllocation(
            student_id=data.student_id,
            room_id=data.room_id,
            status=AllocationStatus.active
        )
        uow.db.add(alloc)

        # Sync StudentProfile room_id & hostel display string
        building = await uow.db.get(Building, room.building_id) if room.building_id else None
        building_name = building.name if building else "Hostel"

        stmt_prof = select(StudentProfile).where(StudentProfile.user_id == data.student_id)
        res_prof = await uow.db.execute(stmt_prof)
        prof = res_prof.scalar_one_or_none()
        if prof:
            prof.room_id = data.room_id

        await uow.db.flush()

        # Reload with relations for enriched response
        stmt_reload = (
            select(HostelAllocation)
            .options(
                selectinload(HostelAllocation.student),
                selectinload(HostelAllocation.room).selectinload(Room.building)
            )
            .where(HostelAllocation.id == alloc.id)
        )
        res_reload = await uow.db.execute(stmt_reload)
        alloc_reloaded = res_reload.scalar_one()

        enriched = await _build_enriched_response(alloc_reloaded, uow.db)
        return APIResponse(success=True, data=enriched)

@router.patch(
    "/allocations/{id}/vacate",
    summary="Vacate Room",
    dependencies=[Depends(require_permission("hostel:manage"))],
    response_model=APIResponse[HostelAllocationResponse]
)
async def vacate_room(
    id: UUID,
    uow: UnitOfWork = Depends(get_uow)
):
    async with uow.transaction():
        stmt_alloc = (
            select(HostelAllocation)
            .options(
                selectinload(HostelAllocation.student),
                selectinload(HostelAllocation.room).selectinload(Room.building)
            )
            .where(HostelAllocation.id == id)
        )
        result = await uow.db.execute(stmt_alloc)
        alloc = result.scalar_one_or_none()

        if not alloc:
            raise HTTPException(status_code=404, detail="Allocation not found")
        if alloc.status == AllocationStatus.vacated:
            raise HTTPException(status_code=400, detail="Allocation already vacated")
            
        alloc.status = AllocationStatus.vacated
        alloc.vacated_at = datetime.now(timezone.utc)

        # Sync StudentProfile room_id and hostel string removal
        stmt_prof = select(StudentProfile).where(StudentProfile.user_id == alloc.student_id)
        res_prof = await uow.db.execute(stmt_prof)
        prof = res_prof.scalar_one_or_none()
        if prof and prof.room_id == alloc.room_id:
            prof.room_id = None

        await uow.db.flush()

        enriched = await _build_enriched_response(alloc, uow.db)
        return APIResponse(success=True, data=enriched)

