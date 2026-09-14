from typing import Generator, Callable, Set
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserType
from app.models.rbac import UserRole, Role, Permission, Asset, Action

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
        
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception
        
    # Eager load the profiles and full RBAC tree
    stmt = select(User).options(
        selectinload(User.student_profile),
        selectinload(User.faculty_profile),
        selectinload(User.user_roles).selectinload(UserRole.role).selectinload(Role.permissions).selectinload(Permission.asset),
        selectinload(User.user_roles).selectinload(UserRole.role).selectinload(Role.permissions).selectinload(Permission.action)
    ).where(User.id == user_id)
    
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    return user

async def get_user_permissions(current_user: User = Depends(get_current_user)) -> Set[str]:
    permissions = set()
    for user_role in current_user.user_roles:
        role = user_role.role
        for perm in role.permissions:
            perm_str = f"{perm.asset.name}:{perm.action.code}"
            permissions.add(perm_str)
    return permissions

def require_permission(permission_code: str) -> Callable:
    async def dependency(
        current_user: User = Depends(get_current_user),
        user_permissions: Set[str] = Depends(get_user_permissions)
    ) -> User:
        # TODO: Add scope_id enforcement logic here in a later phase
        if permission_code not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authenticated / Unauthorized"
            )
        return current_user
    return dependency

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.user_type != UserType.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authenticated / Unauthorized"
        )
    return current_user
