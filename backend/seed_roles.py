import asyncio
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.rbac import Role

async def seed_roles():
    async with AsyncSessionLocal() as db:
        roles = [
            {"code": "BASE", "name": "Base User", "description": "Default role", "is_system": True, "is_assignable": False, "status": "ACTIVE"},
            {"code": "ADMIN", "name": "Administrator", "description": "System admin", "is_system": True, "is_assignable": False, "status": "ACTIVE"},
            {"code": "STUDENT", "name": "Student", "description": "Student role", "is_system": True, "is_assignable": True, "status": "ACTIVE"},
            {"code": "FACULTY", "name": "Faculty", "description": "Faculty role", "is_system": True, "is_assignable": True, "status": "ACTIVE"},
            {"code": "STAFF", "name": "Staff", "description": "Staff role", "is_system": True, "is_assignable": True, "status": "ACTIVE"},
            {"code": "PARENT", "name": "Parent", "description": "Parent role", "is_system": True, "is_assignable": True, "status": "ACTIVE"},
        ]
        
        for role_data in roles:
            stmt = select(Role).where(Role.code == role_data["code"])
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()
            if not existing:
                new_role = Role(**role_data)
                db.add(new_role)
        
        await db.flush()
        
        # Seed first admin user

        from app.core.security import hash_password
        from app.models.user import User, AccountStatus, UserType
        
        stmt = select(User).where(User.email == "admin@college.edu")
        result = await db.execute(stmt)
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            admin_role_stmt = select(Role).where(Role.code == "ADMIN")
            admin_role = (await db.execute(admin_role_stmt)).scalar_one()
            
            new_admin = User(
                email="admin@college.edu",
                hashed_password=hash_password("Admin@123"),
                account_status=AccountStatus.active,
                user_type=UserType.admin,
                name="System Administrator",
                role_id=admin_role.id
            )
            db.add(new_admin)
            
        await db.commit()
        print("Roles and Admin user seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_roles())
