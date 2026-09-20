import asyncio
import sys
import os

# Ensure the app root is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.settings import SystemSetting
from sqlalchemy import select, update

async def seed_settings():
    async with AsyncSessionLocal() as session:
        # First, update the existing global_email_enabled
        stmt = select(SystemSetting).where(SystemSetting.key == 'global_email_enabled')
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            existing.category = 'Email'
            existing.data_type = 'boolean'
            existing.is_public = False
        else:
            session.add(SystemSetting(
                key='global_email_enabled',
                value='true',
                category='Email',
                data_type='boolean',
                description='Master switch to enable or disable all outgoing emails.',
                is_public=False
            ))

        # Add new Email settings
        new_settings = [
            SystemSetting(
                key='smtp_host',
                value='smtp.sendgrid.net',
                category='Email',
                data_type='string',
                description='SMTP server hostname.',
                is_public=False
            ),
            SystemSetting(
                key='smtp_port',
                value='587',
                category='Email',
                data_type='number',
                description='SMTP server port.',
                is_public=False
            ),
            SystemSetting(
                key='smtp_user',
                value='apikey',
                category='Email',
                data_type='string',
                description='SMTP username.',
                is_public=False
            ),
            SystemSetting(
                key='smtp_password',
                value='SG.mock_password_123',
                category='Email',
                data_type='password',
                description='SMTP password or API key.',
                is_public=False
            ),
            SystemSetting(
                key='smtp_from_address',
                value='noreply@cms.edu',
                category='Email',
                data_type='string',
                description='Default sender email address.',
                is_public=False
            ),
            # Add some General settings
            SystemSetting(
                key='site_name',
                value='BPUT CMS',
                category='General',
                data_type='string',
                description='Name of the institution/site.',
                is_public=True
            ),
            SystemSetting(
                key='maintenance_mode',
                value='false',
                category='General',
                data_type='boolean',
                description='Enable maintenance mode to block non-admin users.',
                is_public=True
            ),
        ]
        
        for ns in new_settings:
            stmt = select(SystemSetting).where(SystemSetting.key == ns.key)
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(ns)

        await session.commit()
        print("Settings seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_settings())
