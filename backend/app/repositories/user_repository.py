from uuid import UUID
from typing import Optional, List, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.user import User, UserType
from app.models.profiles import StudentProfile, FacultyProfile, StaffProfile
from app.repositories.base_repository import GenericRepository

class UserRepository(GenericRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, User)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_user_id_str(self, user_id_str: str) -> Optional[User]:
        return None

    async def get_by_email_with_profiles(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).options(
                selectinload(User.student_profile),
                selectinload(User.faculty_profile),
                selectinload(User.staff_profile)
            ).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_id_with_profiles(self, user_id: UUID) -> Optional[User]:
        result = await self.db.execute(
            select(User).options(
                selectinload(User.student_profile),
                selectinload(User.faculty_profile)
            ).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_students_with_profiles(self, status: Optional[str] = None, department_id: Optional[Any] = None, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        from app.models.infrastructure import Room
        stmt = select(User).outerjoin(StudentProfile, User.id == StudentProfile.user_id).options(
            selectinload(User.student_profile).selectinload(StudentProfile.course),
            selectinload(User.student_profile).selectinload(StudentProfile.department),
            selectinload(User.student_profile).selectinload(StudentProfile.room).selectinload(Room.building)
        ).where(User.user_type == UserType.student)
        
        if status:
            stmt = stmt.where(User.account_status == status)
        if department_id:
            stmt = stmt.where(StudentProfile.department_id == department_id)
            
        stmt = stmt.order_by(User.name.asc())
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        users = list(result.scalars().all())
        return users, len(users)

    async def list_faculty_with_profiles(self, status: Optional[str] = None, department_id: Optional[Any] = None, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        stmt = select(User).outerjoin(FacultyProfile, User.id == FacultyProfile.user_id).options(
            selectinload(User.faculty_profile).selectinload(FacultyProfile.department),
            selectinload(User.faculty_profile).selectinload(FacultyProfile.course),
            selectinload(User.role)
        ).where(User.user_type == UserType.faculty)
        
        if status:
            stmt = stmt.where(User.account_status == status)
        if department_id:
            stmt = stmt.where(FacultyProfile.department_id == department_id)
            
        stmt = stmt.order_by(User.name.asc())
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        users = list(result.scalars().all())
        return users, len(users)


    async def get_student_profile(self, user_id: Any) -> Optional[StudentProfile]:
        from app.models.infrastructure import Room
        result = await self.db.execute(
            select(StudentProfile).options(
                selectinload(StudentProfile.room).selectinload(Room.building)
            ).where(StudentProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_faculty_profile(self, user_id: Any) -> Optional[FacultyProfile]:
        result = await self.db.execute(select(FacultyProfile).where(FacultyProfile.user_id == user_id))
        return result.scalar_one_or_none()

    async def add_student_profile(self, profile: StudentProfile) -> StudentProfile:
        self.db.add(profile)
        await self.db.flush()
        return profile

    async def add_faculty_profile(self, profile: FacultyProfile) -> FacultyProfile:
        self.db.add(profile)
        await self.db.flush()
        return profile

    async def list_staff_with_profiles(
        self,
        status: Optional[str] = None,
        department_id: Optional[Any] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[User], int]:
        stmt = select(User).outerjoin(StaffProfile, User.id == StaffProfile.user_id).options(
            selectinload(User.staff_profile).selectinload(StaffProfile.department),
            selectinload(User.role)
        ).where(User.user_type == UserType.staff)

        if status:
            stmt = stmt.where(User.account_status == status)
        if department_id:
            stmt = stmt.where(StaffProfile.department_id == department_id)

        stmt = stmt.order_by(User.name.asc())
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        users = list(result.scalars().all())
        return users, len(users)

    async def get_staff_with_profile(self, user_id: Any) -> Optional[User]:
        stmt = (
            select(User)
            .where(User.id == user_id, User.user_type == UserType.staff)
            .options(
                selectinload(User.staff_profile).selectinload(StaffProfile.department),
                selectinload(User.role)
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_staff_profile(self, user_id: Any) -> Optional[StaffProfile]:
        result = await self.db.execute(select(StaffProfile).where(StaffProfile.user_id == user_id))
        return result.scalar_one_or_none()

    async def add_staff_profile(self, profile: StaffProfile) -> StaffProfile:
        self.db.add(profile)
        await self.db.flush()
        return profile

    async def get_faculty_with_profile(self, user_id: Any) -> Optional[User]:
        stmt = (
            select(User)
            .where(User.id == user_id, User.user_type == UserType.faculty)
            .options(
                selectinload(User.faculty_profile).selectinload(FacultyProfile.department),
                selectinload(User.faculty_profile).selectinload(FacultyProfile.course),
                selectinload(User.role)
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()
