import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type { APIResponse } from '@/types/api';

export type GatePassReason = 'tea_snack' | 'market_errand' | 'walk_exercise' | 'personal_work' | 'other';
export type GatePassStatus = 'checked_out' | 'checked_in' | 'overdue' | 'cancelled';

export interface QuickGatePassCreateRequest {
  reason: GatePassReason;
  custom_reason?: string;
  duration_minutes: number;
}

export interface QuickGatePassResponse {
  id: string;
  pass_code: string;
  student_id: string;
  reason: GatePassReason;
  custom_reason?: string;
  status: GatePassStatus;
  exit_time: string;
  expected_return_time: string;
  actual_return_time?: string;
  emergency_alert_sent: boolean;
  qr_token_hash: string;
  created_at: string;
  is_overdue: boolean;
  remaining_seconds: number;
  student_name?: string;
  student_roll?: string;
  student_avatar?: string;
}

export interface GateScanRequest {
  pass_code?: string;
  qr_payload?: string;
  roll_number?: string;
}

export interface GateScanResponse {
  success: boolean;
  message: string;
  pass_details?: QuickGatePassResponse;
}

export interface ParentSafetyDashboardResponse {
  student_name: string;
  student_roll: string;
  department: string;
  semester: number;

  parent_name?: string;
  parent_email?: string;
  location_status: 'ON_CAMPUS' | 'CASUAL_EXIT' | 'OVERDUE' | 'RESTRICTED_BY_STUDENT';

  active_gate_pass?: QuickGatePassResponse;
  attendance_percentage: number;
  total_classes: number;
  attended_classes: number;
  recent_gate_passes: QuickGatePassResponse[];
  marksheet_summary: Array<{
    subject: string;
    code: string;
    marks: number;
    grade: string;
    credits: number;
  }>;
}

export const gatePassApi = {
  createQuickExit: (data: QuickGatePassCreateRequest) =>
    client.post<APIResponse<QuickGatePassResponse>>(API_ROUTES.GATE_PASS_QUICK_EXIT, data),

  getMyActivePass: () =>
    client.get<APIResponse<QuickGatePassResponse | null>>(API_ROUTES.GATE_PASS_MY_ACTIVE),

  scanGatePass: (data: GateScanRequest) =>
    client.post<GateScanResponse>(API_ROUTES.GATE_PASS_SCAN, data),

  getParentSafetyDashboard: (studentId?: string) =>
    client.get<APIResponse<ParentSafetyDashboardResponse>>(API_ROUTES.PARENT_SAFETY_DASHBOARD, {
      params: studentId ? { student_id: studentId } : undefined,
    }),
};
