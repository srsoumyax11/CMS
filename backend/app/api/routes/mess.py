from typing import Any, Set
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
import datetime
from zoneinfo import ZoneInfo
from uuid import UUID

from app.core.database import get_db
from app.models.user import User
from app.models.mess import MessMenu, MessFeedback, MessOptOut, DayOfWeek, MealType
from app.api.deps import get_current_user, require_permission, get_user_permissions
from app.core.permissions import Perms
from app.schemas.mess import (
    MessMenuCreate,
    MessAnalyticsResponse,
    MealRatingAgg,
    OptOutAgg,
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

@router.post("/menu", response_model=APIResponse)
async def create_or_update_menu(
    payload: MessMenuCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.MESS_MANAGE))
) -> Any:
    stmt = insert(MessMenu).values(
        day_of_week=payload.day_of_week,
        meal_type=payload.meal_type,
        items=payload.items
    )
    stmt = stmt.on_conflict_do_update(
        constraint="uq_mess_menu_day_meal",
        set_={"items": payload.items}
    )
    
    await db.execute(stmt)
    await db.commit()
    
    return APIResponse(success=True, message="Mess menu updated successfully")

@router.get("/analytics/today", response_model=APIResponse)
async def get_analytics_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Perms.MESS_MANAGE))
) -> Any:
    today = get_now_ist().date()
    tomorrow = today + datetime.timedelta(days=1)
    
    # 1. Average Rating for Today
    avg_stmt = select(
        MessFeedback.meal_type,
        func.avg(MessFeedback.rating).label("avg_rating"),
        func.count(MessFeedback.id).label("total_reviews")
    ).where(
        MessFeedback.date == today
    ).group_by(MessFeedback.meal_type)
    
    avg_res = await db.execute(avg_stmt)
    avg_rows = avg_res.all()
    
    ratings_agg = [
        MealRatingAgg(
            meal_type=row.meal_type, 
            average_rating=float(row.avg_rating) if row.avg_rating else 0.0, 
            total_reviews=row.total_reviews
        ) for row in avg_rows
    ]
    
    # 2. Opt-Outs for Today and Tomorrow
    optout_stmt = select(
        MessOptOut.date,
        MessOptOut.meal_type,
        func.count(MessOptOut.id).label("total_opt_outs")
    ).where(
        MessOptOut.date.in_([today, tomorrow])
    ).group_by(MessOptOut.date, MessOptOut.meal_type)
    
    optout_res = await db.execute(optout_stmt)
    optout_rows = optout_res.all()
    
    optout_agg = [
        OptOutAgg(
            date=row.date,
            meal_type=row.meal_type,
            total_opt_outs=row.total_opt_outs
        ) for row in optout_rows
    ]
    
    data = MessAnalyticsResponse(
        today_average_ratings=ratings_agg,
        opt_outs_today_tomorrow=optout_agg
    ).model_dump()
    
    return APIResponse(success=True, data=data)
