from typing import Any, Set
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
import datetime
from zoneinfo import ZoneInfo

from app.core.database import get_db
from app.models.user import User
from app.models.mess import MessMenu, MessFeedback, MessOptOut, MealType
from app.api.deps import require_permission
from app.core.permissions import Perms
from app.schemas.mess import MessMenuCreate, MessAnalyticsResponse, MealRatingAgg, OptOutAgg
from app.schemas.common import APIResponse

router = APIRouter()

IST = ZoneInfo("Asia/Kolkata")

def get_now_ist() -> datetime.datetime:
    return datetime.datetime.now(IST)

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
