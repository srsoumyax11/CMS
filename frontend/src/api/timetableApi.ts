import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  TimetableSlot,
  TimetableSlotCreatePayload,
  TimetableSlotUpdatePayload,
  TimetableException,
  TimetableExceptionCreatePayload,
  MyScheduleResponseData,
  PaginationParams,
} from '@/types/api';

export const timetableApi = {
  getMySchedule: () =>
    client.get<APIResponse<MyScheduleResponseData>>('/api/timetable/mine'),

  listSlots: (params?: PaginationParams & { term_id?: string; class_group_id?: string; faculty_user_id?: string; day_of_week?: number; room_location_id?: string; status?: boolean }) =>
    client.get<APIResponse<{ total: number; items: TimetableSlot[] }>>(API_ROUTES.TIMETABLE_SLOTS, { params }),

  getSlotById: (id: string) =>
    client.get<APIResponse<TimetableSlot>>(`${API_ROUTES.TIMETABLE_SLOTS}/${id}`),

  createSlot: (data: TimetableSlotCreatePayload) =>
    client.post<APIResponse<TimetableSlot>>(API_ROUTES.TIMETABLE_SLOTS, data),

  updateSlot: (id: string, data: TimetableSlotUpdatePayload) =>
    client.put<APIResponse<TimetableSlot>>(`${API_ROUTES.TIMETABLE_SLOTS}/${id}`, data),

  deleteSlot: (id: string) =>
    client.delete<APIResponse<{ message: string }>>(`${API_ROUTES.TIMETABLE_SLOTS}/${id}`),

  listExceptions: (params?: PaginationParams & { slot_id?: string; exception_date?: string }) =>
    client.get<APIResponse<{ total: number; items: TimetableException[] }>>(API_ROUTES.TIMETABLE_EXCEPTIONS, { params }),

  createException: (data: TimetableExceptionCreatePayload) =>
    client.post<APIResponse<TimetableException>>(API_ROUTES.TIMETABLE_EXCEPTIONS, data),

  deleteException: (id: string) =>
    client.delete<APIResponse<{ message: string }>>(`${API_ROUTES.TIMETABLE_EXCEPTIONS}/${id}`),
};
