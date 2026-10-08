from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import Optional
from datetime import date
from uuid import UUID

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.settings import (
    UserSilentSettingRequest, UserSilentSettingResponse, SilentScheduleResponse
)
from app.services.silent_service import SilentService

router = APIRouter(tags=["Silent Mode & Calendar Sync"])

@router.get(
    "/settings",
    summary="Get User Silent Mode Preferences",
    description="Retrieve silent/DND mode preference settings for the authenticated user.",
    response_model=APIResponse[UserSilentSettingResponse]
)
async def get_silent_settings(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = SilentService(uow)
    setting = await service.get_user_silent_setting(current_user.id)
    return APIResponse(success=True, data=UserSilentSettingResponse.model_validate(setting))

@router.put(
    "/settings",
    summary="Update User Silent Mode Preferences",
    description="Update pre/post buffer minutes, silent mode (SILENT, VIBRATE, DND), and custom ranges.",
    response_model=APIResponse[UserSilentSettingResponse]
)
async def update_silent_settings(
    req: UserSilentSettingRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = SilentService(uow)
    setting = await service.update_user_silent_setting(current_user.id, req)
    return APIResponse(success=True, data=UserSilentSettingResponse.model_validate(setting))

@router.get(
    "/schedule",
    summary="Get Daily Silent Schedule",
    description="Returns calculated silent mode windows for a specific date considering timetable slots, buffer times, and holidays.",
    response_model=APIResponse[SilentScheduleResponse]
)
async def get_silent_schedule(
    schedule_date: Optional[date] = Query(default_factory=date.today),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = SilentService(uow)
    schedule = await service.get_daily_silent_schedule(current_user.id, schedule_date or date.today())
    return APIResponse(success=True, data=schedule)

@router.get(
    "/ical.ics",
    summary="Download Academic iCal Feed",
    description="Generates an iCalendar (.ics) feed file of class schedules for sync with Google Calendar or Apple Calendar.",
    response_class=Response
)
async def get_ical_feed(
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(get_current_user)
):
    service = SilentService(uow)
    ics_content = await service.generate_ical_feed(current_user.id)
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=academic_schedule_{current_user.id}.ics"}
    )
