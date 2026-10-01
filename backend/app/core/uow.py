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
        if self.db.in_transaction():
            # Already in a transaction, just yield the session
            yield self.db
        else:
            async with self.db.begin():
                try:
                    yield self.db
                    # Auto-commit on successful exit
                except Exception:
                    # Auto-rollback on exception
                    raise
