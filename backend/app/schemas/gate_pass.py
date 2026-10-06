from pydantic import BaseModel, ConfigDict, Field, computed_field
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime, timezone
from app.models.gate_pass import GatePassReason, GatePassStatus

class QuickGatePassCreateRequest(BaseModel):
    reason: GatePassReason = GatePassReason.tea_snack
    custom_reason: Optional[str] = None
    duration_minutes: int = Field(default=60, ge=15, le=180, description="Duration in minutes (15 to 180)")

class QuickGatePassResponse(BaseModel):
    id: UUID
    pass_code: str
    student_id: UUID
    reason: GatePassReason
    custom_reason: Optional[str] = None
    status: GatePassStatus
    exit_time: datetime
    expected_return_time: datetime
    actual_return_time: Optional[datetime] = None
    emergency_alert_sent: bool = False
    qr_token_hash: str
    created_at: datetime
    
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    student_avatar: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    def is_overdue(self) -> bool:
        if self.status == GatePassStatus.checked_out:
            return datetime.now(timezone.utc) > self.expected_return_time
        if self.status == GatePassStatus.overdue:
            return True
        return False

    @computed_field
    def remaining_seconds(self) -> int:
        if self.status != GatePassStatus.checked_out:
            return 0
        now = datetime.now(timezone.utc)
        diff = (self.expected_return_time - now).total_seconds()
        return max(0, int(diff))

class GateScanRequest(BaseModel):
    pass_code: Optional[str] = None
    qr_payload: Optional[str] = None
    roll_number: Optional[str] = None

class GateScanResponse(BaseModel):
    success: bool
    message: str
    pass_details: Optional[QuickGatePassResponse] = None

class ParentSafetyDashboardResponse(BaseModel):
    student_name: str
    student_roll: str
    department: str
    semester: int
    parent_name: Optional[str] = None
    parent_email: Optional[str] = None
    location_status: str  # "ON_CAMPUS" | "CASUAL_EXIT" | "OVERDUE"
    active_gate_pass: Optional[QuickGatePassResponse] = None
    attendance_percentage: float
    total_classes: int
    attended_classes: int
    recent_gate_passes: List[QuickGatePassResponse] = []
    marksheet_summary: List[Dict[str, Any]] = []

class QuickGatePassListResponse(BaseModel):
    total: int
    items: List[QuickGatePassResponse]
