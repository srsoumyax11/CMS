from typing import Generator, Callable, Set, Dict, Tuple, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.uow import UnitOfWork, get_uow
from app.core.security import decode_token
from app.models.user import User, UserType
from app.models.rbac import Role, Permission, Asset, Action
from app.models.complaint import Complaint, ComplaintVisibility
from app.core.permissions import Perms

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

class RateLimiter:
    """
    A distributed rate limiter using Redis.
    Tracks requests by client IP or User ID.
    """
    def __init__(self, times: int, hours: int = 0, minutes: int = 0, seconds: int = 0):
        self.times = times
        self.window = hours * 3600 + minutes * 60 + seconds

    async def __call__(self, request: Request):
        from app.core.cache import redis_client
        
        # If redis isn't configured/connected, fail open
        if not redis_client:
            return
            
        client_key = request.client.host if request.client else "unknown"
        
        # Prefer user ID if authenticated (prevents shared-IP NAT issues in hostels)
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.split(" ")[1]
            try:
                payload = decode_token(token)
                if payload and "sub" in payload:
                    client_key = payload["sub"]
            except Exception:
                pass
                
        # Key uses the specific path to prevent a rate limit on one endpoint affecting others, 
        # unless intended by a shared instance (which we can customize later)
        key = f"ratelimit:{client_key}"
        
        try:
            current = await redis_client.incr(key)
            if current == 1:
                await redis_client.expire(key, self.window)
            
            if current > self.times:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests"
                )
        except Exception as e:
            # If redis connection fails, fail open to avoid downtime
            pass

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
        
    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

        
    # Eager load the profiles and full RBAC tree
    stmt = select(User).options(
        selectinload(User.student_profile),
        selectinload(User.faculty_profile),
        selectinload(User.staff_profile),
        selectinload(User.role).selectinload(Role.permissions).selectinload(Permission.asset),
        selectinload(User.role).selectinload(Role.permissions).selectinload(Permission.action)
    ).where(User.id == user_id)
    
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    return user

async def get_department_scope(
    current_user: User = Depends(get_current_user)
) -> Optional[UUID]:
    """
    Returns the department_id scope for the current user.
    - Admin (SuperAdmin / Admin): None (unscoped, global visibility).
    - Faculty / HOD: faculty_profile.department_id
    - Student: student_profile.department_id
    - Staff: staff_profile.department_id (if assigned)
    """
    if current_user.user_type == UserType.admin:
        return None
    if current_user.user_type == UserType.faculty and current_user.faculty_profile:
        return current_user.faculty_profile.department_id
    if current_user.user_type == UserType.student and current_user.student_profile:
        return current_user.student_profile.department_id
    if current_user.user_type == UserType.staff and current_user.staff_profile:
        return current_user.staff_profile.department_id
    return None


async def get_user_permissions(current_user: User = Depends(get_current_user)) -> Set[str]:
    permissions = set()
    if current_user.role:
        for perm in current_user.role.permissions:
            perm_str = f"{perm.asset.name}:{perm.action.code}"
            permissions.add(perm_str)
    return permissions

def require_permission(permission_code: str) -> Callable:
    async def dependency(
        current_user: User = Depends(get_current_user),
        user_permissions: Set[str] = Depends(get_user_permissions)
    ) -> User:
        # Superadmin override
        if current_user.user_type == UserType.admin:
            return current_user
            
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

def can_view_complaint_detail(complaint: Complaint, current_user: User, user_permissions: Set[str]) -> bool:
    """
    Evaluates row-level ownership and visibility logic for a complaint.
    - Owner can always see their own complaint.
    - Public complaints can be seen by anyone with 'complaint:view'.
    - Private complaints require 'complaint:view_private' (Admins/Faculty).
    """
    if current_user.id == complaint.raised_by:
        return True
    
    if complaint.visibility == ComplaintVisibility.public:
        return Perms.COMPLAINT_VIEW in user_permissions
        
    if complaint.visibility == ComplaintVisibility.private:
        return Perms.COMPLAINT_VIEW_PRIVATE in user_permissions
        
    return False



from app.services.notification_service import NotificationService
from app.services.metadata_service import MetadataService
from app.services.complaint_service import ComplaintService
from app.services.role_service import RoleService

def get_complaint_service(uow: UnitOfWork = Depends(get_uow)) -> ComplaintService:
    return ComplaintService(uow)



def get_notification_service(uow: UnitOfWork = Depends(get_uow)) -> NotificationService:
    return NotificationService(uow)

def get_metadata_service(uow: UnitOfWork = Depends(get_uow)) -> MetadataService:
    return MetadataService(uow)

def get_role_service(uow: UnitOfWork = Depends(get_uow)) -> RoleService:
    return RoleService(uow)
