import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text
from app.core.config import settings
from app.models.profiles import StudentProfile
from app.models.user import User
import uuid

async def test():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Let's try to find Arjun Mehta
            res = await session.execute(text("SELECT id FROM users WHERE email LIKE 'arjun.mehta%' LIMIT 1"))
            user_id_row = res.fetchone()
            if not user_id_row:
                print("User not found")
                return
            user_id = user_id_row[0]
            
            profile = StudentProfile(
                user_id=user_id,
                registration_no="2301230114",
                roll_no="2301230114",
                course_id=uuid.UUID("5a83ead5-f84f-4894-8e43-907530150e1c"),
                department_id=uuid.UUID("cb240069-9da5-4e20-9c8c-2a15c7a28900"),
                admission_year=2023,
                current_semester=7,
                section="A",
                year=4,
                academic_status="enrolled"
            )
            session.add(profile)
            await session.commit()
            print("Successfully inserted!")
        except IntegrityError as e:
            print(f"INTEGRITY ERROR: {e.orig}")
        except Exception as e:
            print(f"OTHER ERROR: {e}")
            
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(test())
