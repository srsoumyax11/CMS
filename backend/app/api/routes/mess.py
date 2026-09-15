from typing import Any, Set
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
import datetime
from zoneinfo import ZoneInfo
from uuid import UUID

from app.core.database import get_db
from app.models.user import User
from app.models.mess import MessMenu, MessFeedback, MessOptOut, DayOfWeek
from app.api.deps import get_current_user, require_permission, get_user_permissions
from app.core.permissions import Perms
from app.schemas.mess import (
    MessMenuResponse,
    MessFeedbackCreate,
    MessFeedbackResponse,
    MessOptOutCreate,
    MessOptOutResponse
)
from app.schemas.common import APIResponse

router = APIRouter()

IST = ZoneInfo("Asia/Kolkata")

def get_now_ist() -> datetime.datetime:
    return datetime.datetime.now(IST)

def check_10am_cutoff(target_date: datetime.date):
    now = get_now_ist()
    if target_date == now.date():
        if now.time() >= datetime.time(10, 0):
            raise HTTPException(
                status_code=400,
                detail="Modifications for today's meals close at 10:00 AM."
            )

@router.get("/menu/today", response_model=APIResponse)
async def get_menu_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.MESS_VIEW))
) -> Any:
    today_weekday_str = get_now_ist().strftime("%A").lower()
    
    stmt = select(MessMenu).where(MessMenu.day_of_week == today_weekday_str)
    res = await db.execute(stmt)
    menus = res.scalars().all()
    
    data = [MessMenuResponse.model_validate(m).model_dump() for m in menus]
    return APIResponse(success=True, data=data)

@router.get("/menu/weekly", response_model=APIResponse)
async def get_menu_weekly(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.MESS_VIEW))
) -> Any:
    stmt = select(MessMenu).order_by(MessMenu.day_of_week, MessMenu.meal_type)
    res = await db.execute(stmt)
    menus = res.scalars().all()
    
    data = [MessMenuResponse.model_validate(m).model_dump() for m in menus]
    return APIResponse(success=True, data=data)

@router.post("/feedback", response_model=APIResponse)
async def submit_feedback(
    payload: MessFeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.MESS_FEEDBACK))
) -> Any:
    feedback = MessFeedback(
        student_id=current_user.id,
        date=payload.date,
        meal_type=payload.meal_type,
        rating=payload.rating,
        comments=payload.comments
    )
    db.add(feedback)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="You have already reviewed this meal."
        )
    return APIResponse(success=True, message="Feedback submitted successfully")

@router.get("/feedback/mine", response_model=APIResponse)
async def get_my_feedback(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.MESS_FEEDBACK))
) -> Any:
    stmt = select(MessFeedback).where(
        MessFeedback.student_id == current_user.id
    ).order_by(MessFeedback.date.desc())
    res = await db.execute(stmt)
    feedbacks = res.scalars().all()
    
    data = [MessFeedbackResponse.model_validate(f).model_dump() for f in feedbacks]
    return APIResponse(success=True, data=data)

@router.post("/optout", response_model=APIResponse)
async def submit_optout(
    payload: MessOptOutCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.MESS_FEEDBACK))
) -> Any:
    check_10am_cutoff(payload.date)
    
    optout = MessOptOut(
        student_id=current_user.id,
        date=payload.date,
        meal_type=payload.meal_type
    )
    db.add(optout)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="You have already opted out of this meal."
        )
    return APIResponse(success=True, message="Opt-out submitted successfully")

@router.delete("/optout", response_model=APIResponse)
async def cancel_optout(
    payload: MessOptOutCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.MESS_FEEDBACK))
) -> Any:
    check_10am_cutoff(payload.date)
    
    stmt = select(MessOptOut).where(
        MessOptOut.student_id == current_user.id,
        MessOptOut.date == payload.date,
        MessOptOut.meal_type == payload.meal_type
    )
    res = await db.execute(stmt)
    optout = res.scalar_one_or_none()
    
    if not optout:
        raise HTTPException(status_code=404, detail="Opt-out record not found.")
        
    await db.delete(optout)
    await db.commit()
    
    return APIResponse(success=True, message="Opt-out cancelled successfully")
