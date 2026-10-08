import asyncio
from app.core.database import engine
from app.models.base import Base
# Import all models so metadata knows about them
import app.models

async def drop_all():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

asyncio.run(drop_all())
