import asyncio
import random
import time
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.user import User, UserType, AccountStatus
from app.core.security import hash_password

INDIAN_FIRST_NAMES = ["Aadya", "Aarav", "Advik", "Ananya", "Arjun", "Aryan", "Avni", "Diya", "Dhruv", "Isha", "Ishaan", "Kavya", "Krishna", "Meera", "Neha", "Prisha", "Rahul", "Rhea", "Rohan", "Saanvi"]
INDIAN_LAST_NAMES = ["Reddy", "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Das", "Shah", "Joshi", "Chopra", "Mehta", "Iyer", "Pillai", "Nair", "Mishra", "Pandey"]

async def create_user_account():
    print("--- Create Random Users ---")
    try:
        count_input = input("How many users do you want to create? ")
        count = int(count_input.strip())
    except ValueError:
        print("Please enter a valid number.")
        return

    print(f"Connecting to database and creating {count} users...")
    
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    users_created = 0
    async with async_session() as session:
        default_password = hash_password("Password123!")
        
        for i in range(count):
            first_name = random.choice(INDIAN_FIRST_NAMES)
            last_name = random.choice(INDIAN_LAST_NAMES)
            name = f"{first_name} {last_name}"
            # ensure uniqueness with timestamp and loop index
            email = f"{first_name.lower()}.{last_name.lower()}_{int(time.time()*1000)}_{i}@bput.ac.in"
            
            new_user = User(
                id=uuid.uuid4(),
                email=email,
                name=name,
                hashed_password=default_password,
                user_type=UserType.user,
                account_status=AccountStatus.active,
            )
            
            session.add(new_user)
            users_created += 1
            print(f"Created: {name} ({email})")
            
        await session.commit()
    
    print(f"\nSuccessfully created {users_created} users!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_user_account())
