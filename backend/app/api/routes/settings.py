from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.settings import SystemSettingCreateUpdate, SystemSettingResponse, SystemSettingListResponse
from app.services.settings_service import SettingsService

router = APIRouter(tags=["System Settings"])

@router.get(
    "/public",
    summary="Get Public System Settings",
    description="Public endpoint to fetch unauthenticated settings (college branding, logo, maintenance status).",
    response_model=APIResponse[SystemSettingListResponse]
)
async def get_public_settings(uow: UnitOfWork = Depends(get_uow)):
    service = SettingsService(uow)
    items_raw = await service.list_settings(public_only=True)
    items = [SystemSettingResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=SystemSettingListResponse(total=len(items), items=items))

@router.get(
    "/",
    summary="List System Settings",
    description="Lists all system settings. **Requires:** `system_setting:view`",
    response_model=APIResponse[SystemSettingListResponse]
)
async def list_settings(
    category: Optional[str] = Query(None),
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.SYSTEM_SETTING_VIEW))
):
    service = SettingsService(uow)
    items_raw = await service.list_settings(category=category, public_only=False)
    items = [SystemSettingResponse.model_validate(item) for item in items_raw]
    return APIResponse(success=True, data=SystemSettingListResponse(total=len(items), items=items))

@router.post(
    "/",
    summary="Update or Create System Setting",
    description="Sets a system setting value. **Requires:** `system_setting:manage`",
    response_model=APIResponse[SystemSettingResponse]
)
async def set_setting(
    req: SystemSettingCreateUpdate,
    uow: UnitOfWork = Depends(get_uow),
    current_user: User = Depends(require_permission(Perms.SYSTEM_SETTING_MANAGE))
):
    service = SettingsService(uow)
    try:
        setting = await service.set_setting(req)
        return APIResponse(success=True, data=SystemSettingResponse.model_validate(setting))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
