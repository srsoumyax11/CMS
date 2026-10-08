from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from uuid import UUID
from datetime import date

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.models.timetable import DayOfWeek
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.timetable import (
    TimetableSlotCreate,
    TimetableSlotUpdate,
    TimetableSlotResponse,
    TimetableSlotListResponse,
    TimetableExceptionCreate,
    TimetableExceptionResponse,
    TimetableExceptionListResponse,
    MyScheduleResponse
)
from app.services.timetable_service import TimetableService

router = APIRouter(tags=["Timetable"])

@router.post(
    "/slots",
    summary="Create Timetable Slot",
    description="Creates a new timetable slot after checking for faculty, room, and class group clashes. **Requires:** `timetable:create`",
    response_model=APIResponse[TimetableSlotResponse]
)
async def create_slot(
    req: TimetableSlotCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_CREATE))
):
    service = TimetableService(uow)
    try:
        slot = await service.create_slot(req)
        return APIResponse(success=True, data=TimetableSlotResponse.model_validate(slot))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/slots",
    summary="List Timetable Slots",
    description="Lists timetable slots with optional filters for term, class group, faculty, day of week, and room. **Requires:** `timetable:list`",
    response_model=APIResponse[TimetableSlotListResponse]
)
async def list_slots(
    term_id: Optional[UUID] = Query(None),
    class_group_id: Optional[UUID] = Query(None),
    faculty_user_id: Optional[UUID] = Query(None),
    day_of_week: Optional[DayOfWeek] = Query(None),
    room_location_id: Optional[UUID] = Query(None),
    status: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_LIST))
):
    service = TimetableService(uow)
    slots, total = await service.list_slots(
        term_id=term_id,
        class_group_id=class_group_id,
        faculty_user_id=faculty_user_id,
        day_of_week=day_of_week,
        room_location_id=room_location_id,
        status=status,
        skip=skip,
        limit=limit
    )
    items = [TimetableSlotResponse.model_validate(s) for s in slots]
    return APIResponse(success=True, data=TimetableSlotListResponse(total=total, items=items))

@router.get(
    "/slots/{slot_id}",
    summary="Get Timetable Slot Details",
    description="Fetches details of a specific timetable slot by ID. **Requires:** `timetable:list`",
    response_model=APIResponse[TimetableSlotResponse]
)
async def get_slot(
    slot_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_LIST))
):
    service = TimetableService(uow)
    try:
        slot = await service.get_slot(slot_id)
        return APIResponse(success=True, data=TimetableSlotResponse.model_validate(slot))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put(
    "/slots/{slot_id}",
    summary="Update Timetable Slot",
    description="Updates a timetable slot and checks clash detection. **Requires:** `timetable:edit`",
    response_model=APIResponse[TimetableSlotResponse]
)
async def update_slot(
    slot_id: UUID,
    req: TimetableSlotUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_EDIT))
):
    service = TimetableService(uow)
    try:
        slot = await service.update_slot(slot_id, req)
        return APIResponse(success=True, data=TimetableSlotResponse.model_validate(slot))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete(
    "/slots/{slot_id}",
    summary="Delete Timetable Slot",
    description="Deletes a timetable slot. **Requires:** `timetable:delete`",
    response_model=APIResponse[dict]
)
async def delete_slot(
    slot_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_DELETE))
):
    service = TimetableService(uow)
    try:
        await service.delete_slot(slot_id)
        return APIResponse(success=True, data={"message": "Timetable slot deleted successfully."})
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post(
    "/exceptions",
    summary="Create Timetable Exception",
    description="Registers a cancellation, substitution, or extra class for a slot on a specific date. **Requires:** `timetable:edit`",
    response_model=APIResponse[TimetableExceptionResponse]
)
async def create_exception(
    req: TimetableExceptionCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_EDIT))
):
    service = TimetableService(uow)
    try:
        exc = await service.create_exception(req)
        return APIResponse(success=True, data=TimetableExceptionResponse.model_validate(exc))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/exceptions",
    summary="List Timetable Exceptions",
    description="Lists timetable exceptions filtered by slot ID or date. **Requires:** `timetable:list`",
    response_model=APIResponse[TimetableExceptionListResponse]
)
async def list_exceptions(
    slot_id: Optional[UUID] = Query(None),
    exception_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_LIST))
):
    service = TimetableService(uow)
    exceptions, total = await service.list_exceptions(
        slot_id=slot_id,
        exception_date=exception_date,
        skip=skip,
        limit=limit
    )
    items = [TimetableExceptionResponse.model_validate(e) for e in exceptions]
    return APIResponse(success=True, data=TimetableExceptionListResponse(total=total, items=items))

@router.delete(
    "/exceptions/{exception_id}",
    summary="Delete Timetable Exception",
    description="Deletes a timetable exception. **Requires:** `timetable:edit`",
    response_model=APIResponse[dict]
)
async def delete_exception(
    exception_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_EDIT))
):
    service = TimetableService(uow)
    try:
        await service.delete_exception(exception_id)
        return APIResponse(success=True, data={"message": "Timetable exception deleted successfully."})
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get(
    "/mine",
    summary="Get My Timetable Schedule",
    description="Fetches personalized weekly slot schedule for the logged-in student or faculty member.",
    response_model=APIResponse[MyScheduleResponse]
)
async def get_my_schedule(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_LIST))
):
    service = TimetableService(uow)
    schedule = await service.get_my_schedule(current_user)
    return APIResponse(success=True, data=schedule)
