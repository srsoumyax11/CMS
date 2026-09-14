from pydantic import BaseModel
from typing import List
from uuid import UUID
from app.models.rbac import ScopeType

class RoleCreateRequest(BaseModel):
    name: str
    scope_type: ScopeType
    permission_ids: List[UUID]

class RoleResponse(BaseModel):
    id: UUID
    name: str
    scope_type: ScopeType
    is_system_role: bool

class ActionMatrixItem(BaseModel):
    id: UUID
    code: str
    granted: bool

class AssetMatrixItem(BaseModel):
    id: UUID
    name: str
    actions: List[ActionMatrixItem]

class PermissionMatrixResponse(BaseModel):
    assets: List[AssetMatrixItem]
