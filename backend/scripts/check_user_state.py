import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def test():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, user_type, account_status FROM users WHERE email='arjun.mehta_1791457142182_9@campusone.edu'"))
        user = res.fetchone()
        if user:
            print("User:", dict(user._mapping))
            res2 = await conn.execute(text(f"SELECT * FROM student_profiles WHERE user_id='{user[0]}'"))
            print("Profile:", res2.fetchall())
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(test())
