import asyncio
import sys
sys.path.append('d:/WebDev/CMS/backend')
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("""
            SELECT ast.name, a.code 
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            JOIN roles r ON rp.role_id = r.id
            JOIN assets ast ON p.asset_id = ast.id
            JOIN actions a ON p.action_id = a.id
            WHERE r.name = 'SuperAdmin'
        """))
        for row in res:
            print(row)

if __name__ == '__main__':
    asyncio.run(main())
