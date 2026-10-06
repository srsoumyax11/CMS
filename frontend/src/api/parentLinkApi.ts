import { client } from './client';
import type { APIResponse } from '@/types/api';

export type ParentLinkStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface ParentLinkResponse {
  id: string;
  parent_user_id: string;
  parent_name?: string;
  parent_email?: string;
  student_id: string;
  student_name?: string;
  student_roll?: string;
  status: ParentLinkStatus;
  relationship_type: string;
  share_gate_pass: boolean;
  share_attendance: boolean;
  share_marksheet: boolean;
  share_outpass: boolean;
  created_at: string;
  responded_at?: string;
}

export interface ParentLinkRespondRequest {
  action: 'approve' | 'reject';
  share_gate_pass?: boolean;
  share_attendance?: boolean;
  share_marksheet?: boolean;
  share_outpass?: boolean;
}

export interface ParentLinkPrivacyUpdateRequest {
  share_gate_pass: boolean;
  share_attendance: boolean;
  share_marksheet: boolean;
  share_outpass: boolean;
}

export interface ParentLinkCreateRequest {
  student_identifier: string;
  relationship_type?: string;
}

export const parentLinkApi = {
  requestLink: (data: ParentLinkCreateRequest) =>
    client.post<APIResponse<ParentLinkResponse>>('/api/parent-link/request', data),

  getMyRequests: () =>
    client.get<APIResponse<ParentLinkResponse[]>>('/api/parent-link/my-requests'),

  getActiveLink: () =>
    client.get<APIResponse<ParentLinkResponse | null>>('/api/parent-link/active'),

  respondToRequest: (id: string, data: ParentLinkRespondRequest) =>
    client.post<APIResponse<ParentLinkResponse>>(`/api/parent-link/${id}/respond`, data),

  updatePrivacy: (id: string, data: ParentLinkPrivacyUpdateRequest) =>
    client.patch<APIResponse<ParentLinkResponse>>(`/api/parent-link/${id}/privacy`, data),
};

