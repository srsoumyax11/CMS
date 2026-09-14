import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.academic import Course, Branch

async def seed_data():
    async with AsyncSessionLocal() as session:
        # Create B.Tech Course
        btech = Course(name="B.Tech")
        session.add(btech)
        await session.flush()

        # Create Branches for B.Tech
        branches = ["CSE", "ECE", "ME", "CE", "EE", "IT"]
        for branch_name in branches:
            session.add(Branch(name=branch_name, course_id=btech.id))
            
        # Create M.Tech Course
        mtech = Course(name="M.Tech")
        session.add(mtech)
        await session.flush()
        
        # Create Branches for M.Tech
        m_branches = ["Computer Science", "VLSI", "Thermal Engineering"]
        for branch_name in m_branches:
            session.add(Branch(name=branch_name, course_id=mtech.id))

        await session.commit()
        print("Successfully seeded Course and Branch data!")

if __name__ == "__main__":
    asyncio.run(seed_data())
