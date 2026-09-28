import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.config import settings

async def inject_settings():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    new_settings = [
        ('auth.password.min_length', '8', 'Security', 'number', 'Minimum password length.', 'true'),
        ('auth.password.require_uppercase', 'true', 'Security', 'boolean', 'Require at least one uppercase letter.', 'true'),
        ('auth.password.require_lowercase', 'true', 'Security', 'boolean', 'Require at least one lowercase letter.', 'true'),
        ('auth.password.require_number', 'true', 'Security', 'boolean', 'Require at least one number.', 'true'),
        ('auth.password.require_special', 'true', 'Security', 'boolean', 'Require at least one special character.', 'true'),
    ]

    async with async_session() as db:
        for key, value, category, dt, desc, is_pub in new_settings:
            await db.execute(text("""
                INSERT INTO system_settings (key, value, category, data_type, description, is_public) 
                VALUES (:key, :value, :category, :data_type, :description, :is_public)
                ON CONFLICT (key) DO NOTHING
            """), {
                "key": key, "value": value, "category": category, 
                "data_type": dt, "description": desc, "is_public": is_pub == 'true'
            })
        await db.commit()
    print("Settings injected successfully.")

if __name__ == "__main__":
    asyncio.run(inject_settings())
