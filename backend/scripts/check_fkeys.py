import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def test():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id FROM departments WHERE id='cb240069-9da5-4e20-9c8c-2a15c7a28900'"))
        print("Department:", res.fetchall())
        res2 = await conn.execute(text("SELECT id FROM courses WHERE id='5a83ead5-f84f-4894-8e43-907530150e1c'"))
        print("Course:", res2.fetchall())
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(test())
