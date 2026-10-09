import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type { APIResponse } from '@/types/api';

export type DocumentRequestStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_REVISION'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED';

export interface DocumentTypeData {
  id: string;
  code: string;
  name: string;
  description?: string;
  template_file_url?: string;
  fields_schema?: Record<string, any>;
  approval_steps?: string[];
  fee: number;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentApprovalData {
  id: string;
  request_id: string;
  step_no: number;
  approver_user_id: string;
  approver_name?: string;
  decision: string;
  note?: string;
  decided_at: string;
}

export interface DocumentRequestData {
  id: string;
  type_id: string;
  user_id: string;
  student_name?: string;
  student_email?: string;
  roll_number?: string;
  document_type_name?: string;
  document_type_code?: string;
  form_data?: Record<string, any>;
  status: DocumentRequestStatus;
  current_step: number;
  issued_file_url?: string;
  verify_code?: string;
  issued_at?: string;
  approvals: DocumentApprovalData[];
  created_at: string;
  updated_at: string;
}

export interface DocumentRequestListResult {
  total: number;
  items: DocumentRequestData[];
}

export interface DocumentTypeListResult {
  total: number;
  items: DocumentTypeData[];
}

export interface DocumentVerifyResult {
  valid: boolean;
  message: string;
  request_id?: string;
  user_id?: string;
  document_type_code?: string;
  issued_at?: string;
  verify_code?: string;
}

export interface DocumentApplyPayload {
  type_id: string;
  form_data?: Record<string, any>;
}

export interface DocumentApprovalPayload {
  decision: 'APPROVED' | 'REJECTED' | 'REVISION';
  note?: string;
  issued_file_url?: string;
}

export const documentsApi = {
  listTypes: async (activeOnly = true) => {
    const res = await client.get<APIResponse<DocumentTypeListResult>>(API_ROUTES.DOCUMENT_TYPES, {
      params: { active_only: activeOnly },
    });
    return res.data;
  },

  apply: async (payload: DocumentApplyPayload) => {
    const res = await client.post<APIResponse<DocumentRequestData>>(
      API_ROUTES.DOCUMENT_REQUESTS,
      payload
    );
    return res.data;
  },

  getMyRequests: async () => {
    const res = await client.get<APIResponse<DocumentRequestListResult>>(
      `${API_ROUTES.DOCUMENT_REQUESTS}/mine`
    );
    return res.data;
  },

  listAllRequests: async (status?: string) => {
    const res = await client.get<APIResponse<DocumentRequestListResult>>(
      API_ROUTES.DOCUMENT_REQUESTS,
      { params: { status: status || undefined } }
    );
    return res.data;
  },

  review: async (id: string, payload: DocumentApprovalPayload) => {
    const res = await client.post<APIResponse<DocumentRequestData>>(
      API_ROUTES.DOCUMENT_REQUEST_APPROVE(id),
      payload
    );
    return res.data;
  },

  verify: async (code: string) => {
    const res = await client.get<APIResponse<DocumentVerifyResult>>(
      API_ROUTES.DOCUMENT_VERIFY(code)
    );
    return res.data;
  },
};
