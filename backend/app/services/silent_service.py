from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from datetime import date, datetime, time, timedelta, timezone
from sqlalchemy import select

from app.core.uow import UnitOfWork
from app.models.settings import UserSilentSetting, SilentMode, SilentSource
from app.models.timetable import TimetableSlot, TimetableException, DayOfWeek, ExceptionType
from app.models.profiles import StudentProfile
from app.schemas.settings import UserSilentSettingRequest, SilentScheduleItem, SilentScheduleResponse

class SilentService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def get_user_silent_setting(self, user_id: UUID) -> UserSilentSetting:
        async with self.uow.transaction() as u:
            setting = await u.user_silent_settings.get_by_user_id(user_id)
            if not setting:
                # Return default setting instance
                setting = UserSilentSetting(
                    user_id=user_id,
                    enabled=True,
                    mode=SilentMode.SILENT,
                    source=SilentSource.TIMETABLE,
                    minutes_before=5,
                    minutes_after=5,
                    allow_emergency=True
                )
            return setting

    async def update_user_silent_setting(self, user_id: UUID, req: UserSilentSettingRequest) -> UserSilentSetting:
        async with self.uow.transaction() as u:
            existing = await u.user_silent_settings.get_by_user_id(user_id)
            if existing:
                update_data = req.model_dump(exclude_unset=True)
                if "mode" in update_data and isinstance(update_data["mode"], str):
                    update_data["mode"] = SilentMode(update_data["mode"].lower())
                if "source" in update_data and isinstance(update_data["source"], str):
                    update_data["source"] = SilentSource(update_data["source"].lower())
                return await u.user_silent_settings.update(existing, update_data)

            setting = UserSilentSetting(
                user_id=user_id,
                enabled=req.enabled,
                mode=SilentMode(req.mode.lower()) if isinstance(req.mode, str) else req.mode,
                source=SilentSource(req.source.lower()) if isinstance(req.source, str) else req.source,
                minutes_before=req.minutes_before,
                minutes_after=req.minutes_after,
                allow_emergency=req.allow_emergency,
                custom_ranges=req.custom_ranges
            )
            return await u.user_silent_settings.create(setting)

    async def get_daily_silent_schedule(self, user_id: UUID, schedule_date: date) -> SilentScheduleResponse:
        setting = await self.get_user_silent_setting(user_id)
        if not setting.enabled:
            return SilentScheduleResponse(date=schedule_date, items=[])

        items: List[SilentScheduleItem] = []
        day_of_week_num = schedule_date.isoweekday() # 1 = Monday ... 7 = Sunday

        async with self.uow.transaction() as u:
            # Check if holiday
            holiday = await u.holidays.get_by_date(schedule_date)
            if holiday and (holiday.applies_to is None):
                # College-wide holiday -> no class silent schedule
                return SilentScheduleResponse(date=schedule_date, items=[])

            # Check Student Profile for class group
            stmt_prof = select(StudentProfile).where(StudentProfile.user_id == user_id)
            prof_res = await u.db.execute(stmt_prof)
            profile = prof_res.scalar_one_or_none()

            slots: List[TimetableSlot] = []
            if profile:
                # Fetch class group slots
                filters = {"class_group_id": profile.course_id, "day_of_week": DayOfWeek(day_of_week_num), "status": True}
                slots_raw, _ = await u.timetable_slots.list(filters={"day_of_week": DayOfWeek(day_of_week_num), "status": True})
                slots = [s for s in slots_raw if s.class_group_id == profile.course_id or s.faculty_user_id == user_id]
            else:
                # Fetch teaching slots
                slots_raw, _ = await u.timetable_slots.list(filters={"faculty_user_id": user_id, "day_of_week": DayOfWeek(day_of_week_num), "status": True})
                slots = slots_raw

            for slot in slots:
                # Check slot exceptions for date
                exc_filters = {"slot_id": slot.id, "date": schedule_date}
                exceptions, _ = await u.timetable_exceptions.list(filters=exc_filters)
                if exceptions and exceptions[0].type == ExceptionType.cancelled:
                    continue

                # Calculate start & end times with buffer minutes
                start_dt = datetime.combine(schedule_date, slot.start_time) - timedelta(minutes=setting.minutes_before)
                end_dt = datetime.combine(schedule_date, slot.end_time) + timedelta(minutes=setting.minutes_after)

                items.append(SilentScheduleItem(
                    title=f"Class Lecture (Slot {slot.id})",
                    start_time=start_dt.strftime("%H:%M"),
                    end_time=end_dt.strftime("%H:%M"),
                    mode=setting.mode
                ))

        return SilentScheduleResponse(date=schedule_date, items=items)

    async def generate_ical_feed(self, user_id: UUID) -> str:
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//CampusOne//Silent Mode Calendar Feed//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:Campus Class Schedule"
        ]

        async with self.uow.transaction() as u:
            # Query student/faculty slots
            slots_raw, _ = await u.timetable_slots.list(limit=200)
            for slot in slots_raw:
                lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:slot-{slot.id}@campusone.edu",
                    f"SUMMARY:Academic Lecture",
                    f"DESCRIPTION:Class lecture schedule for Day {slot.day_of_week.value}",
                    f"DTSTART:20261001T{slot.start_time.strftime('%H%M%S')}",
                    f"DTEND:20261001T{slot.end_time.strftime('%H%M%S')}",
                    "END:VEVENT"
                ])

        lines.append("END:VCALENDAR")
        return "\r\n".join(lines)
