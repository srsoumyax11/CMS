from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.repositories.base_repository import GenericRepository
from app.models.academic import Department, Course, AcademicTerm, Subject, ClassGroup, Holiday

class DepartmentRepository(GenericRepository[Department]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Department)

    async def get_by_code(self, code: str) -> Optional[Department]:
        stmt = select(Department).where(Department.code == code)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Optional[Department]:
        stmt = select(Department).where(Department.name == name)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

class CourseRepository(GenericRepository[Course]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Course)

    async def get_by_code(self, code: str) -> Optional[Course]:
        stmt = select(Course).where(Course.code == code)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

class AcademicTermRepository(GenericRepository[AcademicTerm]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, AcademicTerm)

    async def get_current_term(self) -> Optional[AcademicTerm]:
        stmt = select(AcademicTerm).where(AcademicTerm.is_current.is_(True))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def unset_all_current(self) -> None:
        stmt = select(AcademicTerm).where(AcademicTerm.is_current.is_(True))
        result = await self.db.execute(stmt)
        for term in result.scalars().all():
            term.is_current = False
            self.db.add(term)
        await self.db.flush()

class SubjectRepository(GenericRepository[Subject]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Subject)

    async def get_by_code(self, code: str) -> Optional[Subject]:
        stmt = select(Subject).where(Subject.code == code)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_department(self, department_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[Subject], int]:
        stmt = select(Subject).where(Subject.department_id == department_id).order_by(Subject.code.asc())
        count_stmt = select(func.count()).select_from(Subject).where(Subject.department_id == department_id)
        count = await self.db.scalar(count_stmt)
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), count or 0

class ClassGroupRepository(GenericRepository[ClassGroup]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, ClassGroup)

    async def find_matching(self, course_id: UUID, department_id: UUID, year: int, section: str) -> Optional[ClassGroup]:
        stmt = select(ClassGroup).where(
            ClassGroup.course_id == course_id,
            ClassGroup.department_id == department_id,
            ClassGroup.year == year,
            ClassGroup.section == section
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

class HolidayRepository(GenericRepository[Holiday]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Holiday)

    async def get_by_date(self, holiday_date: date) -> Optional[Holiday]:
        stmt = select(Holiday).where(Holiday.date == holiday_date)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_holidays_in_range(self, start_date: date, end_date: date, department_id: Optional[UUID] = None) -> List[Holiday]:
        stmt = select(Holiday).where(
            Holiday.date >= start_date,
            Holiday.date <= end_date
        )
        if department_id:
            stmt = stmt.where(or_(Holiday.applies_to.is_(None), Holiday.applies_to == department_id))
        else:
            stmt = stmt.where(Holiday.applies_to.is_(None))

        stmt = stmt.order_by(Holiday.date.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
