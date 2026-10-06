import asyncio
from sqlalchemy.sql import text
from app.core.database import engine

async def alter_enum():
    async with engine.connect() as conn:
        await conn.execution_options(isolation_level="AUTOCOMMIT")
        await conn.execute(text("ALTER TYPE user_type_enum ADD VALUE IF NOT EXISTS 'user';"))
        await conn.execute(text("ALTER TYPE user_type_enum ADD VALUE IF NOT EXISTS 'parent';"))
        print("PostgreSQL user_type_enum updated successfully with 'user' and 'parent'!")

if __name__ == "__main__":
    asyncio.run(alter_enum())
