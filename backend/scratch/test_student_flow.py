import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import engine
from app.models.user import User, UserType, AccountStatus
from app.models.academic import Department, Course, TimetableSlot
from app.models.profiles import StudentProfile

async def test_student_flow():
    async with engine.begin() as conn:
        print("Starting test flow")
        pass

if __name__ == "__main__":
    asyncio.run(test_student_flow())
