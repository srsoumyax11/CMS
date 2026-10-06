from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.repositories.base_repository import GenericRepository
from app.models.document import DocumentRequest, DocumentStatusLog, DocumentStatus, DocumentType
from app.models.user import User

class DocumentRepository(GenericRepository[DocumentRequest]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, DocumentRequest)

    async def count_active_pending_requests(self, student_id: UUID) -> int:
        stmt = (
            select(func.count(DocumentRequest.id))
            .where(
                and_(
                    DocumentRequest.student_id == student_id,
                    DocumentRequest.status == DocumentStatus.pending
                )
            )
        )
        count = await self.db.scalar(stmt)
        return count or 0

    async def get_with_details(self, request_id: UUID) -> Optional[DocumentRequest]:
        stmt = (
            select(DocumentRequest)
            .where(DocumentRequest.id == request_id)
            .options(
                selectinload(DocumentRequest.student),
                selectinload(DocumentRequest.processor),
                selectinload(DocumentRequest.status_logs).selectinload(DocumentStatusLog.changer)
            )
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_student_requests(
        self,
        student_id: UUID,
        status: Optional[DocumentStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[DocumentRequest], int]:
        filters = [DocumentRequest.student_id == student_id]
        if status:
            filters.append(DocumentRequest.status == status)

        count_stmt = select(func.count(DocumentRequest.id)).where(and_(*filters))
        total = await self.db.scalar(count_stmt) or 0

        stmt = (
            select(DocumentRequest)
            .where(and_(*filters))
            .options(
                selectinload(DocumentRequest.processor),
                selectinload(DocumentRequest.status_logs).selectinload(DocumentStatusLog.changer)
            )
            .order_by(DocumentRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all()), total

    async def get_all_requests(
        self,
        status: Optional[DocumentStatus] = None,
        document_type: Optional[DocumentType] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[DocumentRequest], int]:
        filters = []
        if status:
            filters.append(DocumentRequest.status == status)
        if document_type:
            filters.append(DocumentRequest.document_type == document_type)

        count_stmt = select(func.count(DocumentRequest.id))
        if filters:
            count_stmt = count_stmt.where(and_(*filters))
        total = await self.db.scalar(count_stmt) or 0

        stmt = select(DocumentRequest)
        if filters:
            stmt = stmt.where(and_(*filters))

        stmt = (
            stmt.options(
                selectinload(DocumentRequest.student),
                selectinload(DocumentRequest.processor),
                selectinload(DocumentRequest.status_logs).selectinload(DocumentStatusLog.changer)
            )
            .order_by(DocumentRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all()), total

    async def add_status_log(self, log: DocumentStatusLog) -> DocumentStatusLog:
        self.db.add(log)
        await self.db.flush()
        return log
