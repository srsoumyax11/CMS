from typing import List, Tuple
from sqlalchemy.exc import IntegrityError
from app.core.uow import UnitOfWork
from app.models.academic import Course, Department
from app.models.settings import SystemSetting
from app.schemas.admin import (
    CourseCreateRequest, CourseUpdateRequest,
    DepartmentCreateRequest, DepartmentUpdateRequest,
    SystemSettingUpdateRequest
)
from app.repositories.metadata_repository import CourseRepository, DepartmentRepository, SystemSettingRepository

class MetadataService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.course_repo = CourseRepository(uow.db)
        self.dept_repo = DepartmentRepository(uow.db)
        self.settings_repo = SystemSettingRepository(uow.db)

    async def list_courses(self) -> List[Course]:
        courses, _ = await self.course_repo.list(order_by=Course.name.asc())
        return courses

    async def create_course(self, data: CourseCreateRequest) -> Course:
        async with self.uow.transaction():
            existing = await self.course_repo.get_by_name(data.name)
            if existing:
                raise ValueError(f"Course '{data.name}' already exists")
                
            course = Course(
                name=data.name,
                duration_years=data.duration_years,
                is_active=data.is_active
            )
            return await self.course_repo.create(course)

    async def update_course(self, course_id: str, data: CourseUpdateRequest) -> Course:
        async with self.uow.transaction():
            course = await self.course_repo.get_by_id(course_id)
            if not course:
                raise ValueError("Course not found")
            if data.name: course.name = data.name
            if data.is_active is not None: course.is_active = data.is_active
            if data.duration_years is not None: course.duration_years = data.duration_years
            return course

    async def delete_course(self, course_id: str) -> bool:
        async with self.uow.transaction():
            course = await self.course_repo.get_by_id(course_id)
            if not course:
                raise ValueError("Course not found")
            try:
                await self.course_repo.delete(course_id)
                return True
            except IntegrityError:
                raise ValueError("Cannot delete course. It is referenced by other records.")

    async def list_departments(self) -> List[Department]:
        departments, _ = await self.dept_repo.list(order_by=Department.name.asc())
        return departments

    async def create_department(self, data: DepartmentCreateRequest) -> Department:
        async with self.uow.transaction():
            existing = await self.dept_repo.get_by_code(data.code)
            if existing:
                raise ValueError(f"Department code '{data.code}' already exists")

            candidate = None
            if data.hod_user_id:
                from app.repositories.user_repository import UserRepository
                from app.models.user import UserType, AccountStatus
                from app.models.profiles import EmploymentStatus

                user_repo = UserRepository(self.uow.db)
                candidate = await user_repo.get_faculty_with_profile(data.hod_user_id)
                if not candidate or candidate.user_type != UserType.faculty:
                    raise ValueError("Assigned HOD must be a valid faculty member")
                if candidate.account_status != AccountStatus.active:
                    raise ValueError("Assigned HOD account must be active")
                if not candidate.faculty_profile or candidate.faculty_profile.employment_status != EmploymentStatus.active:
                    raise ValueError("Assigned HOD must have active employment status")

            dept = Department(
                name=data.name,
                code=data.code,
                department_type=data.department_type,
                hod_user_id=data.hod_user_id,
                is_active=data.is_active
            )
            created = await self.dept_repo.create(dept)
            if candidate and candidate.faculty_profile:
                candidate.faculty_profile.department_id = created.id
                from app.models.rbac import Role
                from sqlalchemy import select
                hod_role = await self.uow.db.scalar(select(Role).where(Role.name == "HOD"))
                if hod_role:
                    candidate.role_id = hod_role.id

            return created

    async def update_department(self, dept_id: str, data: DepartmentUpdateRequest) -> Department:
        async with self.uow.transaction():
            dept = await self.dept_repo.get_by_id(dept_id)
            if not dept:
                raise ValueError("Department not found")
            if data.name: dept.name = data.name
            if data.code: dept.code = data.code
            if data.department_type: dept.department_type = data.department_type
            if data.is_active is not None: dept.is_active = data.is_active

            if 'hod_user_id' in data.model_fields_set:
                if data.hod_user_id is None:
                    dept.hod_user_id = None
                else:
                    from app.repositories.user_repository import UserRepository
                    from app.models.user import UserType, AccountStatus
                    from app.models.profiles import EmploymentStatus
                    from app.models.rbac import Role
                    from sqlalchemy import select

                    user_repo = UserRepository(self.uow.db)
                    candidate = await user_repo.get_faculty_with_profile(data.hod_user_id)
                    if not candidate or candidate.user_type != UserType.faculty:
                        raise ValueError("Assigned HOD must be a valid faculty member")
                    if candidate.account_status != AccountStatus.active:
                        raise ValueError("Assigned HOD account must be active")
                    if not candidate.faculty_profile or candidate.faculty_profile.employment_status != EmploymentStatus.active:
                        raise ValueError("Assigned HOD must have active employment status")
                    if str(candidate.faculty_profile.department_id) != str(dept.id):
                        raise ValueError("Assigned HOD must belong to the target department")

                    dept.hod_user_id = data.hod_user_id

                    hod_role = await self.uow.db.scalar(select(Role).where(Role.name == "HOD"))
                    if hod_role:
                        candidate.role_id = hod_role.id

            return dept


    async def delete_department(self, dept_id: str) -> bool:
        async with self.uow.transaction():
            dept = await self.dept_repo.get_by_id(dept_id)
            if not dept:
                raise ValueError("Department not found")
            try:
                await self.dept_repo.delete(dept_id)
                return True
            except IntegrityError:
                raise ValueError("Cannot delete department. It is referenced by other records.")

    async def list_settings(self) -> List[SystemSetting]:
        settings, _ = await self.settings_repo.list()
        return settings

    async def update_setting(self, key: str, data: SystemSettingUpdateRequest) -> SystemSetting:
        async with self.uow.transaction():
            setting = await self.settings_repo.get_by_key(key)
            if not setting:
                raise ValueError("Setting not found")
                
            # Perform type conversion validation here if necessary based on setting.data_type
            # For this simplified version we just assign the string value.
            setting.value = data.value
            return setting

    async def get_public_settings(self) -> dict:
        settings, _ = await self.settings_repo.list(filters={"is_public": True})
        return {s.key: s.value for s in settings}

    async def get_active_courses(self) -> List[Course]:
        courses, _ = await self.course_repo.list(filters={"is_active": True})
        return courses

    async def get_active_departments(self) -> List[Department]:
        depts, _ = await self.dept_repo.list(filters={"is_active": True})
        return depts

    async def get_hierarchy(self) -> List[dict]:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.profiles import FacultyProfile, EmploymentStatus

        courses = await self.get_active_courses()
        depts = await self.get_active_departments()
        
        faculty_res = await self.uow.db.execute(
            select(FacultyProfile)
            .options(selectinload(FacultyProfile.user))
            .where(FacultyProfile.employment_status == EmploymentStatus.active)
        )
        
        courses_dict = {c.id: c for c in courses}
        depts_dict = {d.id: d for d in depts}
        faculties = faculty_res.scalars().all()
        
        tree = {}
        for f in faculties:
            c_id = f.course_id
            d_id = f.department_id
            
            if c_id not in courses_dict or d_id not in depts_dict:
                continue
                
            if c_id not in tree:
                tree[c_id] = {
                    "course_id": str(c_id),
                    "course_name": courses_dict[c_id].name,
                    "departments": {}
                }
                
            if d_id not in tree[c_id]["departments"]:
                dept_obj = depts_dict[d_id]
                tree[c_id]["departments"][d_id] = {
                    "department_id": str(d_id),
                    "department_name": dept_obj.name,
                    "hod_user_id": str(dept_obj.hod_user_id) if dept_obj.hod_user_id else None,
                    "faculty": []
                }
                
            user = f.user
            dept_obj = depts_dict[d_id]
            tree[c_id]["departments"][d_id]["faculty"].append({
                "id": str(f.user_id),
                "name": user.name if user else "Unknown",
                "designation": f.designation,
                "is_hod": (dept_obj.hod_user_id == f.user_id)
            })
            
        result_data = []
        for c_id, c_data in tree.items():
            c_data["departments"] = list(c_data["departments"].values())
            result_data.append(c_data)
            
        return result_data

    async def get_roles(self) -> List[dict]:
        from sqlalchemy import select
        from app.models.rbac import Role
        result = await self.uow.db.execute(select(Role))
        roles = result.scalars().all()
        return [{"id": str(r.id), "name": r.name, "description": r.description} for r in roles]
