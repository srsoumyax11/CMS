from typing import Any
from fastapi import APIRouter, Depends, HTTPException

from app.models.user import User
from app.api.deps import require_permission, get_mess_service
from app.core.permissions import Perms
from app.schemas.mess import (
    MessMenuCreate,
    MessMenuResponse,
    MessFeedbackCreate,
    MessFeedbackResponse,
    MessOptOutCreate,
)
from app.schemas.common import APIResponse
from app.services.mess_service import MessService

router = APIRouter(tags=["Mess"])

@router.get("/menu/today", response_model=APIResponse)
async def get_menu_today(
    service: MessService = Depends(get_mess_service),
    current_user: User = Depends(require_permission(Perms.MESS_VIEW))
) -> Any:
    menus = await service.get_menu_today()
    data = [MessMenuResponse.model_validate(m).model_dump() for m in menus]
    return APIResponse(success=True, data=data)

@router.get("/menu/weekly", response_model=APIResponse)
async def get_menu_weekly(
    service: MessService = Depends(get_mess_service),
    current_user: User = Depends(require_permission(Perms.MESS_VIEW))
) -> Any:
    menus = await service.get_menu_weekly()
    data = [MessMenuResponse.model_validate(m).model_dump() for m in menus]
    return APIResponse(success=True, data=data)

@router.post("/feedback", response_model=APIResponse)
async def submit_feedback(
    payload: MessFeedbackCreate,
    service: MessService = Depends(get_mess_service),
    current_user: User = Depends(require_permission(Perms.MESS_FEEDBACK))
) -> Any:
    try:
        async with service.uow.transaction():
            await service.submit_feedback(payload, current_user)
            return APIResponse(success=True, message="Feedback submitted successfully")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/feedback/mine", response_model=APIResponse)
async def get_my_feedback(
    service: MessService = Depends(get_mess_service),
    current_user: User = Depends(require_permission(Perms.MESS_FEEDBACK))
) -> Any:
    feedbacks = await service.get_my_feedback(current_user)
    data = [MessFeedbackResponse.model_validate(f).model_dump() for f in feedbacks]
    return APIResponse(success=True, data=data)

@router.post("/optout", response_model=APIResponse)
async def submit_optout(
    payload: MessOptOutCreate,
    service: MessService = Depends(get_mess_service),
    current_user: User = Depends(require_permission(Perms.MESS_FEEDBACK))
) -> Any:
    try:
        async with service.uow.transaction():
            await service.submit_optout(payload, current_user)
            return APIResponse(success=True, message="Opt-out submitted successfully")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/optout", response_model=APIResponse)
async def cancel_optout(
    payload: MessOptOutCreate,
    service: MessService = Depends(get_mess_service),
    current_user: User = Depends(require_permission(Perms.MESS_FEEDBACK))
) -> Any:
    try:
        async with service.uow.transaction():
            await service.cancel_optout(payload, current_user)
            return APIResponse(success=True, message="Opt-out cancelled successfully")
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/menu", response_model=APIResponse)
async def create_or_update_menu(
    payload: MessMenuCreate,
    service: MessService = Depends(get_mess_service),
    current_user: User = Depends(require_permission(Perms.MESS_MANAGE))
) -> Any:
    try:
        async with service.uow.transaction():
            await service.create_or_update_menu(payload)
            return APIResponse(success=True, message="Mess menu updated successfully")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/analytics/today", response_model=APIResponse)
async def get_analytics_today(
    service: MessService = Depends(get_mess_service),
    current_user: User = Depends(require_permission(Perms.MESS_MANAGE))
) -> Any:
    data = await service.get_analytics_today()
    return APIResponse(success=True, data=data)
