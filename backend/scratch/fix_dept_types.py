import asyncio
from sqlalchemy import update
from app.core.database import engine
from app.models.academic import Department

async def fix_departments():
    admin_depts = ['Administrative', 'Accounts', 'Human Resources', 'Library']
    
    async with engine.begin() as conn:
        stmt = (
            update(Department)
            .where(Department.name.in_(admin_depts))
            .values(department_type='administrative')
        )
        await conn.execute(stmt)
        print("Successfully updated administrative departments.")

if __name__ == "__main__":
    asyncio.run(fix_departments())
