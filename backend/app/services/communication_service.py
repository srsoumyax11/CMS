from typing import List, Tuple, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from fastapi import UploadFile

from app.core.uow import UnitOfWork
from app.models.user import User, UserType
from app.models.notice import Notice, NoticeRead
from app.models.complaint import Complaint, ComplaintStatus, ComplaintCategory, ComplaintVisibility
from app.models.profiles import StudentProfile, FacultyProfile
from app.models.audit import AuditLog

class CommunicationService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    # --- Notices ---

    async def create_notice(self, author: User, data: Dict[str, Any], attachment_url: Optional[str] = None) -> Notice:
        async with self.uow.transaction() as u:
            notice = Notice(
                title=data.get("title"),
                content=data.get("content"),
                author_id=author.id,
                attachment_url=attachment_url,
                target_course_id=data.get("target_course_id"),
                target_department_id=data.get("target_department_id"),
                target_year=data.get("target_year"),
                target_hostel_id=data.get("target_hostel_id"),
                target_user_types=data.get("target_user_types")
            )
            notice = await u.notices.create(notice)
            
            audit = AuditLog(
                user_id=author.id,
                permission_code="notice.create",
                action="create",
                target_type="Notice",
                target_id=str(notice.id),
                result="ALLOWED"
            )
            await u.audit_logs.create(audit)
            return notice

    async def get_my_notices(self, user: User, skip: int = 0, limit: int = 50) -> Tuple[List[Notice], int]:
        # Simple fetch based on target_user_types or generic for now.
        # Advanced feed logic would go here.
        # For this prototype, we'll fetch all. In a real system we filter by user's profile.
        async with self.uow.transaction() as u:
            # Reusing the existing repository logic if it's there, but we updated notice_repo earlier
            # For now just list all
            notices = await u.notices.list(skip=skip, limit=limit)
            return notices, len(notices)

    async def mark_notice_read(self, user: User, notice_id: UUID) -> None:
        async with self.uow.transaction() as u:
            notice = await u.notices.get_by_id(notice_id)
            if not notice:
                raise ValueError("Notice not found")
            
            # Here you'd create a NoticeRead record
            read_record = NoticeRead(notice_id=notice_id, user_id=user.id)
            u.db.add(read_record)
            
    # --- Complaints ---

    async def create_complaint(self, user: User, data: Dict[str, Any], photo_url: Optional[str] = None) -> Complaint:
        async with self.uow.transaction() as u:
            complaint = Complaint(
                raised_by=user.id,
                category=ComplaintCategory(data.get("category")),
                hostel_id=data.get("hostel_id"),
                room_number=data.get("room_number"),
                description=data.get("description"),
                photo_url=photo_url,
                visibility=ComplaintVisibility(data.get("visibility", "public"))
            )
            complaint = await u.complaints.create(complaint)
            return complaint

    async def get_my_complaints(self, user: User, skip: int = 0, limit: int = 50) -> Tuple[List[Complaint], int]:
        async with self.uow.transaction() as u:
            complaints = await u.complaints.list(filters={"raised_by": user.id}, skip=skip, limit=limit)
            return complaints, len(complaints)

    async def list_complaints_for_admin(self, admin_user: User, skip: int = 0, limit: int = 50) -> Tuple[List[Complaint], int]:
        async with self.uow.transaction() as u:
            # If Warden, filter by hostel_id. Otherwise, full access.
            if admin_user.role and admin_user.role.code == "WARDEN":
                # Find hostel managed by this warden
                from app.models.hostel import Hostel
                from sqlalchemy import select
                stmt = select(Hostel).where(Hostel.warden_user_id == admin_user.id)
                res = await u.db.execute(stmt)
                hostel = res.scalar_one_or_none()
                if hostel:
                    complaints = await u.complaints.list(filters={"hostel_id": hostel.id}, skip=skip, limit=limit)
                else:
                    complaints = []
                return complaints, len(complaints)
            else:
                complaints = await u.complaints.list(skip=skip, limit=limit)
                return complaints, len(complaints)

    async def update_complaint_status(self, admin_user: User, complaint_id: UUID, status: str, admin_notes: Optional[str] = None) -> Complaint:
        from app.models.complaint import ComplaintStatusLog
        async with self.uow.transaction() as u:
            complaint = await u.complaints.get_by_id(complaint_id)
            if not complaint:
                raise ValueError("Complaint not found")
            
            new_status = ComplaintStatus(status)
            complaint.status = new_status
            await u.complaints.update(complaint, {})
            
            # Log the change
            log = ComplaintStatusLog(
                complaint_id=complaint.id,
                status=new_status,
                changed_by=admin_user.id,
                note=admin_notes
            )
            u.db.add(log)
            
            audit = AuditLog(
                user_id=admin_user.id,
                permission_code="complaint.update",
                action="update",
                target_type="Complaint",
                target_id=str(complaint.id),
                result="ALLOWED"
            )
            await u.audit_logs.create(audit)
            return complaint
