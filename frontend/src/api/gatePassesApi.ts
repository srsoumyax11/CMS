import { client } from './client';
import type { APIResponse } from '@/types/api';

export type GatePassType = 'SHORT' | 'LONG';
export type GatePassReason = 'TEA' | 'MARKET' | 'MEDICAL' | 'HOLIDAY' | 'OTHER';
export type GatePassStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'OUT'
  | 'RETURNED'
  | 'OVERDUE'
  | 'EXPIRED';

export interface GatePassData {
  id: string;
  student_user_id: string;
  type: GatePassType;
  reason_category: GatePassReason;
  reason?: string | null;
  destination: string;
  out_at?: string | null;
  expected_return_at?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  status: GatePassStatus;
  approved_by?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
  pass_code?: string | null;
  actual_out_at?: string | null;
  actual_return_at?: string | null;
  marked_out_by?: string | null;
  marked_in_by?: string | null;
  parent_notified: boolean;
  student_name?: string | null;
  student_email?: string | null;
  roll_number?: string | null;
  hostel_name?: string | null;
  room_number?: string | null;
  approver_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GatePassCreatePayload {
  type: GatePassType;
  reason_category: GatePassReason;
  reason?: string;
  destination: string;
  expected_return_at?: string;
  from_date?: string;
  to_date?: string;
}

export const gatePassesApi = {
  request: async (payload: GatePassCreatePayload) => {
    const res = await client.post<APIResponse<GatePassData>>('/api/gate-passes', payload);
    return res.data;
  },

  getMyGatePasses: async (skip = 0, limit = 50) => {
    const res = await client.get<APIResponse<{ total: number; items: GatePassData[] }>>('/api/gate-passes/mine', {
      params: { skip, limit },
    });
    return res.data;
  },

  listAllGatePasses: async (status_filter?: string, skip = 0, limit = 50) => {
    const params = status_filter ? { status_filter, skip, limit } : { skip, limit };
    const res = await client.get<APIResponse<{ total: number; items: GatePassData[] }>>('/api/gate-passes', { params });
    return res.data;
  },

  review: async (id: string, payload: { status: GatePassStatus; note?: string }) => {
    const res = await client.patch<APIResponse<GatePassData>>(`/api/gate-passes/${id}/review`, payload);
    return res.data;
  },

  markExit: async (pass_code: string) => {
    const res = await client.post<APIResponse<GatePassData>>('/api/gate-passes/mark-out', { pass_code });
    return res.data;
  },

  markReturn: async (pass_code: string) => {
    const res = await client.post<APIResponse<GatePassData>>('/api/gate-passes/mark-return', { pass_code });
    return res.data;
  },
};
