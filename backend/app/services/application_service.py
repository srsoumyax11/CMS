from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, Any, List
from fastapi import BackgroundTasks

from app.core.uow import UnitOfWork
from app.models.user import User, AccountStatus, UserType
from app.models.application import RoleApplication, ApplicationStatus
from app.models.audit import AuditLog
from app.models.notification import Notification, NotificationType
from app.models.profiles import StudentProfile, FacultyProfile, StaffProfile, ParentProfile
from app.models.rbac import Role
from app.schemas.application import RoleApplicationCreateRequest, RoleApplicationResponse

class ApplicationService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def submit_application(self, user: User, req: RoleApplicationCreateRequest) -> RoleApplicationResponse:
        async with self.uow.transaction() as u:
            # Re-fetch user in transaction
            db_user = await u.users.get_by_id(user.id)
            if not db_user:
                raise ValueError("User not found.")
            
            if db_user.account_status in [AccountStatus.pending, AccountStatus.revision]:
                raise ValueError("You already have an application in progress.")
            if db_user.account_status == AccountStatus.active and db_user.user_type != UserType.user:
                raise ValueError("Your account is already active with a profile.")

            role = None
            if req.role_id:
                role = await u.roles.get_by_id(req.role_id)
            elif req.target_role:
                target_code = req.target_role.strip().upper()
                roles, _ = await u.roles.list(filters={"code": target_code})
                if not roles:
                    roles, _ = await u.roles.list(filters={"code": target_code.lower()})
                role = roles[0] if roles else None

            if not role:
                target_name = req.target_role or (str(req.role_id) if req.role_id else "unknown")
                raise ValueError(f"Role '{target_name}' is invalid or not found.")

            form_data = req.application_data or req.data or {}

            app = RoleApplication(
                user_id=db_user.id,
                role_id=role.id,
                form_data=form_data,
                status=ApplicationStatus.submitted
            )
            app = await u.role_applications.create(app)

            db_user.account_status = AccountStatus.pending
            await u.users.update(db_user, {})

            audit = AuditLog(
                actor_id=db_user.id,
                resource_type="RoleApplication",
                resource_id=app.id,
                action="submit",
                new_values={"target_role": role.code, "status": app.status.value},
                reason="Submitted role application"
            )
            await u.audit_logs.create(audit)

            return RoleApplicationResponse(
                id=app.id,
                user_id=app.user_id,
                target_role=role.code,
                status=app.status.value,
                application_data=app.form_data or {},
                admin_notes=app.review_note,
                created_at=app.submitted_at,
                updated_at=app.reviewed_at or app.submitted_at
            )

    async def get_my_status(self, user: User) -> Optional[RoleApplicationResponse]:
        async with self.uow.transaction() as u:
            apps, total = await u.role_applications.list(filters={"user_id": user.id})
            if not apps:
                return None
            
            app = sorted(apps, key=lambda x: x.submitted_at, reverse=True)[0]
            role = await u.roles.get_by_id(app.role_id)
            target_role = role.code if role else "UNKNOWN"
            
            return RoleApplicationResponse(
                id=app.id,
                user_id=app.user_id,
                target_role=target_role,
                status=app.status.value,
                application_data=app.form_data or {},
                admin_notes=app.review_note,
                created_at=app.submitted_at,
                updated_at=app.reviewed_at or app.submitted_at
            )

    async def list_applications(self, status: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[RoleApplicationResponse]:
        async with self.uow.transaction() as u:
            kwargs = {}
            if status:
                kwargs["status"] = status
            apps, total = await u.role_applications.list(filters=kwargs, skip=skip, limit=limit)

            return [
                RoleApplicationResponse(
                    id=app.id,
                    user_id=app.user_id,
                    target_role="UNKNOWN",
                    status=app.status.value,
                    application_data=app.form_data or {},
                    admin_notes=app.review_note,
                    created_at=app.submitted_at,
                    updated_at=app.reviewed_at or app.submitted_at
                ) for app in apps
            ]

    async def check_identifier(self, role_code: str, value: str) -> bool:
        from sqlalchemy import select
        async with self.uow.transaction() as u:
            role = role_code.upper()
            if role == "STUDENT":
                stmt = select(StudentProfile).where(StudentProfile.registration_no == value)
                result = await u.db.execute(stmt)
                return result.scalar_one_or_none() is None
            elif role in ["FACULTY", "STAFF"]:
                stmt_fac = select(FacultyProfile).where(FacultyProfile.employee_id == value)
                result1 = await u.db.execute(stmt_fac)
                if result1.scalar_one_or_none():
                    return False
                stmt_staff = select(StaffProfile).where(StaffProfile.employee_id == value)
                result2 = await u.db.execute(stmt_staff)
                if result2.scalar_one_or_none():
                    return False
                return True
            return True

    async def approve_application(self, app_id: UUID, reviewer: User, admin_notes: Optional[str], background_tasks: BackgroundTasks) -> RoleApplicationResponse:
        async with self.uow.transaction() as u:
            app = await u.role_applications.get_by_id(app_id)
            if not app:
                raise ValueError("Application not found.")
            if app.status == ApplicationStatus.approved:
                raise ValueError("Application is already approved.")

            target_user = await u.users.get_by_id(app.user_id)
            role = await u.roles.get_by_id(app.role_id)

            if not target_user or not role:
                raise ValueError("User or Role missing.")

            data = app.form_data or {}
            
            if role.code == "STUDENT":
                stud_prof = StudentProfile(
                    user_id=target_user.id,
                    registration_no=data.get("registration_no", ""),
                    course_id=data.get("course_id") if data.get("course_id") else None,
                    department_id=data.get("department_id") if data.get("department_id") else None,
                )
                target_user.user_type = UserType.student
                u.db.add(stud_prof)
            elif role.code == "FACULTY":
                fac_prof = FacultyProfile(
                    user_id=target_user.id,
                    employee_id=data.get("employee_id", ""),
                    department_id=data.get("department_id") if data.get("department_id") else None
                )
                target_user.user_type = UserType.faculty
                u.db.add(fac_prof)
            elif role.code == "STAFF":
                staff_prof = StaffProfile(
                    user_id=target_user.id,
                    employee_id=data.get("employee_id", ""),
                    department_id=data.get("department_id") if data.get("department_id") else None
                )
                target_user.user_type = UserType.staff
                u.db.add(staff_prof)
            elif role.code == "PARENT":
                parent_prof = ParentProfile(
                    user_id=target_user.id,
                    relation=data.get("relation", "Parent")
                )
                target_user.user_type = UserType.parent
                u.db.add(parent_prof)

            target_user.account_status = AccountStatus.active
            target_user.role_id = role.id
            await u.users.update(target_user, {})

            app.status = ApplicationStatus.approved
            app.reviewed_by = reviewer.id
            app.review_note = admin_notes
            app.reviewed_at = datetime.now(timezone.utc)
            await u.role_applications.update(app, {})

            notif = Notification(
                user_id=target_user.id,
                title="Application Approved",
                message=f"Your application for {role.name} has been approved!",
                type=NotificationType.success
            )
            await u.notifications.create(notif)

            audit = AuditLog(
                actor_id=reviewer.id,
                resource_type="RoleApplication",
                resource_id=app.id,
                action="approve",
                new_values={"status": app.status.value, "target_user_id": str(target_user.id)},
                reason=admin_notes or "Approved role application"
            )
            await u.audit_logs.create(audit)

            return RoleApplicationResponse(
                id=app.id,
                user_id=app.user_id,
                target_role=role.code,
                status=app.status.value,
                application_data=app.form_data or {},
                admin_notes=app.review_note,
                created_at=app.submitted_at,
                updated_at=app.reviewed_at or app.submitted_at
            )

    async def reject_application(self, app_id: UUID, reviewer: User, admin_notes: Optional[str], background_tasks: BackgroundTasks) -> RoleApplicationResponse:
        async with self.uow.transaction() as u:
            app = await u.role_applications.get_by_id(app_id)
            if not app:
                raise ValueError("Application not found.")
            
            target_user = await u.users.get_by_id(app.user_id)
            role = await u.roles.get_by_id(app.role_id)
            if not target_user or not role:
                raise ValueError("User or Role missing.")
            
            app.status = ApplicationStatus.rejected
            app.review_note = admin_notes
            app.reviewed_by = reviewer.id
            app.reviewed_at = datetime.now(timezone.utc)
            await u.role_applications.update(app, {})

            target_user.account_status = AccountStatus.base
            target_user.status_note = admin_notes
            await u.users.update(target_user, {})

            audit = AuditLog(
                actor_id=reviewer.id,
                resource_type="RoleApplication",
                resource_id=app.id,
                action="reject",
                new_values={"status": app.status.value, "target_user_id": str(target_user.id)},
                reason=admin_notes or "Rejected role application"
            )
            await u.audit_logs.create(audit)

            return RoleApplicationResponse(
                id=app.id,
                user_id=app.user_id,
                target_role=role.code,
                status=app.status.value,
                application_data=app.form_data or {},
                admin_notes=app.review_note,
                created_at=app.submitted_at,
                updated_at=app.reviewed_at or app.submitted_at
            )
