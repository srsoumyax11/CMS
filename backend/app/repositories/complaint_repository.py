from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from typing import List, Tuple, Optional
from uuid import UUID
from datetime import datetime
from app.repositories.base_repository import GenericRepository
from app.models.complaint import Complaint, ComplaintStatusLog, ComplaintStatus, ComplaintCategory

class ComplaintRepository(GenericRepository[Complaint]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Complaint)

    async def get_with_logs(self, complaint_id: UUID) -> Optional[Complaint]:
        from sqlalchemy.orm import selectinload
        stmt = select(Complaint).options(selectinload(Complaint.status_logs)).where(Complaint.id == complaint_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
        
    async def get_user_complaints(self, user_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[Complaint], int]:
        stmt = select(Complaint).where(Complaint.raised_by == user_id).order_by(Complaint.created_at.desc())
        count_stmt = select(func.count(Complaint.id)).where(Complaint.raised_by == user_id)
        
        count = await self.db.scalar(count_stmt)
        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), count or 0

    async def add_status_log(self, log: ComplaintStatusLog) -> ComplaintStatusLog:
        self.db.add(log)
        return log

    async def list_all(
        self,
        status: Optional[ComplaintStatus] = None,
        category: Optional[ComplaintCategory] = None,
        hostel_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Complaint], int]:
        from app.models.user import User
        from app.models.profiles import StudentProfile, FacultyProfile, StaffProfile
        from sqlalchemy import or_

        stmt = select(Complaint)
        count_stmt = select(func.count(Complaint.id))

        if department_id is not None:
            dept_cond = or_(
                StudentProfile.department_id == department_id,
                FacultyProfile.department_id == department_id,
                StaffProfile.department_id == department_id
            )
            stmt = (
                stmt
                .outerjoin(User, Complaint.raised_by == User.id)
                .outerjoin(StudentProfile, User.id == StudentProfile.user_id)
                .outerjoin(FacultyProfile, User.id == FacultyProfile.user_id)
                .outerjoin(StaffProfile, User.id == StaffProfile.user_id)
                .where(dept_cond)
            )
            count_stmt = (
                count_stmt
                .select_from(Complaint)
                .outerjoin(User, Complaint.raised_by == User.id)
                .outerjoin(StudentProfile, User.id == StudentProfile.user_id)
                .outerjoin(FacultyProfile, User.id == FacultyProfile.user_id)
                .outerjoin(StaffProfile, User.id == StaffProfile.user_id)
                .where(dept_cond)
            )

        if status:
            stmt = stmt.where(Complaint.status == status)
            count_stmt = count_stmt.where(Complaint.status == status)
        if category:
            stmt = stmt.where(Complaint.category == category)
            count_stmt = count_stmt.where(Complaint.category == category)
        if hostel_id:
            stmt = stmt.where(Complaint.hostel_id == hostel_id)
            count_stmt = count_stmt.where(Complaint.hostel_id == hostel_id)

        total = await self.db.scalar(count_stmt)
        stmt = stmt.order_by(Complaint.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())
        return items, total or 0

