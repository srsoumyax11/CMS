import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.settings import SystemSetting

async def update_smtp():
    async with AsyncSessionLocal() as session:
        settings_to_update = {
            "smtp_host": "smtp.ethereal.email",
            "smtp_port": "587",
            "smtp_user": "sherwood46@ethereal.email",
            "smtp_password": "dAUPr5ypEYMGqbFk8n",
            "smtp_from_address": "sherwood46@ethereal.email",
            "global_email_enabled": "true"
        }
        
        for key, val in settings_to_update.items():
            stmt = select(SystemSetting).where(SystemSetting.key == key)
            result = await session.execute(stmt)
            setting = result.scalar_one_or_none()
            if setting:
                setting.value = val
                
        await session.commit()
        print("SMTP settings updated successfully in the database!")

if __name__ == "__main__":
    asyncio.run(update_smtp())
