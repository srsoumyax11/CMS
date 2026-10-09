from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.schemas.common import APIResponse
from app.api.deps import get_current_user, get_notification_service
from app.services.notification_service import NotificationService

router = APIRouter(tags=["Notifications"])

@router.get(
    "", 
    summary="List My Notifications", 
    response_model=APIResponse[NotificationListResponse]
)
async def list_my_notifications(
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_user)
):
    items, unread_count = await service.list_my_notifications(current_user)
    
    return APIResponse(
        success=True, 
        data=NotificationListResponse(
            items=[NotificationResponse.model_validate(i) for i in items],
            unread_count=unread_count
        )
    )

@router.patch(
    "/{id}/read", 
    summary="Mark Notification as Read", 
    response_model=APIResponse[NotificationResponse]
)
async def mark_notification_read(
    id: UUID,
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_user)
):
    try:
        async with service.uow.transaction():
            notification = await service.mark_notification_read(id, current_user)
            return APIResponse(success=True, data=NotificationResponse.model_validate(notification))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch(
    "/read-all", 
    summary="Mark All Notifications as Read", 
    response_model=APIResponse[bool]
)
async def mark_all_notifications_read(
    service: NotificationService = Depends(get_notification_service),
    current_user: User = Depends(get_current_user)
):
    async with service.uow.transaction():
        await service.mark_all_notifications_read(current_user)
        return APIResponse(success=True, data=True)
