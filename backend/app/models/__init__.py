from app.models.base import Base
from app.models.user import User
from app.models.profiles import StudentProfile, FacultyProfile
from app.models.rbac import Asset, Action, Permission, Role, RolePermission, UserRole
from app.models.academic import Course, Branch

__all__ = [
    "Base",
    "User",
    "StudentProfile",
    "FacultyProfile",
    "Asset",
    "Action",
    "Permission",
    "Role",
    "RolePermission",
    "UserRole",
    "Course",
    "Branch"
]
