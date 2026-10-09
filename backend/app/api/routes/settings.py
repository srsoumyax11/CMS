from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone

from app.core.uow import UnitOfWork
from app.api.deps import get_uow, get_current_user, require_permission
from app.models.user import User
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.settings import SystemSettingCreateUpdate, SystemSettingResponse, SystemSettingListResponse
from app.services.settings_service import SettingsService
from app.utils.email import send_email_background, _get_smtp_settings

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
    "",
    summary="List System Settings",
    description="Lists all system settings. **Requires:** `system_setting:view`",
    response_model=APIResponse[SystemSettingListResponse]
)
@router.get(
    "/",
    include_in_schema=False,
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
    "",
    summary="Update or Create System Setting",
    description="Sets a system setting value. **Requires:** `system_setting:manage`",
    response_model=APIResponse[SystemSettingResponse]
)
@router.post(
    "/",
    include_in_schema=False,
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

@router.post(
    "/test-email",
    summary="Send Test Email",
    description="Sends a test email to the current logged-in user's email address from the configured SMTP sender address using a Jinja2 email template. **Requires:** `system_setting:view` or `system_setting:manage`",
    response_model=APIResponse[dict]
)
async def send_test_email(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
):
    if not current_user.email:
        raise HTTPException(status_code=400, detail="Current logged in user does not have a valid email address.")

    service = SettingsService(uow)
    global_enabled = await service.get_setting("global_email_enabled", "false")
    if global_enabled and global_enabled.lower() != "true":
        raise HTTPException(
            status_code=400,
            detail="Global email sending is disabled in System Settings. Please enable 'global_email_enabled' first."
        )

    smtp_config = await _get_smtp_settings()
    if not smtp_config:
        raise HTTPException(status_code=400, detail="SMTP settings are incomplete or disabled.")

    sender_email = (
        smtp_config.get("smtp_sender_email") or 
        smtp_config.get("smtp_from_address") or 
        "noreply@cms.com"
    )
    smtp_host = smtp_config.get("smtp_host", "127.0.0.1")
    smtp_port = smtp_config.get("smtp_port", "587")

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    context = {
        "name": current_user.name or current_user.email.split("@")[0] or "User",
        "recipient_email": current_user.email,
        "sender_email": sender_email,
        "smtp_host": smtp_host,
        "smtp_port": smtp_port,
        "timestamp": now_str,
    }

    send_email_background(
        background_tasks=background_tasks,
        to_email=current_user.email,
        subject="[CampusOne] SMTP Configuration Test Email",
        template_name="test_email.html",
        context=context
    )

    return APIResponse(
        success=True,
        data={
            "recipient": current_user.email,
            "sender": sender_email,
            "host": smtp_host,
            "port": smtp_port,
        },
        message=f"Test email successfully sent to {current_user.email} from {sender_email}"
    )

