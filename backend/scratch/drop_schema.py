import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine
from sqlalchemy.sql import text

async def drop_all():
    async with engine.begin() as conn:
        print("Dropping schema public...")
        await conn.execute(text("DROP SCHEMA public CASCADE;"))
        print("Creating schema public...")
        await conn.execute(text("CREATE SCHEMA public;"))
        print("Done!")

if __name__ == "__main__":
    asyncio.run(drop_all())
