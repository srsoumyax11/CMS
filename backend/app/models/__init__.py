from app.models.base import Base
from app.models.user import User
from app.models.profiles import StudentProfile, FacultyProfile, StaffProfile, ParentProfile
from app.models.complaint import Complaint, ComplaintStatusLog
from app.models.rbac import Asset, Action, Permission, Role, RolePermission
from app.models.academic import Course
from app.models.notice import Notice
from app.models.settings import SystemSetting, UserSilentSetting
from app.models.notification import Notification, NotificationType
from app.models.audit import AuditLog
from app.models.auth import RevokedToken, PasswordResetOTP

__all__ = [
    "Base",
    "User",
    "StudentProfile",
    "FacultyProfile",
    "StaffProfile",
    "ParentProfile",
    "Asset",
    "Action",
    "Permission",
    "Role",
    "RolePermission",
    "Course",
    "SystemSetting",
    "Notice",
    "Notification",
    "NotificationType",
    "AuditLog",
    "RevokedToken",
    "PasswordResetOTP",
    "RoleApplication",
    "ApplicationStatus",
    "Department",
    "AcademicTerm",
    "Subject",
    "ClassGroup",
    "Holiday",
    "TimetableSlot",
    "TimetableException",
    "AttendanceSession",
    "AttendanceRecord",
    "GatePass",
    "DocumentType",
    "DocumentRequest",
    "DocumentApproval",
    "PlacementNotice",
    "PlacementApplication",
    "MapLocation",
    "MapPath",
    "UserSilentSetting",
    "AIConversation",
    "AIMessage",
    "Hostel",
]

from app.models.hostel import Hostel

from app.models.timetable import TimetableSlot, TimetableException, AttendanceSession, AttendanceRecord
from app.models.gate_pass import GatePass
from app.models.documents import DocumentType, DocumentRequest, DocumentApproval
from app.models.placement import PlacementNotice, PlacementApplication
from app.models.map import MapLocation, MapPath
from app.models.ai import AIConversation, AIMessage

from app.models.application import RoleApplication, ApplicationStatus
from app.models.academic import Department, AcademicTerm, Subject, ClassGroup, Holiday


