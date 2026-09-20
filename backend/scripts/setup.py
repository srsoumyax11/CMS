import asyncio
from alembic.config import Config
from alembic import command
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

def run_migrations():
    print("--- 1. Running Database Migrations ---")
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    print("Migrations complete.\n")

async def run_seeds():
    print("\n--- Bootstrapping Storage Buckets ---")
    async with AsyncSessionLocal() as session:
        # Note: storage schema is managed by Supabase, we execute raw SQL to ensure the bucket exists
        await session.execute(text('''
            INSERT INTO storage.buckets (id, name, public) 
            VALUES ('complaint-attachments', 'complaint-attachments', false)
            ON CONFLICT (id) DO NOTHING;
        '''))
        
        await session.execute(text('''
            INSERT INTO storage.buckets (id, name, public) 
            VALUES ('notice-attachments', 'notice-attachments', true)
            ON CONFLICT (id) DO NOTHING;
        '''))
        await session.commit()
    print("Storage buckets bootstrapped.\n")
    
    print("\n--- Seeding Advanced System Settings & Permissions ---")
    
    # Import and run the seeds dynamically to avoid circular issues
    from scripts.seed_settings_advanced import seed_settings
    from scripts.seed_settings_perm import seed_permissions
    
    await seed_permissions()
    await seed_settings()
    
    print("Settings and permissions seeded.\n")
    
    print("\n✅ All database setup steps completed successfully!")

if __name__ == "__main__":
    run_migrations()
    asyncio.run(run_seeds())
