import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type { APIResponse } from '@/types/api';

export interface RoleApplicationData {
  id: string;
  user_id: string;
  applicant_name?: string | null;
  applicant_email?: string | null;
  target_role: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'revision';
  application_data: Record<string, any>;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleApplicationCreatePayload {
  target_role: 'STUDENT' | 'FACULTY' | 'STAFF' | 'PARENT' | string;
  application_data: Record<string, any>;
}

export const applicationsApi = {
  apply: async (target_role: string, application_data: Record<string, any>) => {
    const res = await client.post<APIResponse<RoleApplicationData>>('/api/applications/apply', {
      target_role: target_role.toUpperCase(),
      application_data,
    });
    return res.data;
  },

  getMyStatus: async () => {
    const res = await client.get<APIResponse<RoleApplicationData | null>>('/api/applications/my-status');
    return res.data;
  },

  listApplications: async (status_filter?: string) => {
    const params = status_filter ? { status_filter } : {};
    const res = await client.get<APIResponse<RoleApplicationData[]>>(API_ROUTES.APPLICATIONS, { params });
    return res.data;
  },

  approveApplication: async (id: string, admin_notes?: string) => {
    const res = await client.post<APIResponse<RoleApplicationData>>(API_ROUTES.APPROVE_APPLICATION(id), { admin_notes });
    return res.data;
  },

  rejectApplication: async (id: string, admin_notes?: string) => {
    const res = await client.post<APIResponse<RoleApplicationData>>(API_ROUTES.REJECT_APPLICATION(id), { admin_notes });
    return res.data;
  },

  checkIdentifier: async (role: string, value: string) => {
    const res = await client.get<APIResponse<{ available: boolean }>>(API_ROUTES.CHECK_IDENTIFIER, {
      params: { role: role.toUpperCase(), value }
    });
    return res.data;
  },
};
