from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from uuid import UUID
from datetime import date

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.attendance import (
    AttendanceSessionCreate, 
    AttendanceSubmitRequest, 
    AttendanceSessionResponse, 
    AttendanceRecordResponse, 
    AttendanceRecordListResponse,
    AttendanceRosterResponse,
    StudentAttendanceStatsResponse
)
from app.services.attendance_service import AttendanceService

router = APIRouter(tags=["Attendance"])

@router.get(
    "/roster",
    summary="Get Attendance Roster for Slot & Date",
    description="Fetches the student roster for a class slot and date with existing attendance status. **Requires:** `attendance:mark`",
    response_model=APIResponse[AttendanceRosterResponse]
)
async def get_session_roster(
    slot_id: UUID = Query(...),
    session_date: date = Query(..., alias="date"),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_MARK))
):
    service = AttendanceService(uow)
    try:
        roster = await service.get_session_roster(current_user.id, slot_id, session_date)
        return APIResponse(success=True, data=AttendanceRosterResponse.model_validate(roster))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/sessions",
    summary="Open Attendance Session",
    description="Opens an attendance session for a specific timetable slot. **Requires:** `attendance:mark`",
    response_model=APIResponse[AttendanceSessionResponse]
)
async def open_session(
    req: AttendanceSessionCreate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_MARK))
):
    service = AttendanceService(uow)
    try:
        session = await service.open_session(current_user.id, req.slot_id, req.date)
        return APIResponse(success=True, data=AttendanceSessionResponse.model_validate(session))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/sessions/{session_id}/submit",
    summary="Submit Attendance Records",
    description="Submits attendance records for a session. **Requires:** `attendance:mark`",
    response_model=APIResponse[dict]
)
async def submit_attendance(
    session_id: UUID,
    req: AttendanceSubmitRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_MARK))
):
    service = AttendanceService(uow)
    try:
        await service.submit_attendance(current_user.id, session_id, [r.model_dump() for r in req.records])
        return APIResponse(success=True, data={"message": "Attendance records saved successfully."})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post(
    "/sessions/{session_id}/lock",
    summary="Lock Attendance Session",
    description="Locks a session to prevent further changes. **Requires:** `attendance:mark`",
    response_model=APIResponse[AttendanceSessionResponse]
)
async def lock_session(
    session_id: UUID,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.ATTENDANCE_MARK))
):
    service = AttendanceService(uow)
    try:
        session = await service.lock_session(current_user.id, session_id)
        return APIResponse(success=True, data=AttendanceSessionResponse.model_validate(session))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get(
    "/mine",
    summary="Get My Attendance Records",
    description="Fetches raw attendance log records for the authenticated student.",
    response_model=APIResponse[AttendanceRecordListResponse]
)
async def get_my_attendance(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AttendanceService(uow)
    records, total = await service.get_student_attendance(current_user.id, skip, limit)
    items = [AttendanceRecordResponse.model_validate(r) for r in records]
    return APIResponse(success=True, data=AttendanceRecordListResponse(total=total, items=items))

@router.get(
    "/mine/stats",
    summary="Get My Attendance Stats & Shortage Alerts",
    description="Returns subject-wise attendance percentage, total conducted, attended, and shortage warning flag (<75%).",
    response_model=APIResponse[StudentAttendanceStatsResponse]
)
async def get_my_attendance_stats(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = AttendanceService(uow)
    stats = await service.get_student_stats(current_user.id)
    return APIResponse(success=True, data=StudentAttendanceStatsResponse.model_validate(stats))

