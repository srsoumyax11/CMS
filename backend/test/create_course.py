"""
Course Creation Handler Module.

Provides functions to create degree courses idempotently in the database.
"""

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Course

logger = logging.getLogger(__name__)


async def create_course(
    session: AsyncSession,
    code: str,
    name: str,
    duration_years: int = 4,
    is_active: bool = True,
) -> Course:
    """
    Creates or updates a course in the database idempotently.

    Args:
        session (AsyncSession): SQLAlchemy async database session.
        code (str): Short course code (e.g., 'BTECH', 'MTECH').
        name (str): Full course name (e.g., 'Bachelor of Technology').
        duration_years (int): Duration of the program in years.
        is_active (bool): Active status flag.

    Returns:
        Course: The created or updated Course instance.
    """
    clean_code = code.strip().upper()
    clean_name = name.strip()

    stmt = select(Course).where(
        (Course.code == clean_code) | (Course.name == clean_name)
    )
    result = await session.execute(stmt)
    existing_course = result.scalar_one_or_none()

    if existing_course:
        existing_course.name = clean_name
        existing_course.code = clean_code
        existing_course.duration_years = duration_years
        existing_course.is_active = is_active

        logger.info(
            f"🔄 Updated existing course: [{clean_code}] {clean_name} ({duration_years} Years)"
        )
        return existing_course

    new_course = Course(
        code=clean_code,
        name=clean_name,
        duration_years=duration_years,
        is_active=is_active,
    )
    session.add(new_course)
    logger.info(
        f"✨ Created new course: [{clean_code}] {clean_name} ({duration_years} Years)"
    )
    return new_course
