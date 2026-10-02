from typing import Any, Set
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from app.models.user import User
from app.api.deps import require_permission, get_user_permissions, get_attendance_service
from app.core.permissions import Perms
from app.schemas.attendance import AttendanceBatchRequest
from app.schemas.common import APIResponse
from app.services.attendance_service import AttendanceService

router = APIRouter(tags=["Attendance"])

@router.get("/roster/{slot_id}", response_model=APIResponse)
async def get_attendance_roster(
    slot_id: UUID,
    service: AttendanceService = Depends(get_attendance_service),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_MARK)),
    user_permissions: Set[str] = Depends(get_user_permissions)
) -> Any:
    """
    Get the student roster for a specific timetable slot.
    """
    try:
        roster = await service.get_attendance_roster(slot_id, current_user, user_permissions)
        return APIResponse(success=True, data=roster)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/batch", response_model=APIResponse)
async def submit_attendance_batch(
    payload: AttendanceBatchRequest,
    service: AttendanceService = Depends(get_attendance_service),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_MARK)),
    user_permissions: Set[str] = Depends(get_user_permissions)
) -> Any:
    """
    Submit a batch of attendance records.
    Uses PostgreSQL Upsert logic to handle updates gracefully.
    """
    try:
        async with service.uow.transaction():
            await service.submit_attendance_batch(payload, current_user, user_permissions)
            return APIResponse(success=True, message="Attendance batch processed successfully")
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/mine/stats", response_model=APIResponse)
async def get_my_attendance_stats(
    service: AttendanceService = Depends(get_attendance_service),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_VIEW))
) -> Any:
    """
    Get aggregated attendance stats for the current user.
    Grouped by subject_name.
    """
    try:
        stats = await service.get_my_attendance_stats(current_user)
        return APIResponse(success=True, data=stats)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
