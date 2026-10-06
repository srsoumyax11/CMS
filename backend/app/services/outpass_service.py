from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from fastapi import BackgroundTasks

from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.models.outpass import Outpass, OutpassStatus, OutpassStatusLog
from app.models.user import User
from app.models.notification import Notification, NotificationType
from app.schemas.outpass import OutpassCreateRequest, OutpassRejectRequest
from app.repositories.outpass_repository import OutpassRepository
from app.utils.email import send_email_background
from app.core.uow import UnitOfWork

class OutpassService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.db = uow.db
        self.repository = OutpassRepository(self.db)

    async def request_outpass(self, request: OutpassCreateRequest, current_user: User) -> Outpass:
        if request.expected_return_time <= request.departure_time:
            raise ValueError("Expected return time must be after departure time")

        overlapping = await self.repository.get_overlapping(
            current_user.id, request.departure_time, request.expected_return_time
        )
        if overlapping:
            raise ValueError(f"Overlapping outpass found from {overlapping.departure_time} to {overlapping.expected_return_time}")

        new_outpass = Outpass(
            student_id=current_user.id,
            destination=request.destination,
            reason=request.reason,
            departure_time=request.departure_time,
            expected_return_time=request.expected_return_time,
            status=OutpassStatus.pending
        )
        self.db.add(new_outpass)
        await self.db.flush()
        
        status_log = OutpassStatusLog(
            outpass_id=new_outpass.id,
            status=OutpassStatus.pending,
            changed_by=current_user.id,
            note="Outpass requested"
        )
        self.db.add(status_log)
        await self.db.flush()
        await self.db.refresh(new_outpass)
        return new_outpass

    async def list_my_outpasses(self, current_user: User, skip: int = 0, limit: int = 20) -> Tuple[List[Outpass], int]:
        return await self.repository.list_by_student(current_user.id, skip, limit)

    async def list_all_outpasses(
        self, 
        status: Optional[OutpassStatus] = None, 
        is_overdue: Optional[bool] = None, 
        department_id: Optional[UUID] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> Tuple[List[Outpass], int]:
        return await self.repository.list_all(status, is_overdue, department_id, skip, limit)

    async def get_outpass(self, outpass_id: UUID) -> Optional[Outpass]:
        return await self.repository.get_by_id(outpass_id)
        
    async def get_outpass_with_student(self, outpass_id: UUID) -> Optional[Outpass]:
        return await self.repository.get_with_student(outpass_id)

    async def cancel_outpass(self, outpass: Outpass, current_user: User) -> Outpass:
        if outpass.student_id != current_user.id:
            raise PermissionError("Not authorized to cancel this outpass")
            
        if outpass.status not in [OutpassStatus.pending, OutpassStatus.approved]:
            raise ValueError(f"Cannot transition from {outpass.status} to {OutpassStatus.cancelled}")
            
        outpass.status = OutpassStatus.cancelled
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.cancelled,
            changed_by=current_user.id,
            note="Cancelled by student"
        )
        self.db.add(status_log)
        await self.db.flush()
        await self.db.refresh(outpass)
        return outpass

    def _verify_department_scope(self, outpass: Outpass, scope_dept_id: Optional[UUID]):
        if scope_dept_id is None:
            return
        student_dept_id = None
        if outpass.student and outpass.student.student_profile:
            student_dept_id = outpass.student.student_profile.department_id
        if student_dept_id != scope_dept_id:
            raise PermissionError("Not authorized to approve or manage outpasses outside your department scope.")

    async def _notify_parent_if_consented(self, outpass: Outpass, action_title: str, action_message: str):
        from app.models.parent_link import ParentLinkRequest, ParentLinkStatus
        link_stmt = select(ParentLinkRequest).where(
            ParentLinkRequest.student_id == outpass.student_id,
            ParentLinkRequest.status == ParentLinkStatus.approved,
            ParentLinkRequest.share_outpass == True
        )
        link_reqs = (await self.db.execute(link_stmt)).scalars().all()
        for req in link_reqs:
            if req.parent_user_id:
                notif = Notification(
                    user_id=req.parent_user_id,
                    title=action_title,
                    message=action_message,
                    type=NotificationType.info,
                    link="/parent/safety"
                )
                self.db.add(notif)

    async def approve_outpass(
        self,
        outpass: Outpass,
        current_user: User,
        background_tasks: BackgroundTasks,
        scope_dept_id: Optional[UUID] = None
    ) -> Outpass:
        self._verify_department_scope(outpass, scope_dept_id)

        if outpass.status != OutpassStatus.pending:
            raise ValueError(f"Cannot transition from {outpass.status} to {OutpassStatus.approved}")
            
        outpass.status = OutpassStatus.approved
        outpass.approved_by = current_user.id
        
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.approved,
            changed_by=current_user.id,
            note="Approved by faculty/admin"
        )
        self.db.add(status_log)
        
        notification = Notification(
            user_id=outpass.student_id,
            title="Outpass Approved",
            message=f"Your outpass to {outpass.destination} has been approved.",
            type=NotificationType.success,
            link="/dashboard/outpasses"
        )
        self.db.add(notification)

        # Dispatch alert to approved parent guardians
        await self._notify_parent_if_consented(
            outpass,
            "Guardian Update: Outpass Approved",
            f"An outpass to {outpass.destination} for {outpass.student.name if outpass.student else 'student'} has been approved."
        )
        
        if outpass.student and outpass.student.email_notifications:
            send_email_background(
                background_tasks=background_tasks,
                to_email=outpass.student.email,
                subject="Outpass Approved",
                template_name="outpass_status.html",
                context={
                    "name": outpass.student.name,
                    "destination": outpass.destination,
                    "status": "approved",
                    "departure_time": outpass.departure_time.strftime("%Y-%m-%d %H:%M"),
                    "expected_return_time": outpass.expected_return_time.strftime("%Y-%m-%d %H:%M"),
                    "reason": outpass.reason,
                    "reviewer_notes": "Approved by faculty/admin"
                }
            )
            
        await self.db.flush()
        await self.db.refresh(outpass)
        return outpass

    async def reject_outpass(
        self,
        outpass: Outpass,
        request: OutpassRejectRequest,
        current_user: User,
        background_tasks: BackgroundTasks,
        scope_dept_id: Optional[UUID] = None
    ) -> Outpass:
        self._verify_department_scope(outpass, scope_dept_id)

        if outpass.status != OutpassStatus.pending:
            raise ValueError(f"Cannot transition from {outpass.status} to {OutpassStatus.rejected}")
            
        outpass.status = OutpassStatus.rejected
        note = request.note or "Rejected by faculty/admin"
        
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.rejected,
            changed_by=current_user.id,
            note=note
        )
        self.db.add(status_log)
        
        notification = Notification(
            user_id=outpass.student_id,
            title="Outpass Rejected",
            message=f"Your outpass to {outpass.destination} was rejected. Note: {note}",
            type=NotificationType.error,
            link="/dashboard/outpasses"
        )
        self.db.add(notification)
        
        if outpass.student and outpass.student.email_notifications:
            send_email_background(
                background_tasks=background_tasks,
                to_email=outpass.student.email,
                subject="Outpass Rejected",
                template_name="outpass_status.html",
                context={
                    "name": outpass.student.name,
                    "destination": outpass.destination,
                    "status": "rejected",
                    "departure_time": outpass.departure_time.strftime("%Y-%m-%d %H:%M"),
                    "expected_return_time": outpass.expected_return_time.strftime("%Y-%m-%d %H:%M"),
                    "reason": outpass.reason,
                    "reviewer_notes": note
                }
            )
            
        await self.db.flush()
        await self.db.refresh(outpass)
        return outpass

    async def depart_outpass(self, outpass: Outpass, current_user: User) -> Outpass:
        if outpass.status != OutpassStatus.approved:
            raise ValueError(f"Cannot transition from {outpass.status} to {OutpassStatus.active}")
            
        outpass.status = OutpassStatus.active
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.active,
            changed_by=current_user.id,
            note="Departure confirmed at main gate"
        )
        self.db.add(status_log)

        await self._notify_parent_if_consented(
            outpass,
            "Guardian Update: Student Departed Campus",
            f"Student has passed main gate exit for outing to {outpass.destination}."
        )

        await self.db.flush()
        await self.db.refresh(outpass)
        return outpass

    async def return_outpass(self, outpass: Outpass, current_user: User) -> Outpass:
        if outpass.status not in [OutpassStatus.active, OutpassStatus.overdue]:
            raise ValueError(f"Cannot transition from {outpass.status} to {OutpassStatus.completed}")
            
        outpass.status = OutpassStatus.completed
        outpass.actual_return_time = datetime.now(timezone.utc)
        
        status_log = OutpassStatusLog(
            outpass_id=outpass.id,
            status=OutpassStatus.completed,
            changed_by=current_user.id,
            note="Return confirmed at main gate"
        )
        self.db.add(status_log)

        await self._notify_parent_if_consented(
            outpass,
            "Guardian Update: Student Safely Returned",
            f"Student has safely checked in at main gate from outing to {outpass.destination}."
        )

        await self.db.flush()
        await self.db.refresh(outpass)
        return outpass

    async def trigger_overdue_checks(self, background_tasks: BackgroundTasks) -> int:
        now = datetime.now(timezone.utc)
        stmt = select(Outpass).options(
            joinedload(Outpass.student)
        ).where(
            Outpass.status == OutpassStatus.active,
            Outpass.expected_return_time < now
        )
        overdue_outpasses = (await self.db.execute(stmt)).scalars().all()
        count = 0

        for item in overdue_outpasses:
            item.status = OutpassStatus.overdue
            log = OutpassStatusLog(
                outpass_id=item.id,
                status=OutpassStatus.overdue,
                note="Automatic overdue status flag triggered past return time"
            )
            self.db.add(log)
            
            notif = Notification(
                user_id=item.student_id,
                title="🚨 OUTPASS OVERDUE ALERT",
                message=f"Your return time for {item.destination} has expired. Check in with gate security immediately.",
                type=NotificationType.warning,
                link="/dashboard/outpasses"
            )
            self.db.add(notif)

            await self._notify_parent_if_consented(
                item,
                "🚨 Guardian Alert: Outpass Overdue",
                f"Student {item.student.name if item.student else 'Child'} has exceeded expected return time for outing to {item.destination}."
            )
            count += 1

        if count > 0:
            await self.db.flush()

        return count
