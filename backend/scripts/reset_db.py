import asyncio
import sys
import os

# Ensure the app root is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.clean_db import clean_db
from scripts.setup import run_migrations, run_seeds

if __name__ == "__main__":
    print("==================================================")
    print("🔥 STARTING FULL DATABASE RESET 🔥")
    print("==================================================\n")
    
    # 1. Drop and recreate schema
    print(">>> Phase 1: Wiping existing schema...")
    asyncio.run(clean_db())
    
    # 2. Run migrations
    print("\n>>> Phase 2: Applying schema migrations...")
    run_migrations()
    
    # 3. Seed all required reference and initial data
    print("\n>>> Phase 3: Seeding initial data...")
    asyncio.run(run_seeds())
    
    print("\n==================================================")
    print("✅ DATABASE RESET & SETUP COMPLETED SUCCESSFULLY!")
    print("==================================================")
