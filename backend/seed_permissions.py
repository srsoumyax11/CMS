import asyncio
from typing import Dict, Set, List
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.rbac import Asset, Action, Permission, Role, RolePermission
from app.core.permissions import Perms

# Dynamically gather all permissions defined in Perms class
def get_all_perms_from_class() -> Set[str]:
    perms = set()
    for attr_name in dir(Perms):
        if not attr_name.startswith("__") and isinstance(getattr(Perms, attr_name), str):
            val = getattr(Perms, attr_name)
            if ":" in val:
                perms.add(val)
    return perms

# Default permissions assigned to non-admin roles during initial seeding
DEFAULT_ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "STUDENT": [
        "notice:view",
        "notice:list",
        "complaint:create",
        "complaint:view",
        "complaint:list",
        "gatepass:create",
        "timetable:list",
        "document:apply",
        "document:view",
        "placement:view",
        "placement:apply",
        "academic:view",
        "hostel:view",
        "map:view",
    ],
    "FACULTY": [
        "student_profile:view",
        "student_profile:list",
        "notice:view",
        "notice:list",
        "notice:create",
        "notice:edit",
        "complaint:view",
        "complaint:list",
        "complaint:resolve",
        "attendance:mark",
        "timetable:list",
        "timetable:create",
        "timetable:edit",
        "document:view",
        "document:approve",
        "placement:view",
        "academic:view",
        "hostel:view",
        "map:view",
    ],
    "STAFF": [
        "notice:view",
        "notice:list",
        "complaint:view",
        "complaint:list",
        "complaint:resolve",
        "gatepass:review",
        "gatepass:scan",
        "hostel:view",
        "map:view",
    ],
    "PARENT": [
        "notice:view",
        "notice:list",
        "complaint:create",
        "complaint:view",
        "academic:view",
        "hostel:view",
        "map:view",
    ],
    "BASE": [
        "notice:view",
        "notice:list",
        "map:view",
    ],
}

async def seed_permissions():
    async with AsyncSessionLocal() as db:
        all_perm_strings = get_all_perms_from_class()
        
        # 1. Collect unique asset names and action codes
        asset_names: Set[str] = set()
        action_codes: Set[str] = set()
        parsed_perms: List[tuple[str, str]] = []

        for perm_str in sorted(all_perm_strings):
            asset_name, action_code = perm_str.split(":", 1)
            asset_names.add(asset_name)
            action_codes.add(action_code)
            parsed_perms.append((asset_name, action_code))

        # 2. Seed / fetch Assets
        asset_map: Dict[str, Asset] = {}
        for name in sorted(asset_names):
            stmt = select(Asset).where(Asset.name == name)
            res = await db.execute(stmt)
            asset_obj = res.scalar_one_or_none()
            if not asset_obj:
                asset_obj = Asset(name=name)
                db.add(asset_obj)
                await db.flush()
            asset_map[name] = asset_obj

        # 3. Seed / fetch Actions
        action_map: Dict[str, Action] = {}
        for code in sorted(action_codes):
            stmt = select(Action).where(Action.code == code)
            res = await db.execute(stmt)
            action_obj = res.scalar_one_or_none()
            if not action_obj:
                action_obj = Action(code=code)
                db.add(action_obj)
                await db.flush()
            action_map[code] = action_obj

        await db.flush()

        # 4. Seed / fetch Permissions (Asset + Action joins)
        perm_map: Dict[str, Permission] = {}
        for asset_name, action_code in parsed_perms:
            asset_obj = asset_map[asset_name]
            action_obj = action_map[action_code]
            perm_key = f"{asset_name}:{action_code}"

            stmt = select(Permission).where(
                Permission.asset_id == asset_obj.id,
                Permission.action_id == action_obj.id
            )
            res = await db.execute(stmt)
            perm_obj = res.scalar_one_or_none()

            if not perm_obj:
                perm_obj = Permission(asset_id=asset_obj.id, action_id=action_obj.id)
                db.add(perm_obj)
                await db.flush()

            perm_map[perm_key] = perm_obj

        await db.flush()

        # 5. Assign Permissions to Roles
        roles_stmt = select(Role)
        roles_res = await db.execute(roles_stmt)
        roles_list = roles_res.scalars().all()
        role_by_code = {r.code: r for r in roles_list}

        # 5a. Admin gets ALL permissions
        if "ADMIN" in role_by_code:
            admin_role = role_by_code["ADMIN"]
            for perm_key, perm_obj in perm_map.items():
                rp_stmt = select(RolePermission).where(
                    RolePermission.role_id == admin_role.id,
                    RolePermission.permission_id == perm_obj.id
                )
                rp_existing = (await db.execute(rp_stmt)).scalar_one_or_none()
                if not rp_existing:
                    db.add(RolePermission(role_id=admin_role.id, permission_id=perm_obj.id))

        # 5b. Other roles get defined default permissions
        for role_code, perm_keys in DEFAULT_ROLE_PERMISSIONS.items():
            if role_code in role_by_code:
                role_obj = role_by_code[role_code]
                for key in perm_keys:
                    if key in perm_map:
                        perm_obj = perm_map[key]
                        rp_stmt = select(RolePermission).where(
                            RolePermission.role_id == role_obj.id,
                            RolePermission.permission_id == perm_obj.id
                        )
                        rp_existing = (await db.execute(rp_stmt)).scalar_one_or_none()
                        if not rp_existing:
                            db.add(RolePermission(role_id=role_obj.id, permission_id=perm_obj.id))

        await db.commit()
        print(f"✅ RBAC matrix seeded successfully ({len(asset_names)} assets, {len(action_codes)} actions, {len(perm_map)} permissions).")

if __name__ == "__main__":
    asyncio.run(seed_permissions())
