"""
Department Creation Handler Module.

Provides functions to create academic and administrative departments cleanly in the database.
"""

import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.academic import Department

logger = logging.getLogger(__name__)


async def create_department(
    session: AsyncSession,
    code: str,
    name: str,
    department_type: str = "academic",
    is_active: bool = True,
    hod_user_id: Optional[str] = None,
) -> Department:
    """
    Creates or updates a department in the database idempotently.

    Args:
        session (AsyncSession): SQLAlchemy async database session.
        code (str): Unique department code (e.g., 'CSE', 'SEC').
        name (str): Full department name.
        department_type (str): 'academic' or 'administrative'.
        is_active (bool): Active status flag.
        hod_user_id (Optional[str]): HOD user ID if assigned.

    Returns:
        Department: The created or updated Department instance.
    """
    clean_code = code.strip().upper()
    clean_name = name.strip()

    # Query for existing department by code or name
    stmt = select(Department).where(
        (Department.code == clean_code) | (Department.name == clean_name)
    )
    result = await session.execute(stmt)
    existing_dept = result.scalar_one_or_none()

    if existing_dept:
        existing_dept.name = clean_name
        existing_dept.code = clean_code
        existing_dept.department_type = department_type
        existing_dept.is_active = is_active
        if hod_user_id is not None:
            existing_dept.hod_user_id = hod_user_id

        logger.info(
            f"🔄 Updated existing department: [{clean_code}] {clean_name} ({department_type})"
        )
        return existing_dept

    new_dept = Department(
        code=clean_code,
        name=clean_name,
        department_type=department_type,
        is_active=is_active,
        hod_user_id=hod_user_id,
    )
    session.add(new_dept)
    logger.info(
        f"✨ Created new department: [{clean_code}] {clean_name} ({department_type})"
    )
    return new_dept
