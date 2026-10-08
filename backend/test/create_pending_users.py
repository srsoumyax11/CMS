"""
Pending Users Seeding Handler
Creates 50 real Indian user accounts with pending status and no assigned roles.
These are primarily meant to populate the Role Applications Management page for testing.
"""

import random
import logging
import uuid
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserType, AccountStatus
from app.models.rbac import Role
from app.core.security import hash_password

logger = logging.getLogger(__name__)

# A predefined list of 50 Indian names
INDIAN_NAMES = [
    "Aarav Sharma", "Vivaan Singh", "Aditya Patel", "Vihaan Kumar", "Arjun Reddy",
    "Sai Krishna", "Reyansh Gupta", "Ayaan Das", "Krishna Iyer", "Ishaan Verma",
    "Shaurya Nair", "Atharva Joshi", "Aarush Menon", "Kabir Sen", "Ritvik Rao",
    "Rudra Desai", "Dhruv Malik", "Anshul Bhatia", "Pranav Kulkarni", "Devansh Mishra",
    "Diya Sharma", "Aanya Singh", "Myra Patel", "Aadya Kumar", "Ananya Reddy",
    "Navya Krishna", "Kiara Gupta", "Prisha Das", "Avni Iyer", "Ira Verma",
    "Anika Nair", "Mahi Joshi", "Sara Menon", "Pihu Sen", "Riya Rao",
    "Trisha Desai", "Kavya Malik", "Sia Bhatia", "Nisha Kulkarni", "Meera Mishra",
    "Rahul Banerjee", "Priya Chawla", "Amitabh Bose", "Sneha Kapoor", "Rohan Mehra",
    "Pooja Saxena", "Vikram Chauhan", "Neha Thakur", "Karan Ahuja", "Swati Tiwari"
]

async def create_pending_users(session: AsyncSession):
    """
    Creates 50 pending user accounts.
    """
    logger.info("--- Starting Pending Users Seeding ---")
    
    # Check if we already have pending users to avoid duplicating on re-runs
    stmt = select(User).where(User.account_status == AccountStatus.pending)
    result = await session.execute(stmt)
    existing_pending = result.scalars().all()
    
    if len(existing_pending) >= 50:
        logger.info(f"✅ Found {len(existing_pending)} existing pending users. Skipping creation.")
        return existing_pending

    # Fetch default 'user' role
    stmt_role = select(Role).where(Role.name == "user")
    result_role = await session.execute(stmt_role)
    user_role = result_role.scalar_one_or_none()
    role_id = user_role.id if user_role else None
    
    # We will use the hashed password provided by the user for all of them to save time
    default_hashed_password = "$2b$12$xCGJ5QXmVqHmEuS57FV/xeqfeYcfJ1j/2ZxOGzoMeKyGETtr2Qa8G"
    
    roles = ["student", "faculty", "staff", None]
    
    created_users = []
    
    for i, name in enumerate(INDIAN_NAMES):
        first_name = name.split()[0].lower()
        last_name = name.split()[-1].lower()
        # Ensure unique emails by appending a number
        email = f"{first_name}.{last_name}{i}@cms.com"
        
        # Randomly assign a target role to some of them so they show up meaningfully in the UI
        target_role = random.choice(roles)
        application_data = None
        
        if target_role == "student":
            application_data = {"registration_number": f"REG2024{random.randint(1000, 9999)}", "department": "CSE"}
        elif target_role == "faculty":
            application_data = {"employee_id": f"EMP{random.randint(1000, 9999)}", "department": "ECE"}
        elif target_role == "staff":
            application_data = {"employee_id": f"STF{random.randint(1000, 9999)}", "department": "SEC"}
            
        new_user = User(
            email=email,
            hashed_password=default_hashed_password,
            name=name,
            account_status=AccountStatus.pending,
            user_type=UserType.user,
            email_notifications=True,
            in_app_alerts=True,
            is_2fa_enabled=False,
            target_role=target_role,
            application_data=application_data,
            role_id=role_id,
            status_note=None,
            photo_url=None,
            phone=None
        )
        session.add(new_user)
        created_users.append(new_user)

    await session.commit()
    logger.info(f"✨ Successfully created {len(created_users)} pending users.")
    return created_users
