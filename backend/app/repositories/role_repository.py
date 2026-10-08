from typing import List, Optional, Any, Set, Tuple
from uuid import UUID
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.rbac import Role, Permission, Asset, Action, RolePermission
from app.models.user import User
from app.repositories.base_repository import GenericRepository

class RoleRepository(GenericRepository[Role]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Role)

    async def get_by_code(self, code: str) -> Optional[Role]:
        stmt = select(Role).where(Role.code == code)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_roles_with_counts(self) -> List[Tuple[Role, int]]:
        stmt = (
            select(Role, func.count(User.id).label("assignment_count"))
            .outerjoin(User, Role.id == User.role_id)
            .group_by(Role.id)
        )
        result = await self.db.execute(stmt)
        return [(row.Role, row.assignment_count) for row in result.all()]

    async def get_all_assets(self) -> List[Asset]:
        stmt = select(Asset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_all_permissions_with_actions(self) -> List[Permission]:
        stmt = select(Permission).options(selectinload(Permission.action))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_role_permission_ids(self, role_id: UUID) -> Set[UUID]:
        stmt = select(RolePermission).where(RolePermission.role_id == role_id)
        result = await self.db.execute(stmt)
        return {rp.permission_id for rp in result.scalars().all()}

    async def get_role_by_id(self, role_id: UUID) -> Optional[Role]:
        return await self.db.get(Role, role_id)

    async def create_role(self, role: Role) -> None:
        self.db.add(role)
        await self.db.flush()

    async def add_role_permissions(self, role_permissions: List[RolePermission]) -> None:
        self.db.add_all(role_permissions)
        await self.db.flush()

    async def get_assignment_count(self, role_id: UUID) -> int:
        stmt = select(func.count(User.id)).where(User.role_id == role_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def clear_role_permissions(self, role_id: UUID) -> None:
        stmt = select(RolePermission).where(RolePermission.role_id == role_id)
        result = await self.db.execute(stmt)
        for rp in result.scalars().all():
            await self.db.delete(rp)
        await self.db.flush()

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        return await self.db.get(User, user_id)

    async def delete_role(self, role: Role) -> None:
        await self.db.delete(role)
        await self.db.flush()
