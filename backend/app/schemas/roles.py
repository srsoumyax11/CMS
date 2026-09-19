from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class RoleCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    permission_ids: List[UUID]

class RoleUpdateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class RoleResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    is_system_role: bool
    assignment_count: int = 0

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
