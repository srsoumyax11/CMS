from typing import List, Tuple, Dict, Any, Optional
from uuid import UUID
from datetime import date

from app.core.uow import UnitOfWork
from app.models.academic import Department, Course, AcademicTerm, Subject, ClassGroup, Holiday
from app.schemas.academic import (
    DepartmentCreate, DepartmentUpdate,
    CourseCreate, CourseUpdate,
    AcademicTermCreate, AcademicTermUpdate,
    SubjectCreate, SubjectUpdate,
    ClassGroupCreate, ClassGroupUpdate,
    HolidayCreate, HolidayUpdate
)

class AcademicService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    # --- Department Management ---
    async def create_department(self, dep_in: DepartmentCreate) -> Department:
        async with self.uow.transaction() as u:
            if await u.departments.get_by_code(dep_in.code):
                raise ValueError(f"Department with code '{dep_in.code}' already exists.")
            if await u.departments.get_by_name(dep_in.name):
                raise ValueError(f"Department with name '{dep_in.name}' already exists.")

            dep = Department(
                name=dep_in.name,
                code=dep_in.code.upper(),
                department_type=dep_in.department_type,
                is_active=dep_in.is_active,
                hod_user_id=dep_in.hod_user_id
            )
            return await u.departments.create(dep)

    async def update_department(self, dep_id: UUID, dep_in: DepartmentUpdate) -> Department:
        async with self.uow.transaction() as u:
            dep = await u.departments.get_by_id(dep_id)
            if not dep:
                raise ValueError("Department not found.")
            return await u.departments.update(dep, dep_in.model_dump(exclude_unset=True))

    async def list_departments(self, skip: int = 0, limit: int = 100) -> Tuple[List[Department], int]:
        async with self.uow.transaction() as u:
            return await u.departments.list(skip=skip, limit=limit)

    async def delete_department(self, dep_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            dep = await u.departments.get_by_id(dep_id)
            if not dep:
                raise ValueError("Department not found.")
            return await u.departments.delete(dep_id)

    # --- Course Management ---
    async def create_course(self, course_in: CourseCreate) -> Course:
        async with self.uow.transaction() as u:
            if await u.courses.get_by_code(course_in.code):
                raise ValueError(f"Course with code '{course_in.code}' already exists.")

            course = Course(
                name=course_in.name,
                code=course_in.code.upper(),
                duration_years=course_in.duration_years,
                is_active=course_in.is_active
            )
            return await u.courses.create(course)

    async def update_course(self, course_id: UUID, course_in: CourseUpdate) -> Course:
        async with self.uow.transaction() as u:
            course = await u.courses.get_by_id(course_id)
            if not course:
                raise ValueError("Course not found.")
            return await u.courses.update(course, course_in.model_dump(exclude_unset=True))

    async def delete_course(self, course_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            course = await u.courses.get_by_id(course_id)
            if not course:
                raise ValueError("Course not found.")
            return await u.courses.delete(course_id)

    async def list_courses(self, skip: int = 0, limit: int = 100) -> Tuple[List[Course], int]:
        async with self.uow.transaction() as u:
            return await u.courses.list(skip=skip, limit=limit)

    # --- Academic Term Management ---
    async def create_term(self, term_in: AcademicTermCreate) -> AcademicTerm:
        if term_in.start_date >= term_in.end_date:
            raise ValueError("start_date must be strictly earlier than end_date.")

        async with self.uow.transaction() as u:
            if term_in.is_current:
                await u.academic_terms.unset_all_current()

            term = AcademicTerm(
                name=term_in.name,
                start_date=term_in.start_date,
                end_date=term_in.end_date,
                is_current=term_in.is_current
            )
            return await u.academic_terms.create(term)

    async def update_term(self, term_id: UUID, term_in: AcademicTermUpdate) -> AcademicTerm:
        async with self.uow.transaction() as u:
            term = await u.academic_terms.get_by_id(term_id)
            if not term:
                raise ValueError("Academic term not found.")

            start = term_in.start_date or term.start_date
            end = term_in.end_date or term.end_date
            if start >= end:
                raise ValueError("start_date must be strictly earlier than end_date.")

            if term_in.is_current is True:
                await u.academic_terms.unset_all_current()

            return await u.academic_terms.update(term, term_in.model_dump(exclude_unset=True))

    async def delete_term(self, term_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            term = await u.academic_terms.get_by_id(term_id)
            if not term:
                raise ValueError("Academic term not found.")
            return await u.academic_terms.delete(term_id)

    async def set_current_term(self, term_id: UUID) -> AcademicTerm:
        async with self.uow.transaction() as u:
            term = await u.academic_terms.get_by_id(term_id)
            if not term:
                raise ValueError("Academic term not found.")

            await u.academic_terms.unset_all_current()
            term.is_current = True
            return await u.academic_terms.update(term, {})

    async def get_current_term(self) -> AcademicTerm:
        async with self.uow.transaction() as u:
            term = await u.academic_terms.get_current_term()
            if not term:
                raise ValueError("No active current term is set.")
            return term

    async def list_terms(self, skip: int = 0, limit: int = 100) -> Tuple[List[AcademicTerm], int]:
        async with self.uow.transaction() as u:
            return await u.academic_terms.list(skip=skip, limit=limit)

    # --- Subject Management ---
    async def create_subject(self, sub_in: SubjectCreate) -> Subject:
        async with self.uow.transaction() as u:
            dep = await u.departments.get_by_id(sub_in.department_id)
            if not dep:
                raise ValueError("Referenced department not found.")

            if await u.subjects.get_by_code(sub_in.code):
                raise ValueError(f"Subject with code '{sub_in.code}' already exists.")

            subject = Subject(
                code=sub_in.code.upper(),
                name=sub_in.name,
                department_id=sub_in.department_id,
                credits=sub_in.credits,
                status=sub_in.status
            )
            return await u.subjects.create(subject)

    async def update_subject(self, sub_id: UUID, sub_in: SubjectUpdate) -> Subject:
        async with self.uow.transaction() as u:
            sub = await u.subjects.get_by_id(sub_id)
            if not sub:
                raise ValueError("Subject not found.")
            return await u.subjects.update(sub, sub_in.model_dump(exclude_unset=True))

    async def delete_subject(self, sub_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            sub = await u.subjects.get_by_id(sub_id)
            if not sub:
                raise ValueError("Subject not found.")
            return await u.subjects.delete(sub_id)

    async def list_subjects(self, department_id: Optional[UUID] = None, skip: int = 0, limit: int = 100) -> Tuple[List[Subject], int]:
        async with self.uow.transaction() as u:
            if department_id:
                return await u.subjects.list_by_department(department_id, skip=skip, limit=limit)
            return await u.subjects.list(skip=skip, limit=limit)

    # --- Class Group Management ---
    async def create_class_group(self, cg_in: ClassGroupCreate) -> ClassGroup:
        async with self.uow.transaction() as u:
            if not await u.courses.get_by_id(cg_in.course_id):
                raise ValueError("Referenced course not found.")
            if not await u.departments.get_by_id(cg_in.department_id):
                raise ValueError("Referenced department not found.")

            existing = await u.class_groups.find_matching(cg_in.course_id, cg_in.department_id, cg_in.year, cg_in.section)
            if existing:
                raise ValueError(f"Class group for course, department, year {cg_in.year}, section {cg_in.section} already exists.")

            cg = ClassGroup(
                course_id=cg_in.course_id,
                department_id=cg_in.department_id,
                year=cg_in.year,
                section=cg_in.section.upper(),
                status=cg_in.status
            )
            return await u.class_groups.create(cg)

    async def update_class_group(self, cg_id: UUID, cg_in: ClassGroupUpdate) -> ClassGroup:
        async with self.uow.transaction() as u:
            cg = await u.class_groups.get_by_id(cg_id)
            if not cg:
                raise ValueError("Class group not found.")
            return await u.class_groups.update(cg, cg_in.model_dump(exclude_unset=True))

    async def delete_class_group(self, cg_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            cg = await u.class_groups.get_by_id(cg_id)
            if not cg:
                raise ValueError("Class group not found.")
            return await u.class_groups.delete(cg_id)

    async def list_class_groups(self, skip: int = 0, limit: int = 100) -> Tuple[List[ClassGroup], int]:
        async with self.uow.transaction() as u:
            return await u.class_groups.list(skip=skip, limit=limit)

    # --- Holiday Management ---
    async def create_holiday(self, hol_in: HolidayCreate) -> Holiday:
        async with self.uow.transaction() as u:
            if await u.holidays.get_by_date(hol_in.date):
                raise ValueError(f"A holiday is already registered for date {hol_in.date}.")

            if hol_in.applies_to and not await u.departments.get_by_id(hol_in.applies_to):
                raise ValueError("Referenced department not found.")

            holiday = Holiday(
                date=hol_in.date,
                name=hol_in.name,
                applies_to=hol_in.applies_to
            )
            return await u.holidays.create(holiday)

    async def update_holiday(self, holiday_id: UUID, hol_in: HolidayUpdate) -> Holiday:
        async with self.uow.transaction() as u:
            hol = await u.holidays.get_by_id(holiday_id)
            if not hol:
                raise ValueError("Holiday not found.")
            return await u.holidays.update(hol, hol_in.model_dump(exclude_unset=True))

    async def delete_holiday(self, holiday_id: UUID) -> bool:
        async with self.uow.transaction() as u:
            hol = await u.holidays.get_by_id(holiday_id)
            if not hol:
                raise ValueError("Holiday not found.")
            return await u.holidays.delete(holiday_id)

    async def list_holidays(self, start_date: Optional[date] = None, end_date: Optional[date] = None, department_id: Optional[UUID] = None) -> List[Holiday]:
        current_year = date.today().year
        s_date = start_date or date(current_year, 1, 1)
        e_date = end_date or date(current_year, 12, 31)
        async with self.uow.transaction() as u:
            return await u.holidays.list_holidays_in_range(s_date, e_date, department_id=department_id)
