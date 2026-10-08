from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.repositories.base_repository import GenericRepository
from app.models.documents import DocumentType, DocumentRequest, DocumentApproval, DocumentRequestStatus

class DocumentTypeRepository(GenericRepository[DocumentType]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, DocumentType)

    async def get_by_code(self, code: str) -> Optional[DocumentType]:
        stmt = select(DocumentType).where(DocumentType.code == code)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

class DocumentRequestRepository(GenericRepository[DocumentRequest]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, DocumentRequest)

    async def get_by_verify_code(self, verify_code: str) -> Optional[DocumentRequest]:
        stmt = select(DocumentRequest).where(DocumentRequest.verify_code == verify_code)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_requests(
        self, user_id: UUID, skip: int = 0, limit: int = 100
    ) -> Tuple[List[DocumentRequest], int]:
        stmt = select(DocumentRequest).where(DocumentRequest.user_id == user_id).order_by(DocumentRequest.created_at.desc())
        
        count_stmt = select(func.count()).select_from(DocumentRequest).where(DocumentRequest.user_id == user_id)
        count = await self.db.scalar(count_stmt)

        result = await self.db.execute(stmt.offset(skip).limit(limit))
        return list(result.scalars().all()), count or 0

class DocumentApprovalRepository(GenericRepository[DocumentApproval]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, DocumentApproval)

    async def get_request_approvals(self, request_id: UUID) -> List[DocumentApproval]:
        stmt = select(DocumentApproval).where(DocumentApproval.request_id == request_id).order_by(DocumentApproval.step_no.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
