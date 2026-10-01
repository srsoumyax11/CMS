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
        return result.scalars().all(), count or 0

    async def add_status_log(self, log: ComplaintStatusLog) -> ComplaintStatusLog:
        self.db.add(log)
        return log
