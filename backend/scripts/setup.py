import asyncio
from alembic.config import Config
from alembic import command
import sys
import os

# Ensure the app root is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.seed_academic import seed_data as seed_academic
from scripts.seed_rbac import seed_data as seed_rbac

def run_migrations():
    print("--- 1. Running Database Migrations ---")
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    print("Migrations complete.\n")

async def run_seeds():
    print("--- 2. Seeding Academic Reference Data (Courses/Branches) ---")
    await seed_academic()
    
    print("\n--- 3. Seeding RBAC Structure (Assets, Actions, Roles) ---")
    await seed_rbac()
    
    print("\n✅ All database setup steps completed successfully!")

if __name__ == "__main__":
    run_migrations()
    asyncio.run(run_seeds())
