from app.models.base import Base
from app.models.user import User
from app.models.profiles import StudentProfile, FacultyProfile, StaffProfile, ParentProfile
from app.models.complaint import Complaint, ComplaintStatusLog
from app.models.rbac import Asset, Action, Permission, Role, RolePermission
from app.models.academic import Course, TimetableSlot, AttendanceRecord
from app.models.notice import Notice
from app.models.outpass import Outpass, OutpassStatusLog
from app.models.mess import MessMenu, MessFeedback, MessOptOut
from app.models.settings import SystemSetting
from app.models.notification import Notification, NotificationType
from app.models.audit import AuditLog

from app.models.document import DocumentRequest, DocumentStatusLog, DocumentType, DocumentStatus, DocumentUrgency
from app.models.infrastructure import Building, Room, BuildingType, RoomType
from app.models.audience_group import AudienceGroup, AudienceGroupMember
from app.models.auth import RevokedToken, PasswordResetOTP
from app.models.finance import FeeDue, FeeStatus
from app.models.visitor import VisitorLog, VisitorStatus
from app.models.hostel import HostelAllocation, AllocationStatus
from app.models.gate_pass import QuickGatePass, GatePassReason, GatePassStatus
from app.models.parent_link import ParentLinkRequest, ParentLinkStatus

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
    "TimetableSlot",
    "AttendanceRecord",
    "SystemSetting",
    "Outpass",
    "OutpassStatusLog",
    "MessMenu",
    "MessFeedback",
    "MessOptOut",
    "Notification",
    "NotificationType",
    "AuditLog",
    "DocumentRequest",
    "DocumentStatusLog",
    "DocumentType",
    "DocumentStatus",
    "DocumentUrgency",
    "Building",
    "Room",
    "BuildingType",
    "RoomType",
    "AudienceGroup",
    "AudienceGroupMember",
    "RevokedToken",
    "PasswordResetOTP",
    "FeeDue",
    "FeeStatus",
    "VisitorLog",
    "VisitorStatus",
    "HostelAllocation",
    "AllocationStatus",
    "QuickGatePass",
    "GatePassReason",
    "GatePassStatus",
    "ParentLinkRequest",
    "ParentLinkStatus",
]



