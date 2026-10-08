from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from typing import List, Optional

from app.api.deps import require_permission, get_role_service
from app.core.permissions import Perms
from app.schemas.common import APIResponse
from app.schemas.roles import (
    RoleCreateRequest, RoleUpdateRequest, RoleResponse, PermissionMatrixResponse
)
from app.services.role_service import RoleService
from pydantic import BaseModel

router = APIRouter()

@router.get(
    "", 
    summary="List All Roles", 
    description="Returns all system roles and their assigned permissions. **Requires:** `role:list`",
    response_model=APIResponse[List[RoleResponse]]
)
async def list_roles(
    service: RoleService = Depends(get_role_service),
    _ = Depends(require_permission(Perms.ROLE_VIEW))
):
    roles = await service.list_roles()
    return APIResponse(success=True, data=roles, error=None)

@router.get(
    "/permission-matrix", 
    summary="Get Permission Matrix", 
    description="Returns all available assets and actions to populate a UI permission matrix.",
    response_model=APIResponse[PermissionMatrixResponse]
)
async def get_permission_matrix(
    role_id: Optional[UUID] = None,

    service: RoleService = Depends(get_role_service),
    _ = Depends(require_permission(Perms.ROLE_VIEW))
):
    data = await service.get_permission_matrix(role_id)
    return APIResponse(success=True, data=data, error=None)

@router.post(
    "", 
    summary="Create Role", 
    description="Creates a new custom role with specific permissions. **Requires:** `role:create`",
    response_model=APIResponse[RoleResponse]
)
async def create_role(
    req: RoleCreateRequest,
    service: RoleService = Depends(get_role_service),
    _ = Depends(require_permission(Perms.ROLE_CREATE))
):
    async with service.uow.transaction():
        role = await service.create_role(req)
        return APIResponse(success=True, data=role, error=None)

@router.patch(
    "/{id}", 
    summary="Update Role", 
    description="Updates a custom role's metadata. Cannot be used for system roles. **Requires:** `role:edit`",
    response_model=APIResponse[RoleResponse]
)
async def update_role(
    id: UUID,
    req: RoleUpdateRequest,
    service: RoleService = Depends(get_role_service),
    _ = Depends(require_permission(Perms.ROLE_EDIT))
):
    try:
        async with service.uow.transaction():
            role = await service.update_role(id, req)
            return APIResponse(success=True, data=role, error=None)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

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
    service: RoleService = Depends(get_role_service),
    _ = Depends(require_permission(Perms.ROLE_EDIT))
):
    try:
        async with service.uow.transaction():
            await service.update_role_permissions(id, req.permission_ids)
            return APIResponse(success=True, data=True, error=None)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

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
    service: RoleService = Depends(get_role_service),
    _ = Depends(require_permission(Perms.ROLE_APPROVE))
):
    try:
        async with service.uow.transaction():
            await service.assign_role(id, req.user_id)
            return APIResponse(success=True, data=True, error=None)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.delete(
    "/{id}", 
    summary="Delete Role", 
    description="Deletes a custom role. Fails if role is assigned to users. **Requires:** `role:delete`",
    response_model=APIResponse[bool]
)
async def delete_role(
    id: UUID,
    service: RoleService = Depends(get_role_service),
    _ = Depends(require_permission(Perms.ROLE_DELETE))
):
    try:
        async with service.uow.transaction():
            await service.delete_role(id)
            return APIResponse(success=True, data=True, error=None)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
