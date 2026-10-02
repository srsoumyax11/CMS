from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID

from app.models.user import User
from app.api.deps import require_permission, get_timetable_service
from app.core.permissions import Perms
from app.schemas.timetable import TimetableSlotCreate, TimetableSlotUpdate, TimetableSlotResponse
from app.schemas.common import APIResponse
from app.services.timetable_service import TimetableService

router = APIRouter(tags=["Timetable"])

@router.get("/mine", response_model=APIResponse)
async def get_my_timetable(
    service: TimetableService = Depends(get_timetable_service),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_VIEW))
) -> Any:
    """
    Get the timetable for the current user.
    If student: filter by their course, branch, and year.
    If faculty: filter by their faculty_id.
    """
    try:
        slots = await service.get_my_timetable(current_user)
        return APIResponse(
            success=True,
            data=[TimetableSlotResponse.model_validate(slot).model_dump() for slot in slots]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/", response_model=APIResponse)
async def create_timetable_slot(
    payload: TimetableSlotCreate,
    service: TimetableService = Depends(get_timetable_service),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_MANAGE))
) -> Any:
    """
    Create a new timetable slot.
    """
    try:
        async with service.uow.transaction():
            slot = await service.create_timetable_slot(payload)
            return APIResponse(
                success=True,
                data=TimetableSlotResponse.model_validate(slot).model_dump()
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{slot_id}", response_model=APIResponse)
async def update_timetable_slot(
    slot_id: UUID,
    payload: TimetableSlotUpdate,
    service: TimetableService = Depends(get_timetable_service),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_MANAGE))
) -> Any:
    """
    Update a timetable slot.
    """
    try:
        async with service.uow.transaction():
            slot = await service.update_timetable_slot(slot_id, payload)
            return APIResponse(
                success=True,
                data=TimetableSlotResponse.model_validate(slot).model_dump()
            )
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{slot_id}", response_model=APIResponse)
async def delete_timetable_slot(
    slot_id: UUID,
    service: TimetableService = Depends(get_timetable_service),
    current_user: User = Depends(require_permission(Perms.TIMETABLE_MANAGE))
) -> Any:
    """
    Delete a timetable slot.
    """
    try:
        async with service.uow.transaction():
            await service.delete_timetable_slot(slot_id)
            return APIResponse(
                success=True,
                message="Timetable slot deleted successfully"
            )
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
