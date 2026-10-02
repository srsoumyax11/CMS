import asyncio
import sys
sys.path.append('d:/WebDev/CMS/backend')
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text('SELECT id, name FROM roles;'))
        for row in res:
            print(row)

if __name__ == '__main__':
    asyncio.run(main())
