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
from app.repositories.document_repository import DocumentTypeRepository, DocumentRequestRepository, DocumentApprovalRepository
from app.repositories.placement_repository import PlacementNoticeRepository, PlacementApplicationRepository
from app.repositories.academic_repository import (
    DepartmentRepository,
    CourseRepository,
    AcademicTermRepository,
    SubjectRepository,
    ClassGroupRepository,
    HolidayRepository
)
from app.repositories.hostel_repository import HostelRepository, HostelRoomRepository
from app.repositories.settings_repository import SystemSettingRepository, UserSilentSettingRepository
from app.repositories.map_repository import MapLocationRepository, MapPathRepository
from app.repositories.ai_repository import AIConversationRepository, AIMessageRepository

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
        self.document_types = DocumentTypeRepository(self.db)
        self.document_requests = DocumentRequestRepository(self.db)
        self.document_approvals = DocumentApprovalRepository(self.db)
        self.placement_notices = PlacementNoticeRepository(self.db)
        self.placement_applications = PlacementApplicationRepository(self.db)
        self.departments = DepartmentRepository(self.db)
        self.courses = CourseRepository(self.db)
        self.academic_terms = AcademicTermRepository(self.db)
        self.subjects = SubjectRepository(self.db)
        self.class_groups = ClassGroupRepository(self.db)
        self.holidays = HolidayRepository(self.db)
        self.hostels = HostelRepository(self.db)
        self.hostel_rooms = HostelRoomRepository(self.db)
        self.system_settings = SystemSettingRepository(self.db)
        self.user_silent_settings = UserSilentSettingRepository(self.db)
        self.map_locations = MapLocationRepository(self.db)
        self.map_paths = MapPathRepository(self.db)
        self.ai_conversations = AIConversationRepository(self.db)
        self.ai_messages = AIMessageRepository(self.db)





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
