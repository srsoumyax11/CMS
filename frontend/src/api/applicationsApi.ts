import { client } from './client';
import type { APIResponse } from '@/types/api';

export interface RoleApplicationData {
  id: string;
  user_id: string;
  applicant_name?: string;
  applicant_email?: string;
  target_role: 'student' | 'parent' | 'faculty' | 'staff';
  application_data: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'revision';
  admin_notes?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export const applicationsApi = {
  apply: async (target_role: string, data: Record<string, any>) => {
    const res = await client.post<APIResponse<RoleApplicationData>>('/api/applications/apply', {
      target_role,
      data,
    });
    return res.data;
  },

  getMyStatus: async () => {
    const res = await client.get<APIResponse<RoleApplicationData | null>>('/api/applications/my-status');
    return res.data;
  },

  listApplications: async (status_filter?: string) => {
    const params = status_filter ? { status_filter } : {};
    const res = await client.get<APIResponse<RoleApplicationData[]>>('/api/applications', { params });
    return res.data;
  },

  approveApplication: async (id: string, admin_notes?: string) => {
    const res = await client.post<APIResponse<RoleApplicationData>>(`/api/applications/${id}/approve`, { admin_notes });
    return res.data;
  },

  rejectApplication: async (id: string, admin_notes?: string) => {
    const res = await client.post<APIResponse<RoleApplicationData>>(`/api/applications/${id}/reject`, { admin_notes });
    return res.data;
  },

  checkIdentifier: async (role: string, value: string) => {
    const res = await client.get<APIResponse<{ available: boolean }>>(`/api/applications/check-identifier`, {
      params: { role, value }
    });
    return res.data;
  },
};
