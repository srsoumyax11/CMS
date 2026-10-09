from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, Any, List
from fastapi import BackgroundTasks
from sqlalchemy import select

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
                upper_status = status.upper()
                if upper_status in ApplicationStatus.__members__:
                    kwargs["status"] = ApplicationStatus[upper_status]
                elif status.lower() in ["pending", "submitted"]:
                    kwargs["status"] = ApplicationStatus.submitted
            apps, total = await u.role_applications.list(filters=kwargs, skip=skip, limit=limit)

            res: List[RoleApplicationResponse] = []
            for app in apps:
                role = await u.roles.get_by_id(app.role_id)
                applicant = await u.users.get_by_id(app.user_id)
                target_role = role.code if role else "UNKNOWN"
                
                status_str = app.status.value.lower()
                if status_str == "submitted":
                    status_str = "pending"

                res.append(
                    RoleApplicationResponse(
                        id=app.id,
                        user_id=app.user_id,
                        applicant_name=applicant.name if applicant else "Unknown Applicant",
                        applicant_email=applicant.email if applicant else "N/A",
                        target_role=target_role,
                        status=status_str,
                        application_data=app.form_data or {},
                        admin_notes=app.review_note,
                        created_at=app.submitted_at,
                        updated_at=app.reviewed_at or app.submitted_at
                    )
                )
            return res

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

    def _safe_uuid(self, val: Any) -> Optional[UUID]:
        if not val:
            return None
        if isinstance(val, UUID):
            return val
        try:
            return UUID(str(val))
        except (ValueError, TypeError):
            return None

    async def approve_application(self, app_id: UUID, reviewer: User, admin_notes: Optional[str], background_tasks: BackgroundTasks) -> RoleApplicationResponse:
        async with self.uow.transaction() as u:
            app = await u.role_applications.get_by_id(app_id)
            if not app:
                raise ValueError("Application not found.")
            if app.status == ApplicationStatus.approved:
                role = await u.roles.get_by_id(app.role_id)
                return RoleApplicationResponse(
                    id=app.id,
                    user_id=app.user_id,
                    target_role=role.code if role else "UNKNOWN",
                    status=app.status.value,
                    application_data=app.form_data or {},
                    admin_notes=app.review_note,
                    created_at=app.submitted_at,
                    updated_at=app.reviewed_at or app.submitted_at
                )

            if reviewer.id == app.user_id:
                raise ValueError("Self-approval is not permitted.")

            target_user = await u.users.get_by_id(app.user_id)
            role = await u.roles.get_by_id(app.role_id)

            if not target_user or not role:
                raise ValueError("User or Role missing.")

            data = app.form_data or {}
            from app.models.academic import Course, Department

            if role.code == "STUDENT":
                reg_no = str(data.get("registration_no", "")).strip()
                if not reg_no:
                    reg_no = f"STU-{target_user.id.hex[:8].upper()}"

                stmt_stud_dup = select(StudentProfile).where(StudentProfile.registration_no == reg_no, StudentProfile.user_id != target_user.id)
                if (await u.db.execute(stmt_stud_dup)).scalar_one_or_none():
                    raise ValueError(f"Registration number '{reg_no}' is already registered to another student.")

                course_id = self._safe_uuid(data.get("course_id"))
                dept_id = self._safe_uuid(data.get("department_id"))

                if not course_id or not dept_id:
                    default_dept = (await u.db.execute(select(Department))).scalars().first()
                    default_course = (await u.db.execute(select(Course))).scalars().first()
                    dept_id = dept_id or (default_dept.id if default_dept else None)
                    course_id = course_id or (default_course.id if default_course else None)

                if not course_id or not dept_id:
                    raise ValueError("A valid Course and Department are required to approve Student profiles.")

                stmt_stud_ex = select(StudentProfile).where(StudentProfile.user_id == target_user.id)
                ex_stud_prof = (await u.db.execute(stmt_stud_ex)).scalar_one_or_none()
                if ex_stud_prof:
                    await u.db.delete(ex_stud_prof)
                    await u.db.flush()

                stud_prof = StudentProfile(
                    user_id=target_user.id,
                    registration_no=reg_no,
                    course_id=course_id,
                    department_id=dept_id,
                )
                target_user.user_type = UserType.student
                u.db.add(stud_prof)

            elif role.code == "FACULTY":
                emp_id = str(data.get("employee_id", "")).strip()
                if not emp_id:
                    emp_id = f"FAC-{target_user.id.hex[:8].upper()}"

                stmt_fac_dup = select(FacultyProfile).where(FacultyProfile.employee_id == emp_id, FacultyProfile.user_id != target_user.id)
                if (await u.db.execute(stmt_fac_dup)).scalar_one_or_none():
                    raise ValueError(f"Employee ID '{emp_id}' is already registered to another faculty member.")

                dept_id = self._safe_uuid(data.get("department_id"))
                if not dept_id:
                    default_dept = (await u.db.execute(select(Department))).scalars().first()
                    dept_id = default_dept.id if default_dept else None

                if not dept_id:
                    raise ValueError("A valid Department is required to approve Faculty profiles.")

                designation = str(data.get("designation") or data.get("title") or "Faculty Member").strip()

                stmt_fac_ex = select(FacultyProfile).where(FacultyProfile.user_id == target_user.id)
                ex_fac_prof = (await u.db.execute(stmt_fac_ex)).scalar_one_or_none()
                if ex_fac_prof:
                    await u.db.delete(ex_fac_prof)
                    await u.db.flush()

                fac_prof = FacultyProfile(
                    user_id=target_user.id,
                    employee_id=emp_id,
                    department_id=dept_id,
                    designation=designation
                )
                target_user.user_type = UserType.faculty
                u.db.add(fac_prof)

            elif role.code == "STAFF":
                emp_id = str(data.get("employee_id", "")).strip()
                if not emp_id:
                    emp_id = f"STF-{target_user.id.hex[:8].upper()}"

                stmt_staff_dup = select(StaffProfile).where(StaffProfile.employee_id == emp_id, StaffProfile.user_id != target_user.id)
                if (await u.db.execute(stmt_staff_dup)).scalar_one_or_none():
                    raise ValueError(f"Employee ID '{emp_id}' is already registered to another staff member.")

                dept_id = self._safe_uuid(data.get("department_id"))
                designation = str(data.get("designation") or "Staff Member").strip()

                stmt_staff_ex = select(StaffProfile).where(StaffProfile.user_id == target_user.id)
                ex_staff_prof = (await u.db.execute(stmt_staff_ex)).scalar_one_or_none()
                if ex_staff_prof:
                    await u.db.delete(ex_staff_prof)
                    await u.db.flush()

                staff_prof = StaffProfile(
                    user_id=target_user.id,
                    employee_id=emp_id,
                    department_id=dept_id,
                    designation=designation
                )
                target_user.user_type = UserType.staff
                u.db.add(staff_prof)

            elif role.code == "PARENT":
                stud_id = self._safe_uuid(data.get("student_id"))
                if not stud_id:
                    first_stud = (await u.db.execute(select(StudentProfile))).scalars().first()
                    if first_stud:
                        stud_id = first_stud.user_id

                if not stud_id:
                    raise ValueError("Parent application requires a valid Student ID.")

                stmt_parent_ex = select(ParentProfile).where(ParentProfile.user_id == target_user.id)
                ex_parent_prof = (await u.db.execute(stmt_parent_ex)).scalar_one_or_none()
                if ex_parent_prof:
                    await u.db.delete(ex_parent_prof)
                    await u.db.flush()

                parent_prof = ParentProfile(
                    user_id=target_user.id,
                    student_id=stud_id,
                    relationship_type=str(data.get("relation") or data.get("relationship_type") or "Parent").strip()
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

            if reviewer.id == app.user_id:
                raise ValueError("Self-approval is not permitted.")
            
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
