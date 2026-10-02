from sqlalchemy import UUID
from typing import Optional, List, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.user import User, UserType
from app.models.profiles import StudentProfile, FacultyProfile
from app.repositories.base_repository import GenericRepository

class UserRepository(GenericRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, User)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_email_with_profiles(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).options(
                selectinload(User.student_profile),
                selectinload(User.faculty_profile)
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

    async def get_by_user_id_str(self, user_id_str: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.user_id == user_id_str))
        return result.scalar_one_or_none()

    async def list_students_with_profiles(self, status: Optional[str] = None, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        stmt = select(User).outerjoin(StudentProfile, User.id == StudentProfile.user_id).options(
            selectinload(User.student_profile).selectinload(StudentProfile.course),
            selectinload(User.student_profile).selectinload(StudentProfile.department)
        ).where(User.user_type == UserType.student)
        
        if status:
            stmt = stmt.where(User.account_status == status)
            
        stmt = stmt.order_by(User.name.asc())
        
        # We don't have a count statement easily built for this complex join yet,
        # but in GenericRepository we can just do a count over the base User model if we want,
        # or we just return the length for now (like admin.py currently does for total count, wait, admin.py doesn't return correct total anyway).
        
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        users = result.scalars().all()
        return users, len(users)

    async def list_faculty_with_profiles(self, status: Optional[str] = None, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        stmt = select(User).outerjoin(FacultyProfile, User.id == FacultyProfile.user_id).options(
            selectinload(User.faculty_profile).selectinload(FacultyProfile.department),
            selectinload(User.faculty_profile).selectinload(FacultyProfile.course),
            selectinload(User.role)
        ).where(User.user_type == UserType.faculty)
        
        if status:
            stmt = stmt.where(User.account_status == status)
            
        stmt = stmt.order_by(User.name.asc())
        
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        users = result.scalars().all()
        return users, len(users)

    async def get_student_profile(self, user_id: Any) -> Optional[StudentProfile]:
        result = await self.db.execute(select(StudentProfile).where(StudentProfile.user_id == user_id))
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
