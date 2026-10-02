from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession

class UnitOfWork:
    def __init__(self, db: AsyncSession):
        self.db = db

    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Atomic transaction block.
        If an exception is raised, the transaction rolls back.
        If successful, the transaction commits.
        """
        try:
            yield self.db
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            raise

from fastapi import Depends
from app.core.database import get_db

async def get_uow(db: AsyncSession = Depends(get_db)) -> UnitOfWork:
    return UnitOfWork(db)
