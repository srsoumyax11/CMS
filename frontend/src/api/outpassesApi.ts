import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  OutpassResponse,
  OutpassListResponse,
  OutpassCreateRequest,
  OutpassRejectRequest,
  OutpassApprovalActionResponse,
  OutpassListParams,
  PaginationParams,
} from '@/types/api';

export const outpassesApi = {
  // Student
  create: (data: OutpassCreateRequest) =>
    client.post<APIResponse<OutpassResponse>>(API_ROUTES.OUTPASSES, data),

  getMine: (params?: PaginationParams) =>
    client.get<APIResponse<OutpassListResponse>>(API_ROUTES.MY_OUTPASSES, { params }),

  getById: (id: string) =>
    client.get<APIResponse<OutpassResponse>>(API_ROUTES.OUTPASS_DETAIL(id)),

  cancel: (id: string) =>
    client.patch<APIResponse<OutpassResponse>>(API_ROUTES.OUTPASS_CANCEL(id)),

  // Admin
  listAll: (params?: OutpassListParams) =>
    client.get<APIResponse<OutpassListResponse>>(API_ROUTES.ADMIN_OUTPASSES, { params }),

  getAdminById: (id: string) =>
    client.get<APIResponse<OutpassResponse>>(API_ROUTES.ADMIN_OUTPASS_DETAIL(id)),

  approve: (id: string) =>
    client.patch<OutpassApprovalActionResponse>(API_ROUTES.ADMIN_OUTPASS_APPROVE(id)),

  reject: (id: string, data: OutpassRejectRequest) =>
    client.patch<OutpassApprovalActionResponse>(API_ROUTES.ADMIN_OUTPASS_REJECT(id), data),

  depart: (id: string) =>
    client.patch<OutpassApprovalActionResponse>(API_ROUTES.ADMIN_OUTPASS_DEPART(id)),

  return: (id: string) =>
    client.patch<OutpassApprovalActionResponse>(API_ROUTES.ADMIN_OUTPASS_RETURN(id)),
};
