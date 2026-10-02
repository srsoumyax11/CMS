import asyncio
import sys
sys.path.append('d:/WebDev/CMS/backend')
from app.db.session import async_session_maker
from sqlalchemy import text

async def main():
    async with async_session_maker() as session:
        res = await session.execute(text('SELECT r.name, p.resource, p.action FROM roles r JOIN role_permissions rp ON r.id = rp.role_id JOIN permissions p ON rp.permission_id = p.id;'))
        for row in res:
            print(row)

if __name__ == '__main__':
    asyncio.run(main())
