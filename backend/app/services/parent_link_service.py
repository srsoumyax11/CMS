import logging
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.core.uow import UnitOfWork
from app.models.parent_link import ParentLinkRequest, ParentLinkStatus
from app.models.user import User, UserType
from app.models.notification import Notification, NotificationType
from app.models.profiles import StudentProfile, ParentProfile
from app.schemas.parent_link import (
    ParentLinkResponse,
    ParentLinkRespondRequest,
    ParentLinkPrivacyUpdateRequest,
    ParentLinkCreateRequest
)
from app.repositories.parent_link_repository import ParentLinkRepository

logger = logging.getLogger(__name__)

class ParentLinkService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.db = uow.db
        self.repository = ParentLinkRepository(self.db)

    async def get_student_link_requests(self, current_user: User) -> List[ParentLinkResponse]:
        if current_user.user_type != UserType.student:
            return []

        raw_items = await self.repository.list_by_student(current_user.id)
        return [self._to_response(item) for item in raw_items]

    async def get_parent_active_link(self, current_user: User) -> Optional[ParentLinkResponse]:
        if current_user.user_type != UserType.parent:
            return None

        link = await self.repository.get_approved_link_for_parent(current_user.id)
        return self._to_response(link) if link else None

    async def respond_to_request(
        self,
        link_id: UUID,
        current_user: User,
        request: ParentLinkRespondRequest
    ) -> ParentLinkResponse:
        link = await self.repository.get_by_id(link_id)
        if not link or link.student_id != current_user.id:
            raise ValueError("Parent link request not found or unauthorized")

        now = datetime.now(timezone.utc)
        action = request.action.lower().strip()

        if action == "approve":
            link.status = ParentLinkStatus.approved
            link.share_gate_pass = request.share_gate_pass
            link.share_attendance = request.share_attendance
            link.share_marksheet = request.share_marksheet
            link.share_outpass = request.share_outpass
            link.responded_at = now

            # In-app notification to parent
            notification = Notification(
                user_id=link.parent_user_id,
                title="Parent Guardian Link Approved! 🎉",
                message=f"{current_user.name} has approved your parent linking request. You can now access the Parent Safety Matrix.",
                type=NotificationType.success,
                link="/parent/safety"
            )
            self.db.add(notification)

        elif action == "reject":
            link.status = ParentLinkStatus.rejected
            link.responded_at = now

            notification = Notification(
                user_id=link.parent_user_id,
                title="Parent Guardian Link Request Update",
                message=f"Your parent link request to student {current_user.name} was not accepted.",
                type=NotificationType.warning
            )
            self.db.add(notification)
        else:
            raise ValueError("Invalid action. Must be 'approve' or 'reject'.")

        await self.db.flush()
        await self.db.refresh(link)
        return self._to_response(link)

    async def update_privacy_consent(
        self,
        link_id: UUID,
        current_user: User,
        request: ParentLinkPrivacyUpdateRequest
    ) -> ParentLinkResponse:
        link = await self.repository.get_by_id(link_id)
        if not link or link.student_id != current_user.id:
            raise ValueError("Parent link request not found or unauthorized")

        link.share_gate_pass = request.share_gate_pass
        link.share_attendance = request.share_attendance
        link.share_marksheet = request.share_marksheet
        link.share_outpass = request.share_outpass

        await self.db.flush()
        await self.db.refresh(link)
        return self._to_response(link)

    async def create_link_request(
        self,
        current_user: User,
        request: ParentLinkCreateRequest
    ) -> ParentLinkResponse:
        if current_user.user_type != UserType.parent:
            raise ValueError("Only users registered as Parents can request student linking.")

        identifier = request.student_identifier.strip()
        if not identifier:
            raise ValueError("Student identifier (roll number, email, or ID) is required.")

        # Resolve target student user
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

        # Check for existing ParentLinkRequest
        existing_link_stmt = select(ParentLinkRequest).where(
            ParentLinkRequest.parent_user_id == current_user.id,
            ParentLinkRequest.student_id == student_user.id
        )
        existing_link = (await self.db.execute(existing_link_stmt)).scalars().first()

        now = datetime.now(timezone.utc)

        if existing_link:
            if existing_link.status == ParentLinkStatus.approved:
                raise ValueError("You are already linked to this student.")
            elif existing_link.status == ParentLinkStatus.pending:
                raise ValueError("A link request for this student is already pending approval.")
            else:
                existing_link.status = ParentLinkStatus.pending
                existing_link.relationship_type = request.relationship_type.upper()
                existing_link.created_at = now
                existing_link.responded_at = None
                link_obj = existing_link
        else:
            link_obj = ParentLinkRequest(
                parent_user_id=current_user.id,
                student_id=student_user.id,
                relationship_type=request.relationship_type.upper(),
                status=ParentLinkStatus.pending,
                share_gate_pass=True,
                share_attendance=True,
                share_marksheet=True,
                share_outpass=True,
                created_at=now
            )
            self.db.add(link_obj)

        # Ensure ParentProfile entry exists
        parent_prof_stmt = select(ParentProfile).where(
            ParentProfile.user_id == current_user.id,
            ParentProfile.student_id == student_user.id
        )
        parent_prof = (await self.db.execute(parent_prof_stmt)).scalars().first()
        if not parent_prof:
            parent_prof = ParentProfile(
                user_id=current_user.id,
                student_id=student_user.id,
                relationship_type=request.relationship_type.upper(),
                emergency_contact=current_user.phone or "N/A"
            )
            self.db.add(parent_prof)

        # Send in-app notification to student
        notification = Notification(
            user_id=student_user.id,
            title="New Guardian Link Request 📩",
            message=f"{current_user.name or 'A parent'} has requested to link with your student profile. Review and approve under Profile settings.",
            type=NotificationType.info,
            link="/profile"
        )
        self.db.add(notification)

        await self.db.flush()
        link_reloaded = await self.repository.get_by_id(link_obj.id)
        return self._to_response(link_reloaded)

    def _to_response(self, item: ParentLinkRequest) -> ParentLinkResponse:
        parent_name = item.parent_user.name if item.parent_user else None
        parent_email = item.parent_user.email if item.parent_user else None
        student_name = item.student_user.name if item.student_user else None
        student_roll = None
        if item.student_user and item.student_user.student_profile:
            prof = item.student_user.student_profile
            student_roll = getattr(prof, 'roll_number', None) or item.student_user.email

        return ParentLinkResponse(
            id=item.id,
            parent_user_id=item.parent_user_id,
            parent_name=parent_name,
            parent_email=parent_email,
            student_id=item.student_id,
            student_name=student_name,
            student_roll=student_roll,
            status=item.status,
            relationship_type=item.relationship_type,
            share_gate_pass=item.share_gate_pass,
            share_attendance=item.share_attendance,
            share_marksheet=item.share_marksheet,
            share_outpass=item.share_outpass,
            created_at=item.created_at,
            responded_at=item.responded_at
        )
