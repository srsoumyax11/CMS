import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  NoticeResponse,
  NoticeListResponse,
  NoticeCreateRequest,
  NoticeUpdateRequest,
  PaginationParams,
} from '@/types/api';

export const noticesApi = {
  create: (data: NoticeCreateRequest) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    if (data.target_course_id) formData.append('target_course_id', data.target_course_id);
    const deptId = data.target_department_id || data.target_branch_id;
    if (deptId) formData.append('target_department_id', deptId);
    if (data.target_year) formData.append('target_year', String(data.target_year));
    if (data.target_hostel) formData.append('target_hostel', data.target_hostel);
    if (data.target_user_types) formData.append('target_user_types', data.target_user_types);
    if (data.file) formData.append('file', data.file);
    return client.post<APIResponse<NoticeResponse>>(API_ROUTES.NOTICES, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  list: (params?: PaginationParams) =>
    client.get<APIResponse<NoticeListResponse>>(API_ROUTES.NOTICES, { params }),

  getById: (id: string) =>
    client.get<APIResponse<NoticeResponse>>(API_ROUTES.NOTICE_DETAIL(id)),

  update: (id: string, data: NoticeUpdateRequest) => {
    const formData = new URLSearchParams();
    if (data.title) formData.append('title', data.title);
    if (data.content) formData.append('content', data.content);
    return client.patch<APIResponse<NoticeResponse>>(API_ROUTES.NOTICE_DETAIL(id), formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  delete: (id: string) =>
    client.delete<APIResponse<NoticeResponse>>(API_ROUTES.NOTICE_DETAIL(id)),

  markRead: (id: string) =>
    client.post<APIResponse<boolean>>(API_ROUTES.NOTICE_READ(id)),
};
