import asyncio
import sys
import os

# Add backend dir to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.rbac import Asset, Action, Permission, Role, RolePermission
from app.models.settings import SystemSetting

async def seed_permissions():
    async with AsyncSessionLocal() as db:
        try:
            # 1. Add Asset
            asset_result = await db.execute(select(Asset).where(Asset.name == "system_setting"))
            asset = asset_result.scalar_one_or_none()
            if not asset:
                asset = Asset(name="system_setting")
                db.add(asset)
                await db.flush()

            # 2. Add Action (manage)
            action_result = await db.execute(select(Action).where(Action.code == "manage"))
            action = action_result.scalar_one_or_none()
            if not action:
                action = Action(code="manage")
                db.add(action)
                await db.flush()

            # 3. Add Permission (system_setting:manage)
            perm_result = await db.execute(select(Permission).where(Permission.asset_id == asset.id, Permission.action_id == action.id))
            perm = perm_result.scalar_one_or_none()
            if not perm:
                perm = Permission(asset_id=asset.id, action_id=action.id)
                db.add(perm)
                await db.flush()

            # 4. Assign to SuperAdmin Role
            role_result = await db.execute(select(Role).where(Role.name == "SuperAdmin"))
            role = role_result.scalar_one_or_none()
            if role:
                rp_result = await db.execute(select(RolePermission).where(RolePermission.role_id == role.id, RolePermission.permission_id == perm.id))
                rp = rp_result.scalar_one_or_none()
                if not rp:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))
            
            # 5. Add default system setting for global_email_enabled
            setting_result = await db.execute(select(SystemSetting).where(SystemSetting.key == "global_email_enabled"))
            setting = setting_result.scalar_one_or_none()
            if not setting:
                setting = SystemSetting(key="global_email_enabled", value="true", description="Enable global email notifications")
                db.add(setting)

            await db.commit()
            print("Successfully seeded permissions and default system setting!")
        except Exception as e:
            await db.rollback()
            print(f"Error seeding: {e}")

if __name__ == "__main__":
    asyncio.run(seed_permissions())
