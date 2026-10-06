from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rbac import Role

async def seed_roles(db: AsyncSession) -> dict[str, Role]:
    print("📌 Seeding Roles & RBAC Permissions...")
    roles_data = [
        ("admin", "Administrator", "Full system administration and control"),
        ("faculty", "Faculty", "Teaching staff and department management"),
        ("student", "Student", "Enrolled student account"),
        ("parent", "Parent", "Parent or legal guardian account"),
        ("staff", "Staff", "Administrative and operational support staff"),
        ("user", "General User", "Unassigned onboarding account"),
    ]
    roles_dict = {}
    for r_name, r_disp, r_desc in roles_data:
        res = await db.execute(select(Role).where(Role.name == r_name))
        role_obj = res.scalars().first()
        if not role_obj:
            role_obj = Role(name=r_name, description=r_desc)
            db.add(role_obj)
            await db.flush()
        roles_dict[r_name] = role_obj
    return roles_dict
