from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from uuid import UUID

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.schemas.common import APIResponse
from app.api.deps import get_current_user

router = APIRouter(tags=["Notifications"])

@router.get(
    "", 
    summary="List My Notifications", 
    response_model=APIResponse[NotificationListResponse]
)
async def list_my_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Notification).where(Notification.user_id == current_user.id).order_by(desc(Notification.created_at)).limit(50)
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    unread_stmt = select(func.count()).where(Notification.user_id == current_user.id, Notification.is_read == False)
    unread_res = await db.execute(unread_stmt)
    unread_count = unread_res.scalar_one()
    
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Notification).where(Notification.id == id, Notification.user_id == current_user.id)
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    
    return APIResponse(success=True, data=NotificationResponse.model_validate(notification))

@router.patch(
    "/read-all", 
    summary="Mark All Notifications as Read", 
    response_model=APIResponse[bool]
)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False)
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    
    for notification in notifications:
        notification.is_read = True
        
    await db.commit()
    return APIResponse(success=True, data=True)
