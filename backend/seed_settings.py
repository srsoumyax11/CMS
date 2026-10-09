import asyncio
from typing import TypedDict, List
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.settings import SystemSetting
from app.core.config import settings

class SystemSettingDict(TypedDict):
    key: str
    value: str
    category: str
    data_type: str
    description: str
    is_public: bool

DEFAULT_SYSTEM_SETTINGS: List[SystemSettingDict] = [
    # ── General ────────────────────────────────────────────────────────
    {
        "key": "college_name",
        "value": "CampusOne",
        "category": "General",
        "data_type": "string",
        "description": "Official name of the university / college institution.",
        "is_public": True,
    },
    {
        "key": "college_code",
        "value": "CampusOne",
        "category": "General",
        "data_type": "string",
        "description": "Official institution code used for registration & documents.",
        "is_public": True,
    },
    {
        "key": "support_email",
        "value": "support@campusone.edu",
        "category": "General",
        "data_type": "string",
        "description": "Primary support & helpdesk email address.",
        "is_public": True,
    },
    {
        "key": "maintenance_mode",
        "value": "false",
        "category": "General",
        "data_type": "boolean",
        "description": "When enabled, restricts system access to system administrators.",
        "is_public": True,
    },
    {
        "key": "logo_url",
        "value": "/logo.png",
        "category": "General",
        "data_type": "string",
        "description": "Public URL or asset path for the institutional logo.",
        "is_public": True,
    },

    # ── Security ───────────────────────────────────────────────────────
    {
        "key": "max_login_attempts",
        "value": "5",
        "category": "Security",
        "data_type": "number",
        "description": "Maximum failed login attempts before temporary account lockout.",
        "is_public": False,
    },
    {
        "key": "jwt_expire_minutes",
        "value": str(settings.JWT_EXPIRE_MINUTES),
        "category": "Security",
        "data_type": "number",
        "description": "Access token lifetime duration in minutes.",
        "is_public": False,
    },
    {
        "key": "require_2fa_for_admins",
        "value": "false",
        "category": "Security",
        "data_type": "boolean",
        "description": "Enforce mandatory 2-Factor Authentication for administrative users.",
        "is_public": False,
    },
    {
        "key": "session_timeout_minutes",
        "value": "60",
        "category": "Security",
        "data_type": "number",
        "description": "Inactivity timeout in minutes before automatic user logout.",
        "is_public": False,
    },

    # ── SMTP / Email ───────────────────────────────────────────────────
    {
        "key": "smtp_host",
        "value": settings.SMTP_HOST,
        "category": "SMTP",
        "data_type": "string",
        "description": "SMTP mail server hostname.",
        "is_public": False,
    },
    {
        "key": "smtp_port",
        "value": str(settings.SMTP_PORT),
        "category": "SMTP",
        "data_type": "number",
        "description": "SMTP mail server port (587 for TLS, 465 for SSL).",
        "is_public": False,
    },
    {
        "key": "smtp_sender_email",
        "value": settings.SMTP_SENDER_EMAIL,
        "category": "SMTP",
        "data_type": "string",
        "description": "Sender email address for outgoing system emails.",
        "is_public": False,
    },
    {
        "key": "global_email_enabled",
        "value": "true",
        "category": "SMTP",
        "data_type": "boolean",
        "description": "Master toggle for outgoing transactional email notifications.",
        "is_public": False,
    },

    # ── Academic ───────────────────────────────────────────────────────
    {
        "key": "current_academic_year",
        "value": "2026-2027",
        "category": "Academic",
        "data_type": "string",
        "description": "Active academic session year.",
        "is_public": True,
    },
    {
        "key": "current_semester_term",
        "value": "Autumn 2026",
        "category": "Academic",
        "data_type": "string",
        "description": "Active semester term (Autumn/Spring).",
        "is_public": True,
    },
    {
        "key": "min_attendance_percentage",
        "value": "75",
        "category": "Academic",
        "data_type": "number",
        "description": "Minimum required attendance percentage for exam eligibility.",
        "is_public": True,
    },

    # ── Hostel ─────────────────────────────────────────────────────────
    {
        "key": "max_room_capacity_default",
        "value": "3",
        "category": "Hostel",
        "data_type": "number",
        "description": "Default maximum occupant capacity for new hostel rooms.",
        "is_public": False,
    },
    {
        "key": "curfew_time",
        "value": "21:30",
        "category": "Hostel",
        "data_type": "string",
        "description": "Standard hostel gate curfew deadline time.",
        "is_public": True,
    },
]

async def seed_settings():
    async with AsyncSessionLocal() as db:
        seeded_count = 0
        for item in DEFAULT_SYSTEM_SETTINGS:
            stmt = select(SystemSetting).where(SystemSetting.key == item["key"])
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if not existing:
                setting_obj = SystemSetting(
                    key=item["key"],
                    value=item["value"],
                    category=item["category"],
                    data_type=item["data_type"],
                    description=item["description"],
                    is_public=item["is_public"],
                )
                db.add(setting_obj)
                seeded_count += 1
            else:
                # Update description / is_public metadata and default SMTP host/port values
                existing.category = item["category"]
                existing.data_type = item["data_type"]
                existing.description = item["description"]
                existing.is_public = item["is_public"]
                if item["category"] == "SMTP":
                    existing.value = item["value"]

        await db.commit()
        print(f"✅ System settings seeded successfully ({seeded_count} new settings added).")

if __name__ == "__main__":
    asyncio.run(seed_settings())
