from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog
from app.repositories.base_repository import GenericRepository

class AuditLogRepository(GenericRepository[AuditLog]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, AuditLog)
