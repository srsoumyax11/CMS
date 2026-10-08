from uuid import UUID
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.uow import UnitOfWork
from app.models.user import User
from app.models.rbac import Role, RolePermission, Permission, Action

class RBACService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def check_permission(self, user_id: UUID, permission_code: str) -> bool:
        """
        Check if a user has a specific permission code, e.g., 'documents.upload'
        """
        user = await self.uow.users.get_by_id(user_id)
        if not user or not user.role_id:
            return False

        # Find the role and load permissions -> permission -> action & asset
        stmt = select(Role).options(
            selectinload(Role.permissions)
            .selectinload(RolePermission.permission)
            .selectinload(Permission.action),
            selectinload(Role.permissions)
            .selectinload(RolePermission.permission)
            .selectinload(Permission.asset)
        ).where(Role.id == user.role_id)
        
        result = await self.uow.db.execute(stmt)
        role = result.scalar_one_or_none()

        if not role:
            return False
            
        for rp in role.permissions:
            perm = rp.permission
            if perm and perm.asset and perm.action:
                perm_str = f"{perm.asset.name}:{perm.action.code}"
                if perm_str == permission_code:
                    return True
        return False
