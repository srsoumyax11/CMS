from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID

from app.models.rbac import Role, RolePermission
from app.models.user import User, UserType
from app.repositories.role_repository import RoleRepository
from app.core.uow import UnitOfWork
from app.schemas.roles import (
    RoleCreateRequest, RoleUpdateRequest, RoleResponse, PermissionMatrixResponse,
    AssetMatrixItem, ActionMatrixItem
)

class RoleService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow
        self.db = uow.db
        self.repository = RoleRepository(self.db)

    async def list_roles(self) -> List[RoleResponse]:
        roles_with_counts = await self.repository.list_roles_with_counts()
        return [RoleResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            is_system_role=r.is_system_role,
            assignment_count=count
        ) for r, count in roles_with_counts]

    async def get_permission_matrix(self, role_id: Optional[UUID] = None) -> PermissionMatrixResponse:
        assets = await self.repository.get_all_assets()
        all_perms = await self.repository.get_all_permissions_with_actions()
        
        asset_perm_map = {}
        for p in all_perms:
            if p.asset_id not in asset_perm_map:
                asset_perm_map[p.asset_id] = []
            asset_perm_map[p.asset_id].append(p)

        role_perm_ids = set()
        if role_id:
            role_perm_ids = await self.repository.get_role_permission_ids(role_id)

        matrix_assets = []
        for asset in assets:
            matrix_actions = []
            for p in asset_perm_map.get(asset.id, []):
                granted = p.id in role_perm_ids
                matrix_actions.append(ActionMatrixItem(
                    id=p.id,
                    code=p.action.code,
                    granted=granted
                ))
            
            matrix_assets.append(AssetMatrixItem(
                id=asset.id,
                name=asset.name,
                actions=matrix_actions
            ))
            
        return PermissionMatrixResponse(assets=matrix_assets)

    async def create_role(self, req: RoleCreateRequest) -> RoleResponse:
        new_role = Role(
            name=req.name,
            description=req.description,
            is_system_role=False
        )
        await self.repository.create_role(new_role)
        
        role_permissions = [
            RolePermission(role_id=new_role.id, permission_id=p_id) 
            for p_id in req.permission_ids
        ]
        if role_permissions:
            await self.repository.add_role_permissions(role_permissions)
            
        await self.db.flush()
        await self.db.refresh(new_role)
        
        return RoleResponse(
            id=new_role.id,
            name=new_role.name,
            description=new_role.description,
            is_system_role=new_role.is_system_role
        )

    async def update_role(self, role_id: UUID, req: RoleUpdateRequest) -> RoleResponse:
        role = await self.repository.get_role_by_id(role_id)
        if not role:
            raise ValueError("Role not found")
            
        if role.name == "SuperAdmin":
            raise ValueError("The SuperAdmin role metadata cannot be modified")
            
        role.name = req.name
        role.description = req.description
        
        await self.db.flush()
        await self.db.refresh(role)
        
        assignment_count = await self.repository.get_assignment_count(role_id)
        
        return RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            is_system_role=role.is_system_role,
            assignment_count=assignment_count
        )

    async def update_role_permissions(self, role_id: UUID, permission_ids: List[UUID]) -> None:
        role = await self.repository.get_role_by_id(role_id)
        if not role:
            raise ValueError("Role not found")
            
        if role.name == "SuperAdmin":
            raise ValueError("The permissions of the SuperAdmin role cannot be modified to prevent system lockout")
            
        await self.repository.clear_role_permissions(role_id)
        
        role_permissions = [
            RolePermission(role_id=role_id, permission_id=p_id) 
            for p_id in permission_ids
        ]
        if role_permissions:
            await self.repository.add_role_permissions(role_permissions)

    async def assign_role(self, role_id: UUID, user_id: UUID) -> None:
        role = await self.repository.get_role_by_id(role_id)
        if not role:
            raise ValueError("Role not found")
            
        user = await self.repository.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
            
        if user.role_id == role_id:
            raise ValueError("Role already assigned to user")
            
        user.role_id = role_id
        
        if role.name == "Admin" or role.name == "SuperAdmin":
            user.user_type = UserType.admin
        elif role.name == "Student":
            user.user_type = UserType.student
        else:
            user.user_type = UserType.faculty
            
        await self.db.flush()

    async def delete_role(self, role_id: UUID) -> None:
        role = await self.repository.get_role_by_id(role_id)
        if not role:
            raise ValueError("Role not found")
            
        if role.is_system_role:
            raise ValueError("System roles cannot be deleted")
            
        assignment_count = await self.repository.get_assignment_count(role_id)
        if assignment_count > 0:
            raise ValueError("Cannot delete role that is currently assigned to users")
            
        await self.repository.delete_role(role)
