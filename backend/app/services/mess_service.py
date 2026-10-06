from typing import List, Dict, Any
import datetime
from zoneinfo import ZoneInfo
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.models.mess import MessMenu, MessFeedback, MessOptOut, MealType
from app.schemas.mess import (
    MessMenuCreate,
    MessFeedbackCreate,
    MessOptOutCreate,
    MealRatingAgg,
    OptOutAgg,
    MessAnalyticsResponse,
    MessScanRequest,
    MessScanResponse
)
from app.repositories.mess_repository import MessRepository
from app.core.uow import UnitOfWork

IST = ZoneInfo("Asia/Kolkata")

def get_now_ist() -> datetime.datetime:
    return datetime.datetime.now(IST)

def check_meal_cutoff(target_date: datetime.date, meal_type: MealType):
    now = get_now_ist()
    today = now.date()

    if target_date < today:
        raise ValueError("Cannot modify meal opt-outs for past dates.")

    if target_date == today:
        current_time = now.time()
        if meal_type == MealType.breakfast:
            raise ValueError("Breakfast opt-out closes at 10:00 PM on the previous day.")
        elif meal_type == MealType.lunch and current_time >= datetime.time(9, 0):
            raise ValueError("Lunch opt-out closes at 9:00 AM IST on the same day.")
        elif meal_type == MealType.snacks and current_time >= datetime.time(14, 0):
            raise ValueError("Snacks opt-out closes at 2:00 PM IST on the same day.")
        elif meal_type == MealType.dinner and current_time >= datetime.time(17, 0):
            raise ValueError("Dinner opt-out closes at 5:00 PM IST on the same day.")

    if target_date == today + datetime.timedelta(days=1) and meal_type == MealType.breakfast:
        if now.time() >= datetime.time(22, 0):
            raise ValueError("Breakfast opt-out closes at 10:00 PM on the previous day.")

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
        check_meal_cutoff(payload.date, payload.meal_type)
        
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
        check_meal_cutoff(payload.date, payload.meal_type)
        
        optout = await self.repository.get_optout(current_user.id, payload.date, payload.meal_type)
        if not optout:
            raise ValueError("Opt-out record not found.")
            
        await self.repository.delete_optout(optout)

    async def scan_meal_pass(
        self,
        payload: MessScanRequest,
        staff_user: User
    ) -> MessScanResponse:
        identifier = payload.student_identifier.strip()
        if not identifier:
            raise ValueError("Student identifier (roll number, email, or ID) is required.")

        from sqlalchemy import select, func
        from sqlalchemy.orm import joinedload
        from uuid import UUID
        from app.models.user import User, UserType
        from app.models.profiles import StudentProfile
        from app.models.mess import MessScanLog
        from app.models.outpass import Outpass, OutpassStatus

        student_user = None

        # 1. Search by email
        stmt_email = select(User).options(
            joinedload(User.student_profile)
        ).where(User.user_type == UserType.student, func.lower(User.email) == identifier.lower())
        student_user = (await self.db.execute(stmt_email)).scalars().first()

        # 2. Search by BPUT registration number or roll number
        if not student_user:
            stmt_roll = select(User).join(StudentProfile, StudentProfile.user_id == User.id).options(
                joinedload(User.student_profile)
            ).where(
                User.user_type == UserType.student,
                (func.lower(StudentProfile.registration_no) == identifier.lower()) |
                (func.lower(StudentProfile.roll_no) == identifier.lower())
            )
            student_user = (await self.db.execute(stmt_roll)).scalars().first()

        # 3. Search by UUID
        if not student_user:
            try:
                uid = UUID(identifier)
                stmt_uid = select(User).options(
                    joinedload(User.student_profile)
                ).where(User.user_type == UserType.student, User.id == uid)
                student_user = (await self.db.execute(stmt_uid)).scalars().first()
            except ValueError:
                pass

        if not student_user:
            raise ValueError(f"No active student found matching '{identifier}'. Check roll number or email.")

        today = get_now_ist().date()

        # 1. Check double redemption
        existing_scan = await self.repository.get_scan_log(student_user.id, today, payload.meal_type)
        if existing_scan:
            raise ValueError(f"Meal pass already redeemed for {payload.meal_type.value.upper()} today.")

        # 2. Check student opt-out
        optout = await self.repository.get_optout(student_user.id, today, payload.meal_type)
        if optout:
            raise ValueError(f"Student has opted out of {payload.meal_type.value.upper()} for today.")

        # 3. Check active outpass
        now_dt = get_now_ist()
        outpass_stmt = select(Outpass).where(
            Outpass.student_id == student_user.id,
            Outpass.status.in_([OutpassStatus.active, OutpassStatus.approved]),
            Outpass.departure_time <= now_dt,
            Outpass.expected_return_time >= now_dt
        )
        active_outpass = (await self.db.execute(outpass_stmt)).scalars().first()
        if active_outpass:
            raise ValueError(f"Student is currently away on outpass to '{active_outpass.destination}'. Meal pass inactive.")

        # Log meal pass redemption
        scan_log = MessScanLog(
            student_id=student_user.id,
            date=today,
            meal_type=payload.meal_type,
            scanned_by=staff_user.id
        )
        await self.repository.add_scan_log(scan_log)

        student_roll = getattr(student_user.student_profile, 'roll_number', student_user.email.split('@')[0]) if student_user.student_profile else student_user.email.split('@')[0]

        return MessScanResponse(
            success=True,
            message=f"Meal pass verified successfully! Enjoy your {payload.meal_type.value.capitalize()}.",
            student_name=student_user.name or "Student",
            student_roll=student_roll,
            meal_type=payload.meal_type,
            scanned_at=datetime.datetime.now(datetime.timezone.utc)
        )

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
