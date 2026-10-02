from typing import List, Optional, Any
import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError

from app.models.mess import MessMenu, MessFeedback, MessOptOut

class MessRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_menu_by_day(self, day_of_week: str) -> List[MessMenu]:
        stmt = select(MessMenu).where(MessMenu.day_of_week == day_of_week)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_menu_weekly(self) -> List[MessMenu]:
        stmt = select(MessMenu).order_by(MessMenu.day_of_week, MessMenu.meal_type)
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def upsert_menu(self, day_of_week: str, meal_type: str, items: List[str]) -> None:
        stmt = insert(MessMenu).values(
            day_of_week=day_of_week,
            meal_type=meal_type,
            items=items
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_mess_menu_day_meal",
            set_={"items": items}
        )
        await self.db.execute(stmt)

    async def add_feedback(self, feedback: MessFeedback) -> None:
        self.db.add(feedback)
        await self.db.flush()

    async def get_my_feedback(self, student_id: str) -> List[MessFeedback]:
        stmt = select(MessFeedback).where(
            MessFeedback.student_id == student_id
        ).order_by(MessFeedback.date.desc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def add_optout(self, optout: MessOptOut) -> None:
        self.db.add(optout)
        await self.db.flush()

    async def get_optout(self, student_id: str, date: datetime.date, meal_type: str) -> Optional[MessOptOut]:
        stmt = select(MessOptOut).where(
            MessOptOut.student_id == student_id,
            MessOptOut.date == date,
            MessOptOut.meal_type == meal_type
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def delete_optout(self, optout: MessOptOut) -> None:
        await self.db.delete(optout)
        await self.db.flush()

    async def get_avg_rating_by_date(self, target_date: datetime.date) -> List[Any]:
        stmt = select(
            MessFeedback.meal_type,
            func.avg(MessFeedback.rating).label("avg_rating"),
            func.count(MessFeedback.id).label("total_reviews")
        ).where(
            MessFeedback.date == target_date
        ).group_by(MessFeedback.meal_type)
        
        res = await self.db.execute(stmt)
        return res.all()

    async def get_optouts_by_dates(self, dates: List[datetime.date]) -> List[Any]:
        stmt = select(
            MessOptOut.date,
            MessOptOut.meal_type,
            func.count(MessOptOut.id).label("total_opt_outs")
        ).where(
            MessOptOut.date.in_(dates)
        ).group_by(MessOptOut.date, MessOptOut.meal_type)
        
        res = await self.db.execute(stmt)
        return res.all()
