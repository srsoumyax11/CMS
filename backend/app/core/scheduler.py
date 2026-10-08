import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.core.uow import UnitOfWork
from app.models.gate_pass import GatePass, GatePassStatus
from app.models.timetable import AttendanceSession, AttendanceRecord, AttendanceStatus, TimetableSlot
from app.models.user import User
from app.models.profiles import ParentProfile
from app.models.notification import Notification
from app.core.email import EmailService
from app.core.logging import get_logger

logger = get_logger("scheduler")

async def run_overdue_gatepass_check():
    """
    Periodic job: Scans active gate passes that are past expected return time,
    marks them OVERDUE, creates notifications, and sends alert emails.
    """
    logger.info("⏰ Running background overdue gate pass check...")
    async with AsyncSessionLocal() as session:
        uow = UnitOfWork(session)
        async with uow.transaction() as u:
            now_utc = datetime.now(timezone.utc)
            
            stmt = select(GatePass).where(
                GatePass.status.in_([GatePassStatus.out, GatePassStatus.approved]),
                GatePass.expected_return_at.is_not(None),
                GatePass.expected_return_at < now_utc
            )
            res = await u.db.execute(stmt)
            overdue_passes = list(res.scalars().all())

            for pass_obj in overdue_passes:
                pass_obj.status = GatePassStatus.overdue
                await u.gate_passes.update(pass_obj, {})

                # Fetch student user details
                student = await u.users.get_by_id(pass_obj.student_user_id)
                student_name = student.name if student else "Student"
                student_email = student.email if student else ""

                # Notify student
                notif_student = Notification(
                    user_id=pass_obj.student_user_id,
                    title="OVERDUE GATE PASS ALERT",
                    message=f"Your gate pass '{pass_obj.pass_code}' is overdue. Report to security immediately.",
                    type="GATE_PASS"
                )
                await u.notifications.create(notif_student)

                # Fetch linked parent if any
                parent_stmt = select(ParentProfile).where(ParentProfile.student_id == pass_obj.student_user_id)
                parent_res = await u.db.execute(parent_stmt)
                parent_profile = parent_res.scalar_one_or_none()

                if parent_profile:
                    parent_user = await u.users.get_by_id(parent_profile.user_id)
                    if parent_user:
                        notif_parent = Notification(
                            user_id=parent_user.id,
                            title="STUDENT OVERDUE GATE PASS",
                            message=f"Student {student_name}'s gate pass '{pass_obj.pass_code}' is overdue.",
                            type="GATE_PASS"
                        )
                        await u.notifications.create(notif_parent)
                        EmailService.send_overdue_gatepass_alert(
                            parent_user.email,
                            student_name,
                            pass_code=pass_obj.pass_code,
                            expected_return=pass_obj.expected_return_at.strftime("%Y-%m-%d %H:%M UTC") if pass_obj.expected_return_at else "Now"
                        )

                if student_email:
                    EmailService.send_overdue_gatepass_alert(
                        student_email,
                        student_name,
                        pass_code=pass_obj.pass_code,
                        expected_return=pass_obj.expected_return_at.strftime("%Y-%m-%d %H:%M UTC") if pass_obj.expected_return_at else "Now"
                    )

            if overdue_passes:
                logger.info(f"🚨 Processed {len(overdue_passes)} overdue gate passes.")

async def start_background_scheduler():
    """
    Background loop task launcher.
    """
    logger.info("🚀 Background Scheduler Started.")
    while True:
        try:
            await run_overdue_gatepass_check()
        except Exception as e:
            logger.error(f"Error in background scheduler check: {e}")
        # Run every 60 seconds
        await asyncio.sleep(60)
