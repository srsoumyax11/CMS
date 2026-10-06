"""
Faculty Creation Handler Module.

Provides functions to create faculty user accounts and faculty profiles idempotently in the database.
"""

import random
import logging
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserType, AccountStatus
from app.models.profiles import FacultyProfile, EmploymentStatus
from app.models.academic import Department
from app.models.rbac import Role
from app.core.security import hash_password

logger = logging.getLogger(__name__)


async def create_faculty(
    session: AsyncSession,
    name: str,
    email: str,
    password: str,
    department_code: str,
    designation: str,
    is_active: bool = True,
) -> User:
    """
    Creates or updates a faculty member user account and profile idempotently.

    Args:
        session (AsyncSession): SQLAlchemy async database session.
        name (str): Full name of the faculty member.
        email (str): Official email address.
        password (str): Account password.
        department_code (str): Code of the department (e.g., 'CSE', 'ECE').
        designation (str): Academic post/designation.
        is_active (bool): Active status.

    Returns:
        User: The created or updated Faculty User instance.
    """
    clean_email = email.strip().lower()
    clean_name = name.strip()
    clean_dept_code = department_code.strip().upper()

    # Resolve department by code
    stmt_dept = select(Department).where(Department.code == clean_dept_code)
    result_dept = await session.execute(stmt_dept)
    dept = result_dept.scalar_one_or_none()

    if not dept:
        raise ValueError(f"Department with code '{clean_dept_code}' not found")

    # Resolve default Faculty role
    stmt_role = select(Role).where(Role.name == "Faculty")
    result_role = await session.execute(stmt_role)
    faculty_role = result_role.scalar_one_or_none()
    role_id = faculty_role.id if faculty_role else None

    # Check if User exists by email
    stmt_user = select(User).where(User.email == clean_email)
    result_user = await session.execute(stmt_user)
    existing_user = result_user.scalar_one_or_none()

    if existing_user:
        existing_user.name = clean_name
        existing_user.account_status = AccountStatus.active if is_active else AccountStatus.suspended
        if role_id:
            existing_user.role_id = role_id

        # Update profile
        stmt_prof = select(FacultyProfile).where(FacultyProfile.user_id == existing_user.id)
        result_prof = await session.execute(stmt_prof)
        profile = result_prof.scalar_one_or_none()

        if profile:
            profile.department_id = dept.id
            profile.designation = designation
            profile.employment_status = EmploymentStatus.active
        else:
            new_profile = FacultyProfile(
                user_id=existing_user.id,
                department_id=dept.id,
                designation=designation,
                employment_status=EmploymentStatus.active,
            )
            session.add(new_profile)

        logger.info(
            f"🔄 Updated existing faculty: {clean_name} ({clean_email}) -> Dept: [{clean_dept_code}]"
        )
        return existing_user

    # Create new user
    user_id_str = f"FAC{random.randint(10000, 99999)}"
    new_user = User(
        email=clean_email,
        name=clean_name,
        hashed_password=hash_password(password),
        user_type=UserType.faculty,
        account_status=AccountStatus.active if is_active else AccountStatus.suspended,
        role_id=role_id,
    )
    session.add(new_user)
    await session.flush()

    # Create linked faculty profile
    new_profile = FacultyProfile(
        user_id=new_user.id,
        department_id=dept.id,
        designation=designation,
        employment_status=EmploymentStatus.active,
    )
    session.add(new_profile)

    logger.info(
        f"✨ Created new faculty: {clean_name} ({clean_email}) -> Dept: [{clean_dept_code}]"
    )
    return new_user
