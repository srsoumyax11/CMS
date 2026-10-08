from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.repositories.base_repository import GenericRepository
from app.models.gate_pass import GatePass

class GatePassRepository(GenericRepository[GatePass]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, GatePass)

    # We can add custom complex queries here if needed, but GenericRepository.list handles most.
