from typing import List, Tuple, Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy import func

from app.core.uow import UnitOfWork
from app.repositories.complaint_repository import ComplaintRepository
from app.models.complaint import Complaint, ComplaintStatusLog, ComplaintStatus, ComplaintCategory, ComplaintVisibility
from app.models.user import User

class ComplaintService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.repo = ComplaintRepository(uow.db)
        
    async def create_complaint(self, complaint: Complaint, changed_by: UUID) -> Complaint:
        async with self.uow.transaction():
            complaint = await self.repo.create(complaint)
            # The flush is inside repo.create(), so we have the ID now
            
            status_log = ComplaintStatusLog(
                complaint_id=complaint.id,
                status=ComplaintStatus.open,
                changed_by=changed_by,
                note="Complaint raised."
            )
            await self.repo.add_status_log(status_log)
        
        return complaint
        
    async def get_user_complaints(self, user_id: UUID, skip: int = 0, limit: int = 100) -> Tuple[List[Complaint], int]:
        return await self.repo.get_user_complaints(user_id, skip, limit)
        
    async def get_public_complaints(self, skip: int = 0, limit: int = 100) -> Tuple[List[Complaint], int]:
        filters = {"visibility": ComplaintVisibility.public}
        return await self.repo.list(filters=filters, skip=skip, limit=limit, order_by=Complaint.created_at.desc())
        
    async def get_all_complaints(
        self, 
        status: Optional[ComplaintStatus] = None, 
        category: Optional[ComplaintCategory] = None, 
        hostel_id: Optional[UUID] = None, 
        department_id: Optional[UUID] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> Tuple[List[Complaint], int]:
        return await self.repo.list_all(
            status=status,
            category=category,
            hostel_id=hostel_id,
            department_id=department_id,
            skip=skip,
            limit=limit
        )

    async def get_complaint(self, id: UUID) -> Optional[Complaint]:
        return await self.repo.get_by_id(id)

    async def update_status(self, id: UUID, new_status: ComplaintStatus, changed_by: UUID, note: Optional[str]) -> Optional[Complaint]:
        async with self.uow.transaction():
            complaint = await self.repo.get_by_id(id)
            if not complaint:
                return None
                
            complaint.status = new_status
            
            status_log = ComplaintStatusLog(
                complaint_id=complaint.id,
                status=new_status,
                changed_by=changed_by,
                note=note
            )
            await self.repo.add_status_log(status_log)
            
        return complaint
        
    async def assign_complaint(self, id: UUID, assigned_to: UUID) -> Optional[Complaint]:
        async with self.uow.transaction():
            complaint = await self.repo.get_by_id(id)
            if not complaint:
                return None
                
            complaint.assigned_to = assigned_to
            
        return complaint

    async def cancel_complaint(self, id: UUID, changed_by: UUID) -> Optional[Complaint]:
        async with self.uow.transaction():
            complaint = await self.repo.get_by_id(id)
            if not complaint:
                return None
                
            if complaint.raised_by != changed_by:
                raise ValueError("Not authorized to cancel this complaint")
                
            if complaint.status != ComplaintStatus.open:
                raise ValueError("Only open complaints can be cancelled")
                
            complaint.status = ComplaintStatus.cancelled
            
            status_log = ComplaintStatusLog(
                complaint_id=complaint.id,
                status=ComplaintStatus.cancelled,
                changed_by=changed_by,
                note="Cancelled by creator."
            )
            await self.repo.add_status_log(status_log)
            
        return complaint
        
    async def get_recurring_analytics(self, days: int) -> List[dict]:
        window_start = datetime.now(timezone.utc) - timedelta(days=days)
        
        from sqlalchemy import select
        stmt = (
            select(Complaint.category, Complaint.hostel_id, func.count(Complaint.id).label("count"))
            .where(Complaint.created_at >= window_start)
            .group_by(Complaint.category, Complaint.hostel_id)
            .order_by(func.count(Complaint.id).desc())
        )
        # using the internal DB since repo doesn't map arbitrary groupings
        result = await self.uow.db.execute(stmt)
        return [
            {
                "category": row.category,
                "hostel_id": row.hostel_id,
                "count": row.count,
                "window_days": days
            }
            for row in result.all()
        ]

    async def get_ageing_analytics(self) -> List[Complaint]:
        terminal_states = [ComplaintStatus.resolved, ComplaintStatus.closed, ComplaintStatus.cancelled]
        from sqlalchemy import select
        stmt = (
            select(Complaint)
            .where(Complaint.status.not_in(terminal_states))
            .order_by(Complaint.created_at.asc())
        )
        result = await self.uow.db.execute(stmt)
        return result.scalars().all()
