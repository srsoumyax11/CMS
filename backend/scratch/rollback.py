import asyncio
import app.core.database as db
from sqlalchemy import text

async def main():
    async with db.engine.begin() as conn:
        await conn.execute(text("ALTER TABLE departments DROP COLUMN hod_user_id CASCADE;"))
        await conn.execute(text("ALTER TABLE departments DROP COLUMN infrastructure_id CASCADE;"))
        await conn.execute(text("DROP TABLE rooms CASCADE;"))
        await conn.execute(text("DROP TABLE infrastructure CASCADE;"))
        await conn.execute(text("DELETE FROM alembic_version;"))
        await conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('b7cb69b1a046');"))
        print("Done")

if __name__ == "__main__":
    asyncio.run(main())
