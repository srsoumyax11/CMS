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
from app.models.complaint import Complaint, ComplaintVisibility
from app.models.outpass import Outpass
from app.models.academic import TimetableSlot
from app.core.permissions import Perms

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

def can_view_outpass(outpass: Outpass, current_user: User, user_permissions: Set[str]) -> bool:
    """
    Evaluates row-level ownership and visibility logic for an outpass.
    - Owner can always view their own outpass.
    - Admins/Faculty with collection access (outpass:list) can view any individual outpass.
    - This must be called explicitly in the handler body of GET /{id} routes to prevent IDOR.
    """
    if current_user.id == outpass.student_id:
        return True
    
    if Perms.OUTPASS_LIST in user_permissions:
        return True
        
    return False

def can_mark_attendance(slot: TimetableSlot, current_user: User, user_permissions: Set[str]) -> bool:
    """
    Evaluates row-level ownership logic for attendance marking.
    - Owner (assigned faculty) can always mark attendance for their slot.
    - SuperAdmins (with timetable:manage) can mark anything.
    """
    if current_user.id == slot.faculty_id:
        return True
    
    if Perms.TIMETABLE_MANAGE in user_permissions:
        return True
        
    return False
