from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Tuple, Optional
from uuid import UUID
from datetime import datetime

from app.repositories.base_repository import GenericRepository
from app.models.notice import Notice, NoticeRead
from app.models.user import UserType
from app.models.profiles import StudentProfile

class NoticeRepository(GenericRepository[Notice]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Notice)

    async def get_feed_for_user(self, user_id: UUID, user_type: UserType, profile: Optional[StudentProfile] = None, skip: int = 0, limit: int = 50) -> Tuple[List[Tuple[Notice, bool]], int]:
        read_exists = select(NoticeRead.id).where(
            and_(NoticeRead.notice_id == Notice.id, NoticeRead.user_id == user_id)
        ).exists()
        
        stmt = select(Notice, read_exists.label("is_read"))
        
        if user_type == UserType.student and profile:
            stmt = stmt.where(
                or_(
                    Notice.target_user_types.contains([UserType.student.value]),
                    Notice.target_user_types.is_(None)
                )
            ).where(
                or_(
                    Notice.target_course_id == profile.course_id,
                    Notice.target_course_id.is_(None)
                )
            ).where(
                or_(
                    Notice.target_department_id == profile.department_id,
                    Notice.target_department_id.is_(None)
                )
            ).where(
                or_(
                    Notice.target_year == profile.year,
                    Notice.target_year.is_(None)
                )
            ).where(
                or_(
                    Notice.target_hostel == profile.hostel,
                    Notice.target_hostel.is_(None)
                )
            )
        elif user_type == UserType.faculty:
            stmt = stmt.where(
                or_(
                    Notice.target_user_types.contains([UserType.faculty.value]),
                    Notice.target_user_types.is_(None)
                )
            )
            # Add department filter for faculty if they have one? Right now backend doesn't filter faculty feed by dept, it just uses the query in notices.py. Wait, let's keep it the same as the original route.
            
        stmt = stmt.order_by(Notice.created_at.desc())
        
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count = await self.db.scalar(count_stmt)
        
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return result.all(), count or 0

    async def mark_as_read(self, notice_id: UUID, user_id: UUID) -> bool:
        stmt = select(NoticeRead).where(
            and_(NoticeRead.notice_id == notice_id, NoticeRead.user_id == user_id)
        )
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        if not existing:
            read_record = NoticeRead(notice_id=notice_id, user_id=user_id)
            self.db.add(read_record)
            return True
        return False
        
    async def get_with_read_status(self, notice_id: UUID, user_id: UUID) -> Optional[Tuple[Notice, bool]]:
        read_exists = select(NoticeRead.id).where(
            and_(NoticeRead.notice_id == Notice.id, NoticeRead.user_id == user_id)
        ).exists()
        
        stmt = select(Notice, read_exists.label("is_read")).where(Notice.id == notice_id)
        result = await self.db.execute(stmt)
        return result.first()
