import sys
import os
import asyncio

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import AsyncSessionLocal
from scripts.seeders.roles import seed_roles
from scripts.seeders.academic import seed_academic
from scripts.seeders.infrastructure import seed_infrastructure
from scripts.seeders.users import seed_users
from scripts.seeders.operations import seed_operations

async def main():
    print("🚀 Starting Modular BPUT CMS Master Data Population...")
    async with AsyncSessionLocal() as db:
        roles_dict = await seed_roles(db)
        dept_dict, course_dict = await seed_academic(db)
        bld_dict, rooms_list = await seed_infrastructure(db)
        student_users = await seed_users(db, roles_dict, dept_dict, course_dict, rooms_list)
        await seed_operations(db, dept_dict, bld_dict, rooms_list, student_users)
        
        await db.commit()
        print("\n✅ MODULAR SEEDING COMPLETED SUCCESSFULLY!")
        print("\n🔑 DEMO ACCOUNTS READY FOR AUDIT & TEST:")
        print("┌───────────────────────────────────┬───────────────┬─────────────────────────┐")
        print("│ Email                             │ Password      │ Primary Role / Purpose  │")
        print("├───────────────────────────────────┼───────────────┼─────────────────────────┤")
        print("│ superadmin@cms.com                │ Super+Admin@123│ System Superadmin       │")
        print("│ admin@cms.com                     │ Admin@123     │ Campus Administrator    │")
        print("│ ananya.roy@cms.com                │ Faculty@123   │ HOD CSE (Faculty)       │")
        print("│ guard@cms.com                     │ Guard@123     │ Main Gate Security Guard│")
        print("│ soumya@cms.com                    │ Student@123   │ Student (Kalam Hall)    │")
        print("│ priya@cms.com                     │ Student@123   │ Student (Sarojini Hall) │")
        print("│ ramesh.sahoo@cms.com              │ Parent@123    │ Parent (Father of Soumya)│")
        print("│ applicant.pending@cms.com         │ User@123      │ Onboarding (Pending)    │")
        print("└───────────────────────────────────┴───────────────┴─────────────────────────┘")

if __name__ == "__main__":
    asyncio.run(main())
