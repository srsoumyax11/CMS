from typing import List, Tuple, Optional
from uuid import UUID
from fastapi import BackgroundTasks
import random

from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from app.core.uow import UnitOfWork
from app.models.user import User, UserType, AccountStatus
from app.models.profiles import StudentProfile, FacultyProfile, AcademicStatus, EmploymentStatus
from app.models.rbac import Role
from app.schemas.admin import (
    StudentCreateRequest, 
    StudentStatusUpdateRequest, 
    StudentAdminUpdateRequest,
    FacultyCreateRequest, 
    FacultyUpdateRequest
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

    async def list_students(self, status: Optional[str] = None, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        return await self.user_repo.list_students_with_profiles(status=status, skip=skip, limit=limit)

    async def create_student(self, data: StudentCreateRequest, current_user: User) -> User:
        await validate_password(data.password, self.uow.db)
        async with self.uow.transaction():
            course = await self.course_repo.get_by_id(data.course_id)
            dept = await self.dept_repo.get_by_id(data.department_id)
            if not course or not course.is_active or not dept or not dept.is_active:
                raise ValueError("Invalid or inactive course/department")

            user_id_str = f"STU{random.randint(1000, 999999)}"
            user = User(
                email=data.email,
                name=data.name,
                hashed_password=hash_password(data.password),
                user_id=user_id_str,
                user_type=UserType.student,
                account_status=AccountStatus.active
            )
            await self.user_repo.create(user)

            profile = StudentProfile(
                user_id=user.id,
                course_id=data.course_id,
                department_id=data.department_id,
                year=data.year,
                hostel=data.hostel.strip().lower() if data.hostel else None,
                academic_status=AcademicStatus.enrolled
            )
            await self.user_repo.add_student_profile(profile)

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="CREATE_STUDENT",
                new_values={"email": data.email, "user_id": user_id_str}
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

            old_values = {"name": user.name}
            if data.name is not None:
                user.name = data.name

            profile = await self.user_repo.get_student_profile(user.id)
            if profile:
                old_values.update({
                    "course_id": str(profile.course_id),
                    "department_id": str(profile.department_id),
                    "year": profile.year,
                    "hostel": profile.hostel
                })
                if data.course_id: profile.course_id = data.course_id
                if data.department_id: profile.department_id = data.department_id
                if data.year: profile.year = data.year
                if data.hostel is not None: profile.hostel = data.hostel.strip().lower()

            await self.audit_service.log_action(
                actor_id=current_user.id,
                resource_type="User",
                resource_id=user.id,
                action="UPDATE_STUDENT",
                old_values=old_values,
                new_values={"name": user.name, "course_id": str(profile.course_id) if profile else None, "department_id": str(profile.department_id) if profile else None, "year": profile.year if profile else None, "hostel": profile.hostel if profile else None}
            )
            return user

    async def list_faculty(self, status: Optional[str] = None, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        return await self.user_repo.list_faculty_with_profiles(status=status, skip=skip, limit=limit)

    async def create_faculty(self, data: FacultyCreateRequest, current_user: User) -> User:
        await validate_password(data.password, self.uow.db)
        async with self.uow.transaction():
            course = await self.course_repo.get_by_id(data.course_id)
            dept = await self.dept_repo.get_by_id(data.department_id)
            if not course or not course.is_active or not dept or not dept.is_active:
                raise ValueError("Invalid or inactive course/department")

            role_id = data.role_id
            if not role_id:
                faculty_role = await self.uow.db.scalar(select(Role).where(Role.name == "Faculty"))
                if faculty_role:
                    role_id = faculty_role.id

            user_id_str = f"FAC{random.randint(1000, 999999)}"
            user = User(
                email=data.email,
                name=data.name,
                hashed_password=hash_password(data.password),
                user_id=user_id_str,
                user_type=UserType.faculty,
                account_status=AccountStatus.active,
                role_id=role_id
            )
            await self.user_repo.create(user)

            profile = FacultyProfile(
                user_id=user.id,
                course_id=data.course_id,
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
                new_values={"email": data.email, "user_id": user_id_str, "role_id": str(data.role_id) if data.role_id else None}
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
            if data.user_id: user.user_id = data.user_id
            if data.photo_url is not None: user.photo_url = data.photo_url
            if data.account_status: user.account_status = data.account_status

            profile = await self.user_repo.get_faculty_profile(user.id)
            if profile:
                old_values.update({
                    "course_id": str(profile.course_id),
                    "department_id": str(profile.department_id),
                    "designation": profile.designation,
                    "employment_status": profile.employment_status.value
                })
                if data.course_id: profile.course_id = data.course_id
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
