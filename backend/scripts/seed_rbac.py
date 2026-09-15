import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.database import AsyncSessionLocal
from app.models.rbac import Asset, Action, Permission, Role, ScopeType, RolePermission, UserRole
from app.models.user import User, UserType
from app.core.config import settings
from app.core.security import hash_password

async def seed_data():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # 1. Upsert Assets
            asset_names = ["student_profile", "faculty_profile", "role", "notice", "complaint", "outpass", "timetable", "attendance"]
            assets = {}
            for name in asset_names:
                stmt = insert(Asset).values(name=name)
                stmt = stmt.on_conflict_do_update(index_elements=['name'], set_={'name': name})
                result = await session.execute(stmt.returning(Asset))
                assets[name] = result.scalar_one()

            # 2. Upsert Actions
            action_codes = ["view", "list", "create", "edit", "delete", "approve", "reject", "resolve", "assign", "view_private", "manage", "mark"]
            actions = {}
            for code in action_codes:
                stmt = insert(Action).values(code=code)
                stmt = stmt.on_conflict_do_update(index_elements=['code'], set_={'code': code})
                result = await session.execute(stmt.returning(Action))
                actions[code] = result.scalar_one()

            # 3. Upsert Permissions (Cross-Product)
            permissions = {}
            for asset_name, asset in assets.items():
                for action_code, action in actions.items():
                    stmt = insert(Permission).values(asset_id=asset.id, action_id=action.id)
                    # Unique constraint is on (asset_id, action_id)
                    stmt = stmt.on_conflict_do_nothing().returning(Permission)
                    result = await session.execute(stmt)
                    perm = result.scalar_one_or_none()
                    if not perm:
                        # Fetch it if it already existed
                        fetch_stmt = select(Permission).where(Permission.asset_id == asset.id, Permission.action_id == action.id)
                        perm = (await session.execute(fetch_stmt)).scalar_one()
                    permissions[f"{asset_name}:{action_code}"] = perm

            # 4. Upsert Roles
            roles_data = [
                {"name": "SuperAdmin", "scope": ScopeType.college},
                {"name": "Student", "scope": ScopeType.self},
                {"name": "Faculty", "scope": ScopeType.department}
            ]
            roles = {}
            for rd in roles_data:
                stmt = insert(Role).values(name=rd["name"], scope_type=rd["scope"], is_system_role=True)
                stmt = stmt.on_conflict_do_update(index_elements=['name'], set_={'scope_type': rd["scope"]})
                result = await session.execute(stmt.returning(Role))
                roles[rd["name"]] = result.scalar_one()
            
            # Delete old role permissions just to cleanly apply them again
            for role in roles.values():
                await session.execute(RolePermission.__table__.delete().where(RolePermission.role_id == role.id))

            # 5. Bind Permissions
            # SuperAdmin gets everything
            for perm in permissions.values():
                session.add(RolePermission(role_id=roles["SuperAdmin"].id, permission_id=perm.id))
                
            # Student gets student_profile:view, student_profile:edit, notice:view
            student_perms = [
                "student_profile:view",
                "student_profile:edit",
                "notice:view",
                "notice:list",
                "complaint:create",
                "complaint:view",
                "outpass:create",
                "outpass:view",
                "outpass:cancel",
                "timetable:view",
                "attendance:view"
            ]
            for sp in set(student_perms):
                if sp in permissions:
                    session.add(RolePermission(role_id=roles["Student"].id, permission_id=permissions[sp].id))
                    
            # Faculty gets student_profile:view, notice:view, notice:create
            faculty_perms = [
                "faculty_profile:view",
                "faculty_profile:edit",
                "student_profile:view",
                "student_profile:list",
                "notice:view",
                "notice:list",
                "notice:create",
                "complaint:list",
                "complaint:view",
                "complaint:resolve",
                "complaint:assign",
                "complaint:view_private",
                "outpass:list",
                "outpass:approve",
                "outpass:reject",
                "timetable:view",
                "attendance:view",
                "attendance:mark"
            ]
            for fp in set(faculty_perms):
                if fp in permissions:
                    session.add(RolePermission(role_id=roles["Faculty"].id, permission_id=permissions[fp].id))

            # 6. Bootstrap SuperAdmin User
            if settings.SUPERADMIN_EMAIL and settings.SUPERADMIN_PASSWORD:
                stmt = insert(User).values(
                    email=settings.SUPERADMIN_EMAIL,
                    hashed_password=hash_password(settings.SUPERADMIN_PASSWORD),
                    user_type=UserType.admin,
                    is_active=True
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=['email'], 
                    set_={'hashed_password': hash_password(settings.SUPERADMIN_PASSWORD)}
                )
                result = await session.execute(stmt.returning(User))
                admin_user = result.scalar_one()

                # Assign role if not assigned
                ur_stmt = insert(UserRole).values(user_id=admin_user.id, role_id=roles["SuperAdmin"].id)
                ur_stmt = ur_stmt.on_conflict_do_nothing()
                await session.execute(ur_stmt)

        print("RBAC Seed completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed_data())
