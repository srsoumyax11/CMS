from typing import List, Tuple, Optional
from uuid import UUID

from app.core.uow import UnitOfWork
from app.repositories.notice_repository import NoticeRepository
from app.models.notice import Notice
from app.models.user import UserType
from app.models.profiles import StudentProfile

class NoticeService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.repo = NoticeRepository(uow.db)
        
    async def create_notice(self, notice: Notice) -> Notice:
        async with self.uow.transaction():
            return await self.repo.create(notice)
            
    async def get_feed_for_user(self, user_id: UUID, user_type: UserType, profile: Optional[StudentProfile] = None, skip: int = 0, limit: int = 50) -> Tuple[List[Tuple[Notice, bool]], int]:
        # For Admin (or superadmin), they see all notices
        if user_type == UserType.admin:
            from sqlalchemy import select, func, and_
            from app.models.notice import NoticeRead
            read_exists = select(NoticeRead.id).where(
                and_(NoticeRead.notice_id == Notice.id, NoticeRead.user_id == user_id)
            ).exists()
            stmt = select(Notice, read_exists.label("is_read")).order_by(Notice.created_at.desc())
            
            count_stmt = select(func.count()).select_from(stmt.subquery())
            count = await self.uow.db.scalar(count_stmt)
            
            result = await self.uow.db.execute(stmt.offset(skip).limit(limit))
            return result.all(), count or 0

        return await self.repo.get_feed_for_user(user_id, user_type, profile, skip, limit)

    async def get_notice(self, id: UUID, user_id: UUID, user_type: UserType, profile: Optional[StudentProfile] = None) -> Optional[Tuple[Notice, bool]]:
        row = await self.repo.get_with_read_status(id, user_id)
        if not row:
            return None
            
        notice, is_read = row
        
        # Apply viewing logic
        if user_type == UserType.student:
            if not profile:
                raise ValueError("Student profile not found")
                
            can_view = True
            if notice.target_user_types and "student" not in notice.target_user_types:
                can_view = False
            if notice.target_course_id and notice.target_course_id != profile.course_id:
                can_view = False
            if notice.target_department_id and notice.target_department_id != profile.department_id:
                can_view = False
            if notice.target_year and notice.target_year != profile.year:
                can_view = False
            if notice.target_hostel and notice.target_hostel != profile.hostel:
                can_view = False
                
            if not can_view:
                raise ValueError("You do not have access to this notice")
                
        elif user_type == UserType.faculty:
            if notice.target_user_types and "faculty" not in notice.target_user_types:
                raise ValueError("You do not have access to this notice")

        return notice, is_read

    async def mark_as_read(self, notice_id: UUID, user_id: UUID) -> bool:
        async with self.uow.transaction():
            return await self.repo.mark_as_read(notice_id, user_id)

    async def delete_notice(self, id: UUID, user_id: UUID, has_delete_permission: bool) -> Optional[Notice]:
        async with self.uow.transaction():
            notice = await self.repo.get_by_id(id)
            if not notice:
                return None
                
            if notice.author_id != user_id and not has_delete_permission:
                raise ValueError("Cannot modify someone else's notice")
                
            await self.repo.delete(notice)
            return notice
            
    async def update_notice(self, id: UUID, user_id: UUID, has_edit_permission: bool, update_data: dict) -> Optional[Notice]:
        async with self.uow.transaction():
            notice = await self.repo.get_by_id(id)
            if not notice:
                return None
                
            if notice.author_id != user_id and not has_edit_permission:
                raise ValueError("Cannot modify someone else's notice")
                
            # Perform update
            for key, value in update_data.items():
                if hasattr(notice, key):
                    setattr(notice, key, value)
                    
            return notice
