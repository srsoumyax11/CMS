from typing import List, Dict, Any
import datetime
from zoneinfo import ZoneInfo
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.models.mess import MessMenu, MessFeedback, MessOptOut
from app.schemas.mess import (
    MessMenuCreate,
    MessFeedbackCreate,
    MessOptOutCreate,
    MealRatingAgg,
    OptOutAgg,
    MessAnalyticsResponse
)
from app.repositories.mess_repository import MessRepository
from app.core.uow import UnitOfWork

IST = ZoneInfo("Asia/Kolkata")

def get_now_ist() -> datetime.datetime:
    return datetime.datetime.now(IST)

def check_10am_cutoff(target_date: datetime.date):
    now = get_now_ist()
    if target_date == now.date():
        if now.time() >= datetime.time(10, 0):
            raise ValueError("Modifications for today's meals close at 10:00 AM.")

class MessService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.db = uow.db
        self.repository = MessRepository(self.db)

    async def get_menu_today(self) -> List[MessMenu]:
        today_weekday_str = get_now_ist().strftime("%A").lower()
        return await self.repository.get_menu_by_day(today_weekday_str)

    async def get_menu_weekly(self) -> List[MessMenu]:
        return await self.repository.get_menu_weekly()

    async def create_or_update_menu(self, payload: MessMenuCreate) -> None:
        await self.repository.upsert_menu(
            payload.day_of_week, 
            payload.meal_type, 
            payload.items
        )

    async def submit_feedback(self, payload: MessFeedbackCreate, current_user: User) -> None:
        feedback = MessFeedback(
            student_id=current_user.id,
            date=payload.date,
            meal_type=payload.meal_type,
            rating=payload.rating,
            comments=payload.comments
        )
        try:
            await self.repository.add_feedback(feedback)
            await self.db.flush()
        except IntegrityError:
            raise ValueError("You have already reviewed this meal.")

    async def get_my_feedback(self, current_user: User) -> List[MessFeedback]:
        return await self.repository.get_my_feedback(current_user.id)

    async def submit_optout(self, payload: MessOptOutCreate, current_user: User) -> None:
        check_10am_cutoff(payload.date)
        
        optout = MessOptOut(
            student_id=current_user.id,
            date=payload.date,
            meal_type=payload.meal_type
        )
        try:
            await self.repository.add_optout(optout)
            await self.db.flush()
        except IntegrityError:
            raise ValueError("You have already opted out of this meal.")

    async def cancel_optout(self, payload: MessOptOutCreate, current_user: User) -> None:
        check_10am_cutoff(payload.date)
        
        optout = await self.repository.get_optout(current_user.id, payload.date, payload.meal_type)
        if not optout:
            raise ValueError("Opt-out record not found.")
            
        await self.repository.delete_optout(optout)

    async def get_analytics_today(self) -> Dict[str, Any]:
        today = get_now_ist().date()
        tomorrow = today + datetime.timedelta(days=1)
        
        avg_rows = await self.repository.get_avg_rating_by_date(today)
        ratings_agg = [
            MealRatingAgg(
                meal_type=row.meal_type, 
                average_rating=float(row.avg_rating) if row.avg_rating else 0.0, 
                total_reviews=row.total_reviews
            ) for row in avg_rows
        ]
        
        optout_rows = await self.repository.get_optouts_by_dates([today, tomorrow])
        optout_agg = [
            OptOutAgg(
                date=row.date,
                meal_type=row.meal_type,
                total_opt_outs=row.total_opt_outs
            ) for row in optout_rows
        ]
        
        return MessAnalyticsResponse(
            today_average_ratings=ratings_agg,
            opt_outs_today_tomorrow=optout_agg
        ).model_dump()
