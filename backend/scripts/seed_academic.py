import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from app.core.database import AsyncSessionLocal
from app.models.academic import Course, Branch

async def seed_data():
    async with AsyncSessionLocal() as session:
        courses_data = [
            {"id": uuid.UUID('13408608-0072-4669-bc98-87013c5252b0'), "name": "B.Tech", "is_active": True},
            {"id": uuid.UUID('95f0113c-cc83-4c91-9e8c-8be94f576eec'), "name": "M.Tech", "is_active": True},
            {"id": uuid.UUID('677cd2f7-bc6d-495d-ab9a-36bdf483b2bb'), "name": "Ph.D", "is_active": True}
        ]
        
        for c in courses_data:
            stmt = insert(Course).values(**c).on_conflict_do_nothing(index_elements=['name'])
            await session.execute(stmt)

        btech_id = uuid.UUID('13408608-0072-4669-bc98-87013c5252b0')
        mtech_id = uuid.UUID('95f0113c-cc83-4c91-9e8c-8be94f576eec')

        branches_data = [
            {"name": "CSE", "course_id": btech_id},
            {"name": "ECE", "course_id": btech_id},
            {"name": "ME", "course_id": btech_id},
            {"name": "CE", "course_id": btech_id},
            {"name": "EE", "course_id": btech_id},
            {"name": "IT", "course_id": btech_id},
            {"name": "Computer Science", "course_id": mtech_id},
            {"name": "VLSI", "course_id": mtech_id},
            {"name": "Thermal Engineering", "course_id": mtech_id},
        ]
        
        for b in branches_data:
            stmt = insert(Branch).values(**b).on_conflict_do_nothing(index_elements=['name', 'course_id'])
            await session.execute(stmt)
            
        await session.commit()
        print("Academic base data seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
