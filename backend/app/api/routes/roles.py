from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import require_permission
from app.core.permissions import Perms
from app.models.rbac import Role, Permission, Asset, Action, RolePermission, UserRole
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.roles import (
    RoleCreateRequest, RoleResponse, PermissionMatrixResponse,
    AssetMatrixItem, ActionMatrixItem
)

router = APIRouter()

@router.get(
    "", 
    summary="List All Roles", 
    description="Returns all system roles and their assigned permissions. **Requires:** `role:list`",
    response_model=APIResponse[List[RoleResponse]]
)
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.ROLE_VIEW))
):
    stmt = select(Role)
    result = await db.execute(stmt)
    roles = result.scalars().all()
    
    data = [RoleResponse(
        id=r.id,
        name=r.name,
        description=r.description,
        is_system_role=r.is_system_role
    ) for r in roles]
    
    return APIResponse(success=True, data=data, error=None)

@router.get(
    "/permission-matrix", 
    summary="Get Permission Matrix", 
    description="Returns all available assets and actions to populate a UI permission matrix.",
    response_model=APIResponse[PermissionMatrixResponse]
)
async def get_permission_matrix(
    role_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.ROLE_VIEW))
):
    # Fetch all assets and actions to build the grid
    stmt = select(Asset)
    assets = (await db.execute(stmt)).scalars().all()
    
    # Pre-fetch all permissions
    perm_stmt = select(Permission).options(selectinload(Permission.action))
    all_perms = (await db.execute(perm_stmt)).scalars().all()
    
    # Map asset_id to its permissions
    asset_perm_map = {}
    for p in all_perms:
        if p.asset_id not in asset_perm_map:
            asset_perm_map[p.asset_id] = []
        asset_perm_map[p.asset_id].append(p)

    # If role_id is provided, get the role's permissions
    role_perm_ids = set()
    if role_id:
        rp_stmt = select(RolePermission).where(RolePermission.role_id == role_id)
        role_perms = (await db.execute(rp_stmt)).scalars().all()
        role_perm_ids = {rp.permission_id for rp in role_perms}

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
        
    data = PermissionMatrixResponse(assets=matrix_assets)
    return APIResponse(success=True, data=data, error=None)



@router.post(
    "", 
    summary="Create Role", 
    description="Creates a new custom role with specific permissions. **Requires:** `role:create`",
    response_model=APIResponse[RoleResponse]
)
async def create_role(
    req: RoleCreateRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.ROLE_CREATE))
):
    new_role = Role(
        name=req.name,
        description=req.description,
        is_system_role=False
    )
    db.add(new_role)
    await db.flush() # get new_role.id
    
    # Add permissions
    for p_id in req.permission_ids:
        db.add(RolePermission(role_id=new_role.id, permission_id=p_id))
        
    await db.commit()
    await db.refresh(new_role)
    
    data = RoleResponse(
        id=new_role.id,
        name=new_role.name,
        description=new_role.description,
        is_system_role=new_role.is_system_role
    )
    return APIResponse(success=True, data=data, error=None)

class UpdatePermissionsRequest(BaseModel):
    permission_ids: List[UUID]

@router.patch(
    "/{id}/permissions", 
    summary="Update Role Permissions", 
    description="Overwrites the existing permissions for a given role ID. **Requires:** `role:edit`",
    response_model=APIResponse[bool]
)
async def update_role_permissions(
    id: UUID,
    req: UpdatePermissionsRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.ROLE_EDIT))
):
    role = await db.get(Role, id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
        
    if role.is_system_role:
        raise HTTPException(status_code=400, detail="Cannot edit system role via API")
        
    # Delete old permissions
    del_stmt = select(RolePermission).where(RolePermission.role_id == id)
    old_perms = (await db.execute(del_stmt)).scalars().all()
    for op in old_perms:
        await db.delete(op)
        
    # Add new permissions
    for p_id in req.permission_ids:
        db.add(RolePermission(role_id=id, permission_id=p_id))
        
    await db.commit()
    return APIResponse(success=True, data=True, error=None)

class AssignRoleRequest(BaseModel):
    user_id: UUID

@router.post(
    "/{id}/assign", 
    summary="Assign Role to User", 
    description="Assigns a specific role to a user. **Requires:** `role:assign`",
    response_model=APIResponse[bool]
)
async def assign_role(
    id: UUID,
    req: AssignRoleRequest,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.ROLE_APPROVE))
):
    role = await db.get(Role, id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
        
    user = await db.get(User, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if already assigned
    ur_stmt = select(UserRole).where(
        UserRole.user_id == req.user_id,
        UserRole.role_id == id,
    )
    if (await db.execute(ur_stmt)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role already assigned to user")
        
    new_ur = UserRole(user_id=req.user_id, role_id=id)
    db.add(new_ur)
    await db.commit()
    
    return APIResponse(success=True, data=True, error=None)

@router.get(
    "/{id}/assignments/count",
    summary="Get Role Assignment Count",
    description="Returns the number of users currently assigned to this role.",
    response_model=APIResponse[int]
)
async def get_assignment_count(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.ROLE_VIEW))
):
    stmt = select(func.count(UserRole.user_id)).where(UserRole.role_id == id)
    count = (await db.execute(stmt)).scalar() or 0
    return APIResponse(success=True, data=count, error=None)

@router.delete(
    "/{id}",
    summary="Delete Role",
    description="Deletes a custom role. Fails if assigned to users unless force=true. **Requires:** `role:delete`",
    response_model=APIResponse[bool]
)
async def delete_role(
    id: UUID,
    force: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_permission(Perms.ROLE_DELETE))
):
    role = await db.get(Role, id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
        
    if role.is_system_role:
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
        
    if not force:
        # Check if assigned to any users
        ur_stmt = select(UserRole).where(UserRole.role_id == id).limit(1)
        if (await db.execute(ur_stmt)).scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Cannot delete role: It is currently assigned to one or more users")
            
    if force:
        # Delete user assignments
        del_ur_stmt = select(UserRole).where(UserRole.role_id == id)
        user_roles = (await db.execute(del_ur_stmt)).scalars().all()
        for ur in user_roles:
            await db.delete(ur)
            
    # Delete permissions first (if not cascade)
    rp_stmt = select(RolePermission).where(RolePermission.role_id == id)
    role_perms = (await db.execute(rp_stmt)).scalars().all()
    for rp in role_perms:
        await db.delete(rp)
        
    # Delete role
    await db.delete(role)
    await db.commit()
    
    return APIResponse(success=True, data=True, error=None)
