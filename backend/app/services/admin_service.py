from typing import List, Tuple, Optional
from uuid import UUID
from fastapi import BackgroundTasks
import random

from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from app.core.uow import UnitOfWork
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import StudentProfile, FacultyProfile, StaffProfile, AcademicStatus, EmploymentStatus
from app.models.rbac import Role
from app.schemas.admin import (
    StudentCreateRequest, 
    StudentStatusUpdateRequest, 
    StudentAdminUpdateRequest,
    FacultyCreateRequest, 
    FacultyUpdateRequest,
    FacultyStatusUpdateRequest,
    UserManagementUpdateRequest
)
from app.schemas.staff import (
    StaffCreateRequest,
    StaffUpdateRequest,
    StaffStatusUpdateRequest
)
from app.core.security import hash_password
from app.repositories.user_repository import UserRepository
from app.repositories.metadata_repository import CourseRepository, DepartmentRepository
from app.services.audit_service import AuditService
from app.utils.validation import validate_password


class AdminService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.user_repo = UserRepository(uow.db)
        self.course_repo = CourseRepository(uow.db)
        self.dept_repo = DepartmentRepository(uow.db)
        self.audit_service = AuditService(uow.db)

    async def list_students(self, status: Optional[str] = None, department_id: Optional[UUID] = None, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        return await self.user_repo.list_students_with_profiles(status=status, department_id=department_id, skip=skip, limit=limit)


    async def create_student(self, data: StudentCreateRequest, current_user: User) -> User:
        await validate_password(data.password, self.uow.db)
        async with self.uow.transaction():
            course = await self.course_repo.get_by_id(data.course_id)
            dept = await self.dept_repo.get_by_id(data.department_id)
            if not course or not course.is_active or not dept or not dept.is_active:
                raise ValueError("Invalid or inactive course/department")

            user = User(
                email=data.email,
                name=data.name,
                hashed_password=hash_password(data.password),
                user_type=UserType.student,
                account_status=AccountStatus.active
            )
            await self.user_repo.create(user)

            profile = StudentProfile(
                user_id=user.id,
                registration_no=data.registration_no.strip(),
                roll_no=data.roll_no.strip() if data.roll_no else None,
                course_id=data.course_id,
                department_id=data.department_id,
                admission_year=data.admission_year,
                current_semester=data.current_semester,
                section=data.section,
                year=data.year,
                academic_status=AcademicStatus.enrolled
            )
            await self.user_repo.add_student_profile(profile)

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="CREATE_STUDENT",
                new_values={"email": data.email, "registration_no": data.registration_no}
            )
            return user

    async def update_student_status(self, user_id: UUID, data: StudentStatusUpdateRequest, current_user: User) -> User:
        async with self.uow.transaction():
            user = await self.user_repo.get_by_id(user_id)
            if not user or user.user_type != UserType.student:
                raise ValueError("Student not found")

            old_account_status = user.account_status.value
            old_status_note = user.status_note
            old_academic_status = None

            if data.account_status is not None:
                user.account_status = data.account_status
                if data.account_status == AccountStatus.active and not user.role_id:
                    # Assign default Student role
                    role = await self.uow.db.scalar(select(Role).where(Role.name == "Student"))
                    if role:
                        user.role_id = role.id
                        
            if data.status_note is not None:
                user.status_note = data.status_note

            profile = await self.user_repo.get_student_profile(user.id)
            if profile and data.academic_status is not None:
                old_academic_status = profile.academic_status.value if profile.academic_status else None
                profile.academic_status = data.academic_status

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="UPDATE_STUDENT_STATUS",
                old_values={"account_status": old_account_status, "status_note": old_status_note, "academic_status": old_academic_status},
                new_values={"account_status": user.account_status.value, "status_note": user.status_note, "academic_status": profile.academic_status.value if profile else None},
                reason=data.status_note
            )
            return user

    async def update_student(self, user_id: UUID, data: StudentAdminUpdateRequest, current_user: User) -> User:
        async with self.uow.transaction():
            user = await self.user_repo.get_by_id(user_id)
            if not user or user.user_type != UserType.student:
                raise ValueError("Student not found")

            old_values: dict[str, Any] = {"name": user.name}
            if data.name is not None:
                user.name = data.name

            profile = await self.user_repo.get_student_profile(user.id)
            if profile:
                old_values.update({
                    "registration_no": profile.registration_no,
                    "roll_no": profile.roll_no,
                    "course_id": str(profile.course_id),
                    "department_id": str(profile.department_id),
                    "year": str(profile.year),
                    "admission_year": profile.admission_year,
                    "current_semester": profile.current_semester,
                    "section": profile.section
                })
                if data.registration_no: profile.registration_no = data.registration_no.strip()
                if data.roll_no is not None: profile.roll_no = data.roll_no.strip() if data.roll_no else None
                if data.course_id: profile.course_id = data.course_id
                if data.department_id: profile.department_id = data.department_id
                if data.admission_year: profile.admission_year = data.admission_year
                if data.current_semester: profile.current_semester = data.current_semester
                if data.section is not None: profile.section = data.section
                if data.year: profile.year = data.year

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="UPDATE_STUDENT",
                old_values=old_values,
                new_values={"name": user.name, "course_id": str(profile.course_id) if profile else None, "department_id": str(profile.department_id) if profile else None, "year": profile.year if profile else None}
            )
            return user

    async def list_faculty(self, status: Optional[str] = None, department_id: Optional[UUID] = None, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        return await self.user_repo.list_faculty_with_profiles(status=status, department_id=department_id, skip=skip, limit=limit)


    async def create_faculty(self, data: FacultyCreateRequest, current_user: User) -> User:
        await validate_password(data.password, self.uow.db)
        async with self.uow.transaction():
            dept = await self.dept_repo.get_by_id(data.department_id)
            if not dept or not dept.is_active:
                raise ValueError("Invalid or inactive department")

            faculty_role = await self.uow.db.scalar(select(Role).where(Role.name == "Faculty"))
            role_id = faculty_role.id if faculty_role else None

            user_id_str = f"FAC{random.randint(1000, 999999)}"
            user = User(
                email=data.email,
                name=data.name,
                hashed_password=hash_password(data.password),
                user_type=UserType.faculty,
                account_status=AccountStatus.active,
                role_id=role_id
            )
            await self.user_repo.create(user)

            profile = FacultyProfile(
                user_id=user.id,
                department_id=data.department_id,
                designation=data.designation,
                employment_status=EmploymentStatus.active
            )
            await self.user_repo.add_faculty_profile(profile)

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="CREATE_FACULTY",
                new_values={"email": data.email, "user_id": user_id_str, "department_id": str(data.department_id)}
            )
            return user

    async def update_faculty(self, user_id: UUID, data: FacultyUpdateRequest, current_user: User) -> User:
        async with self.uow.transaction():
            user = await self.user_repo.get_by_id(user_id)
            if not user or user.user_type != UserType.faculty:
                raise ValueError("Faculty not found")

            old_values = {"name": user.name, "email": user.email, "account_status": user.account_status.value}
            
            if data.name: user.name = data.name
            if data.email: user.email = data.email
            if data.photo_url is not None: user.photo_url = data.photo_url
            if data.account_status: user.account_status = data.account_status

            profile = await self.user_repo.get_faculty_profile(user.id)
            if profile:
                old_values.update({
                    "department_id": str(profile.department_id),
                    "designation": profile.designation,
                    "employment_status": profile.employment_status.value
                })
                if data.department_id: profile.department_id = data.department_id
                if data.designation: profile.designation = data.designation
                if data.employment_status: profile.employment_status = data.employment_status

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="UPDATE_FACULTY",
                old_values=old_values,
                new_values={"name": user.name, "email": user.email, "account_status": user.account_status.value}
            )
            return user

    async def get_faculty(self, user_id: UUID) -> User:
        user = await self.user_repo.get_faculty_with_profile(user_id)
        if not user:
            raise ValueError("Faculty not found")
        return user

    async def update_faculty_status(self, user_id: UUID, data: FacultyStatusUpdateRequest, current_user: User) -> User:
        async with self.uow.transaction():
            user = await self.user_repo.get_faculty_with_profile(user_id)
            if not user:
                raise ValueError("Faculty not found")

            old_account_status = user.account_status.value
            old_status_note = user.status_note
            old_employment_status = None

            if data.account_status is not None:
                user.account_status = data.account_status
            if data.status_note is not None:
                user.status_note = data.status_note

            profile = user.faculty_profile
            if not profile:
                profile = await self.user_repo.get_faculty_profile(user.id)
            if profile and data.employment_status is not None:
                old_employment_status = profile.employment_status.value if profile.employment_status else None
                profile.employment_status = data.employment_status

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="UPDATE_FACULTY_STATUS",
                old_values={
                    "account_status": old_account_status,
                    "status_note": old_status_note,
                    "employment_status": old_employment_status
                },
                new_values={
                    "account_status": user.account_status.value,
                    "status_note": user.status_note,
                    "employment_status": profile.employment_status.value if profile and profile.employment_status else None
                },
                reason=data.status_note
            )
            return user

    async def list_staff(
        self,
        status: Optional[str] = None,
        department_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[User], int]:
        return await self.user_repo.list_staff_with_profiles(
            status=status,
            department_id=department_id,
            skip=skip,
            limit=limit
        )

    async def create_staff(self, data: StaffCreateRequest, current_user: User) -> User:
        await validate_password(data.password, self.uow.db)
        async with self.uow.transaction():
            if data.department_id:
                dept = await self.dept_repo.get_by_id(data.department_id)
                if not dept or not dept.is_active:
                    raise ValueError("Invalid or inactive department")

            role_id = data.role_id
            if not role_id:
                staff_role = await self.uow.db.scalar(select(Role).where(Role.name == "Staff"))
                if staff_role:
                    role_id = staff_role.id

            user_id_str = f"STF{random.randint(1000, 999999)}"
            user = User(
                email=data.email,
                name=data.name,
                hashed_password=hash_password(data.password),
                user_type=UserType.staff,
                account_status=AccountStatus.active,
                role_id=role_id
            )
            await self.user_repo.create(user)

            profile = StaffProfile(
                user_id=user.id,
                department_id=data.department_id,
                designation=data.designation,
                employment_status=EmploymentStatus.active
            )
            await self.user_repo.add_staff_profile(profile)

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="CREATE_STAFF",
                new_values={"email": data.email, "user_id": user_id_str, "role_id": str(role_id) if role_id else None}
            )
            return user

    async def get_staff(self, user_id: UUID) -> User:
        user = await self.user_repo.get_staff_with_profile(user_id)
        if not user:
            raise ValueError("Staff member not found")
        return user

    async def update_staff(self, user_id: UUID, data: StaffUpdateRequest, current_user: User) -> User:
        async with self.uow.transaction():
            user = await self.user_repo.get_staff_with_profile(user_id)
            if not user:
                raise ValueError("Staff member not found")

            old_values = {
                "name": user.name,
                "role_id": str(user.role_id) if user.role_id else None
            }
            if data.name is not None:
                user.name = data.name
            if data.role_id is not None:
                role = await self.uow.db.get(Role, data.role_id)
                if not role:
                    raise ValueError("Role not found")
                user.role_id = data.role_id

            profile = user.staff_profile
            if not profile:
                profile = await self.user_repo.get_staff_profile(user.id)
            if profile:
                old_values.update({
                    "department_id": str(profile.department_id) if profile.department_id else None,
                    "designation": profile.designation
                })
                if data.department_id is not None:
                    dept = await self.dept_repo.get_by_id(data.department_id)
                    if not dept or not dept.is_active:
                        raise ValueError("Invalid or inactive department")
                    profile.department_id = data.department_id
                if data.designation is not None:
                    profile.designation = data.designation

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="UPDATE_STAFF",
                old_values=old_values,
                new_values={
                    "name": user.name,
                    "role_id": str(user.role_id) if user.role_id else None,
                    "department_id": str(profile.department_id) if profile and profile.department_id else None,
                    "designation": profile.designation if profile else None
                }
            )
            return user

    async def update_staff_status(self, user_id: UUID, data: StaffStatusUpdateRequest, current_user: User) -> User:
        async with self.uow.transaction():
            user = await self.user_repo.get_staff_with_profile(user_id)
            if not user:
                raise ValueError("Staff member not found")

            old_account_status = user.account_status.value
            old_status_note = user.status_note
            old_employment_status = None

            if data.account_status is not None:
                user.account_status = data.account_status
            if data.status_note is not None:
                user.status_note = data.status_note

            profile = user.staff_profile
            if not profile:
                profile = await self.user_repo.get_staff_profile(user.id)
            if profile and data.employment_status is not None:
                old_employment_status = profile.employment_status.value if profile.employment_status else None
                profile.employment_status = data.employment_status

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="UPDATE_STAFF_STATUS",
                old_values={
                    "account_status": old_account_status,
                    "status_note": old_status_note,
                    "employment_status": old_employment_status
                },
                new_values={
                    "account_status": user.account_status.value,
                    "status_note": user.status_note,
                    "employment_status": profile.employment_status.value if profile and profile.employment_status else None
                },
                reason=data.status_note
            )
            return user

    async def list_users(self, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        return await self.user_repo.list_all_users(skip=skip, limit=limit)

    async def update_user(self, user_id: UUID, data: UserManagementUpdateRequest, current_user: User) -> User:
        from typing import Any
        async with self.uow.transaction():
            user = await self.user_repo.get_by_id(user_id)
            if not user:
                raise ValueError("User not found")

            old_values: dict[str, Any] = {}
            if data.name is not None:
                old_values["name"] = user.name
                user.name = data.name
            if data.user_type is not None:
                old_values["user_type"] = user.user_type.value
                user.user_type = data.user_type
            if data.account_status is not None:
                old_values["account_status"] = user.account_status.value
                user.account_status = data.account_status
            if data.status_note is not None:
                old_values["status_note"] = user.status_note
                user.status_note = data.status_note
            if data.phone is not None:
                old_values["phone"] = user.phone
                user.phone = data.phone
            if data.email_notifications is not None:
                old_values["email_notifications"] = user.email_notifications
                user.email_notifications = data.email_notifications
            if data.in_app_alerts is not None:
                old_values["in_app_alerts"] = user.in_app_alerts
                user.in_app_alerts = data.in_app_alerts
            if data.is_2fa_enabled is not None:
                old_values["is_2fa_enabled"] = user.is_2fa_enabled
                user.is_2fa_enabled = data.is_2fa_enabled
            if data.role_id is not None:
                old_values["role_id"] = str(user.role_id) if user.role_id else None
                role = await self.uow.db.get(Role, data.role_id)
                if not role:
                    raise ValueError("Role not found")
                user.role_id = data.role_id

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="UPDATE_USER",
                old_values=old_values,
                new_values={
                    "name": user.name,
                    "user_type": user.user_type.value,
                    "account_status": user.account_status.value,
                    "role_id": str(user.role_id) if user.role_id else None
                }
            )
            return user

