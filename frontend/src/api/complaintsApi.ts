import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  ComplaintResponse,
  ComplaintListResponse,
  ComplaintCreateRequest,
  ComplaintStatusUpdateRequest,
  ComplaintAssignRequest,
  ComplaintListParams,
  RecurringIssueResponse,
  AgeingComplaintResponse,
  PaginationParams,
} from '@/types/api';

export const complaintsApi = {
  // Student/Public
  create: (data: ComplaintCreateRequest) => {
    const formData = new FormData();
    formData.append('category', data.category);
    if (data.hostel_id) formData.append('hostel_id', data.hostel_id);
    if (data.room_number) formData.append('room_number', data.room_number);
    if (data.location_hostel) formData.append('location_hostel', data.location_hostel);
    if (data.location_room) formData.append('location_room', data.location_room);
    formData.append('description', data.description);
    if (data.visibility) formData.append('visibility', data.visibility);
    if (data.photo) formData.append('photo', data.photo);
    return client.post<APIResponse<ComplaintResponse>>(
      API_ROUTES.COMPLAINTS,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  getMine: (params?: PaginationParams) =>
    client.get<APIResponse<ComplaintListResponse>>(API_ROUTES.MY_COMPLAINTS, { params }),

  getPublic: (params?: PaginationParams) =>
    client.get<APIResponse<ComplaintListResponse>>(API_ROUTES.PUBLIC_COMPLAINTS, { params }),

  getById: (id: string) =>
    client.get<APIResponse<ComplaintResponse>>(API_ROUTES.COMPLAINT_DETAIL(id)),

  cancel: (id: string) =>
    client.patch<APIResponse<ComplaintResponse>>(API_ROUTES.COMPLAINT_CANCEL(id)),

  // Admin/Faculty
  listAll: (params?: ComplaintListParams) =>
    client.get<APIResponse<ComplaintListResponse>>(API_ROUTES.ADMIN_COMPLAINTS, { params }),

  updateStatus: (id: string, data: ComplaintStatusUpdateRequest) =>
    client.patch<APIResponse<ComplaintResponse>>(API_ROUTES.ADMIN_COMPLAINT_STATUS(id), data),

  assign: (id: string, data: ComplaintAssignRequest) =>
    client.patch<APIResponse<ComplaintResponse>>(API_ROUTES.ADMIN_COMPLAINT_ASSIGN(id), data),

  getRecurring: (days?: number) =>
    client.get<APIResponse<RecurringIssueResponse[]>>(API_ROUTES.ADMIN_COMPLAINTS_RECURRING, {
      params: days ? { days } : undefined,
    }),

  getAgeing: () =>
    client.get<APIResponse<AgeingComplaintResponse[]>>(API_ROUTES.ADMIN_COMPLAINTS_AGEING),
};
