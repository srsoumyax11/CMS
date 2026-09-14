import asyncio
import asyncpg
from app.core.config import settings

async def clean_db():
    # settings.DATABASE_URL is postgresql+asyncpg://..., asyncpg needs postgresql://
    url = settings.DATABASE_URL.replace("+asyncpg", "")
    conn = await asyncpg.connect(url)
    
    # Drop schema public cascade and recreate
    await conn.execute("DROP SCHEMA public CASCADE;")
    await conn.execute("CREATE SCHEMA public;")
    await conn.execute("GRANT ALL ON SCHEMA public TO postgres;")
    await conn.execute("GRANT ALL ON SCHEMA public TO public;")
    
    await conn.close()
    print("Database cleaned.")

if __name__ == "__main__":
    asyncio.run(clean_db())
