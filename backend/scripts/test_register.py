import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User, UserType
from app.models.profiles import StudentProfile, StudentStatus
from app.core.security import hash_password
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        async with db.begin():
            new_user = User(
                email="test500@example.com",
                hashed_password=hash_password("password"),
                user_type=UserType.student
            )
            db.add(new_user)
            await db.flush()  # to get new_user.id
            
            student_profile = StudentProfile(
                user_id=new_user.id,
                name="User1",
                course="btec",
                branch="cse",
                year=202,
                photo_url="google.com",
                status=StudentStatus.pending
            )
            db.add(student_profile)
        print("Success!")

asyncio.run(main())
