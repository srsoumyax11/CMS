import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def test():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, user_id, registration_no, roll_no FROM student_profiles WHERE registration_no='2301230114' OR roll_no='2301230114'"))
        for r in res.fetchall():
            print(dict(r._mapping))
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(test())
