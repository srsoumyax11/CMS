from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select
from fastapi import BackgroundTasks

from app.core.uow import UnitOfWork
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import StudentProfile, FacultyProfile, StaffProfile, ParentProfile, AcademicStatus, EmploymentStatus
from app.models.notification import Notification, NotificationType
from app.models.rbac import Role
from app.schemas.application import (
    RoleApplicationCreateRequest, 
    RoleApplicationResponse,
    StudentApplicationPayload,
    FacultyApplicationPayload,
    StaffApplicationPayload,
    ParentApplicationPayload
)
from app.utils.email import send_email_background
from typing import Any

def _parse_uuid(val: Any) -> Optional[UUID]:
    if not val:
        return None
    if isinstance(val, UUID):
        return val
    try:
        return UUID(str(val))
    except (ValueError, TypeError):
        return None

class ApplicationService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def submit_application(self, user: User, req: RoleApplicationCreateRequest) -> RoleApplicationResponse:
        # Security Guard 1: Admins cannot submit role applications
        if user.user_type == UserType.admin:
            raise ValueError("Administrator accounts cannot apply for student/faculty/staff/parent roles.")

        # Security Guard 2: Active domain users cannot apply again
        if user.user_type != UserType.user:
            raise ValueError(f"Your account is already active as a {user.user_type.value.capitalize()}. Role applications are only for unassigned users.")

        target = req.target_role.lower().strip()
        if target not in ["student", "parent", "faculty", "staff"]:
            raise ValueError("Invalid target role. Must be student, parent, faculty, or staff.")

        # Check existing pending application
        if user.account_status == AccountStatus.pending and user.target_role:
            raise ValueError("You already have an application under review.")

        # Strict Pydantic Payload Sanitization & Schema Validation
        try:
            if target == "student":
                validated_payload = StudentApplicationPayload.model_validate(req.data)
                sanitized_data = validated_payload.model_dump(mode="json")
            elif target == "faculty":
                validated_payload = FacultyApplicationPayload.model_validate(req.data)
                sanitized_data = validated_payload.model_dump(mode="json")
            elif target == "staff":
                validated_payload = StaffApplicationPayload.model_validate(req.data)
                sanitized_data = validated_payload.model_dump(mode="json")
            elif target == "parent":
                validated_payload = ParentApplicationPayload.model_validate(req.data)
                sanitized_data = validated_payload.model_dump(mode="json")
            else:
                sanitized_data = req.data
        except Exception as e:
            raise ValueError(f"Invalid application data payload for {target}: {str(e)}")

        # Parent child validation
        if target == "parent":
            child_identifier = sanitized_data.get("student_id_str", "").strip()
            if not child_identifier:
                raise ValueError("Parent application requires student_id_str (Student Reg No, Roll No, or Email).")
            
            stmt = select(User).outerjoin(StudentProfile, User.id == StudentProfile.user_id).where(
                (User.email.ilike(child_identifier)) |
                (User.name.ilike(child_identifier)) |
                (StudentProfile.registration_no == child_identifier) |
                (StudentProfile.roll_no == child_identifier)
            )
            res = await self.uow.db.execute(stmt)
            child_user = res.scalars().first()
            if not child_user:
                raise ValueError(f"Student with Reg No, Roll No, or Email '{child_identifier}' not found.")

        async with self.uow.transaction():
            user.target_role = target
            user.application_data = sanitized_data
            user.account_status = AccountStatus.pending
            user.status_note = None

        await self.uow.db.refresh(user)

        now = datetime.now(timezone.utc)
        return RoleApplicationResponse(
            id=user.id,
            user_id=user.id,
            applicant_name=user.name,
            applicant_email=user.email,
            target_role=user.target_role or target,
            application_data=user.application_data or {},
            status=user.account_status.value,
            admin_notes=user.status_note,
            reviewed_by=None,
            created_at=user.created_at or now,
            updated_at=user.updated_at or now
        )


    async def _enrich_application_data(self, data: dict) -> dict:
        if not data:
            return {}
        enriched = dict(data)
        from app.models.academic import Course, Department
        
        c_id = _parse_uuid(data.get("course_id"))
        if c_id and "course_name" not in enriched:
            c = await self.uow.db.get(Course, c_id)
            if c:
                enriched["course_name"] = c.name

        d_id = _parse_uuid(data.get("department_id"))
        if d_id and "department_name" not in enriched:
            d = await self.uow.db.get(Department, d_id)
            if d:
                enriched["department_name"] = d.name

        return enriched

    async def get_my_status(self, user: User) -> Optional[RoleApplicationResponse]:
        if not user.target_role or user.user_type != UserType.user:
            return None

        now = datetime.now(timezone.utc)
        enriched_data = await self._enrich_application_data(user.application_data or {})
        return RoleApplicationResponse(
            id=user.id,
            user_id=user.id,
            applicant_name=user.name,
            applicant_email=user.email,
            target_role=user.target_role,
            application_data=enriched_data,
            status=user.account_status.value,
            admin_notes=user.status_note,
            reviewed_by=None,
            created_at=user.created_at or now,
            updated_at=user.updated_at or now
        )

    async def list_applications(self, status: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[RoleApplicationResponse]:
        stmt = select(User).where(User.target_role.is_not(None))
        if status:
            stmt = stmt.where(User.account_status == status)
        else:
            stmt = stmt.where(User.account_status == AccountStatus.pending)
            
        stmt = stmt.offset(skip).limit(limit)
        res = await self.uow.db.execute(stmt)
        users = res.scalars().all()

        now = datetime.now(timezone.utc)
        results = []
        for u in users:
            enriched_data = await self._enrich_application_data(u.application_data or {})
            results.append(RoleApplicationResponse(
                id=u.id,
                user_id=u.id,
                applicant_name=u.name,
                applicant_email=u.email,
                target_role=u.target_role or "student",
                application_data=enriched_data,
                status=u.account_status.value,
                admin_notes=u.status_note,
                reviewed_by=None,
                created_at=u.created_at or now,
                updated_at=u.updated_at or now
            ))
        return results


    async def approve_application(self, target_user_id: UUID, reviewer: User, admin_notes: Optional[str] = None, background_tasks: Optional[BackgroundTasks] = None) -> RoleApplicationResponse:
        stmt = select(User).where(User.id == target_user_id)
        res = await self.uow.db.execute(stmt)
        user = res.scalars().first()
        if not user or not user.target_role:
            raise ValueError("Application / User not found.")

        if user.account_status != AccountStatus.pending:
            raise ValueError(f"User application status is already {user.account_status.value}.")

        target = user.target_role.lower()
        data = user.application_data or {}

        async with self.uow.transaction():
            if target == "student":
                user.user_type = UserType.student
                course_id = _parse_uuid(data.get("course_id"))
                department_id = _parse_uuid(data.get("department_id"))
                if not course_id or not department_id:
                    raise ValueError("Application data is missing valid course_id or department_id.")

                reg_no = str(data.get("registration_no") or data.get("user_id_str") or f"230123{str(uuid.uuid4().int)[:4]}").strip()
                profile = StudentProfile(
                    user_id=user.id,
                    registration_no=reg_no,
                    roll_no=data.get("roll_no"),
                    course_id=course_id,
                    department_id=department_id,
                    admission_year=int(data.get("admission_year", 2024)),
                    current_semester=int(data.get("current_semester", 1)),
                    section=data.get("section", "A"),
                    year=int(data.get("year", 1)),
                    academic_status=AcademicStatus.enrolled
                )
                self.uow.db.add(profile)

            elif target == "parent":
                user.user_type = UserType.parent
                child_identifier = data.get("student_id_str", "").strip()
                stmt_c = select(User).outerjoin(StudentProfile, User.id == StudentProfile.user_id).where(
                    (User.email.ilike(child_identifier)) |
                    (User.name.ilike(child_identifier)) |
                    (StudentProfile.registration_no == child_identifier) |
                    (StudentProfile.roll_no == child_identifier)
                )
                res_c = await self.uow.db.execute(stmt_c)
                child_user = res_c.scalars().first()
                if not child_user:
                    raise ValueError(f"Child student '{child_identifier}' not found.")
                
                p_profile = ParentProfile(
                    user_id=user.id,
                    student_id=child_user.id,
                    relationship_type=data.get("relationship_type", "Parent"),
                    emergency_contact=data.get("emergency_contact")
                )
                self.uow.db.add(p_profile)

                # Create pending ParentLinkRequest requiring student consent
                from app.models.parent_link import ParentLinkRequest, ParentLinkStatus
                link_req = ParentLinkRequest(
                    parent_user_id=user.id,
                    student_id=child_user.id,
                    relationship_type=data.get("relationship_type", "Parent"),
                    status=ParentLinkStatus.pending,
                    share_gate_pass=True,
                    share_attendance=True,
                    share_marksheet=True,
                    share_outpass=True
                )
                self.uow.db.add(link_req)

                # Notify student of pending guardian link request
                child_notif = Notification(
                    user_id=child_user.id,
                    title="Guardian Linking Request Received 🔔",
                    message=f"{user.name} ({user.email}) requested to link as your {data.get('relationship_type', 'Parent')}. Please review and configure privacy sharing consents.",
                    type=NotificationType.info,
                    link="/student/profile"
                )
                self.uow.db.add(child_notif)


            elif target == "faculty":
                user.user_type = UserType.faculty
                course_id = _parse_uuid(data.get("course_id"))
                department_id = _parse_uuid(data.get("department_id"))
                if not course_id or not department_id:
                    raise ValueError("Application data is missing valid course_id or department_id.")

                f_profile = FacultyProfile(
                    user_id=user.id,
                    course_id=course_id,
                    department_id=department_id,
                    designation=data.get("designation", "Faculty"),
                    employment_status=EmploymentStatus.active
                )
                self.uow.db.add(f_profile)

            elif target == "staff":
                user.user_type = UserType.staff
                dept_id = _parse_uuid(data.get("department_id"))
                s_profile = StaffProfile(
                    user_id=user.id,
                    department_id=dept_id,
                    designation=data.get("designation", "Staff"),
                    employment_status=EmploymentStatus.active
                )
                self.uow.db.add(s_profile)

            # Assign RBAC Role if role exists in DB
            stmt_r = select(Role).where(Role.name.ilike(target))
            res_r = await self.uow.db.execute(stmt_r)
            target_rbac_role = res_r.scalars().first()
            if target_rbac_role:
                user.role_id = target_rbac_role.id

            # Update User Account Status
            user.account_status = AccountStatus.active
            user.status_note = admin_notes

            # Create In-App Notification
            notif = Notification(
                user_id=user.id,
                title="Role Application Approved! 🎉",
                message=f"Congratulations! Your application for {target.capitalize()} role has been approved by the admin.",
                type=NotificationType.success
            )
            self.uow.db.add(notif)

        await self.uow.db.refresh(user)

        # Email Notification
        if background_tasks and user and user.email:
            send_email_background(
                background_tasks=background_tasks,
                to_email=user.email,
                subject="Role Request Approved - BPUT CMS",
                template_name="role_application_status.html",
                context={
                    "name": user.name or "User",
                    "target_role": target.capitalize(),
                    "status": "approved",
                    "admin_notes": admin_notes,
                    "dashboard_url": "http://localhost:5173/dashboard"
                }
            )

        now = datetime.now(timezone.utc)
        return RoleApplicationResponse(
            id=user.id,
            user_id=user.id,
            applicant_name=user.name,
            applicant_email=user.email,
            target_role=user.target_role or target,
            application_data=user.application_data or {},
            status="approved",
            admin_notes=admin_notes,
            reviewed_by=reviewer.id,
            created_at=user.created_at or now,
            updated_at=now
        )

    async def reject_application(self, target_user_id: UUID, reviewer: User, admin_notes: Optional[str] = None, background_tasks: Optional[BackgroundTasks] = None) -> RoleApplicationResponse:
        stmt = select(User).where(User.id == target_user_id)
        res = await self.uow.db.execute(stmt)
        user = res.scalars().first()
        if not user or not user.target_role:
            raise ValueError("Application / User not found.")

        async with self.uow.transaction():
            user.account_status = AccountStatus.rejected
            user.status_note = admin_notes

            notif = Notification(
                user_id=user.id,
                title="Role Application Update",
                message=f"Your application for {user.target_role.capitalize()} role was not approved. {f'Note: {admin_notes}' if admin_notes else ''}",
                type=NotificationType.warning
            )
            self.uow.db.add(notif)

        await self.uow.db.refresh(user)

        # Trigger Email Notification
        if background_tasks and user and user.email:
            send_email_background(
                background_tasks=background_tasks,
                to_email=user.email,
                subject="Role Request Update - BPUT CMS",
                template_name="role_application_status.html",
                context={
                    "name": user.name or "User",
                    "target_role": user.target_role.capitalize(),
                    "status": "rejected",
                    "admin_notes": admin_notes,
                    "dashboard_url": "http://localhost:5173/user"
                }
            )

        now = datetime.now(timezone.utc)
        return RoleApplicationResponse(
            id=user.id,
            user_id=user.id,
            applicant_name=user.name,
            applicant_email=user.email,
            target_role=user.target_role,
            application_data=user.application_data or {},
            status="rejected",
            admin_notes=admin_notes,
            reviewed_by=reviewer.id,
            created_at=user.created_at or now,
            updated_at=now
        )
