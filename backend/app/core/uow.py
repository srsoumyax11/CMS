from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user_repository import UserRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.application_repository import RoleApplicationRepository
from app.repositories.audit_repository import AuditLogRepository
from app.repositories.notification_repository import NotificationRepository
from app.repositories.notice_repository import NoticeRepository
from app.repositories.complaint_repository import ComplaintRepository
from app.repositories.gate_pass_repository import GatePassRepository
from app.repositories.timetable_repository import TimetableSlotRepository, TimetableExceptionRepository
from app.repositories.attendance_repository import AttendanceSessionRepository, AttendanceRecordRepository

class UnitOfWork:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.users = UserRepository(self.db)
        self.roles = RoleRepository(self.db)
        self.role_applications = RoleApplicationRepository(self.db)
        self.audit_logs = AuditLogRepository(self.db)
        self.notifications = NotificationRepository(self.db)
        self.notices = NoticeRepository(self.db)
        self.complaints = ComplaintRepository(self.db)
        self.gate_passes = GatePassRepository(self.db)
        self.timetable_slots = TimetableSlotRepository(self.db)
        self.timetable_exceptions = TimetableExceptionRepository(self.db)
        self.attendance_sessions = AttendanceSessionRepository(self.db)
        self.attendance_records = AttendanceRecordRepository(self.db)

    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator["UnitOfWork", None]:
        """
        Atomic transaction block.
        If an exception is raised, the transaction rolls back.
        If successful, the transaction commits.
        """
        try:
            yield self
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            raise

from fastapi import Depends
from app.core.database import get_db

async def get_uow(db: AsyncSession = Depends(get_db)) -> UnitOfWork:
    return UnitOfWork(db)
