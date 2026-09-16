import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  TimetableSlot,
  TimetableSlotCreate,
  TimetableSlotUpdate,
  AttendanceRosterItem,
  AttendanceBatchRequest,
  AttendanceStat,
} from '@/types/api';

export const timetableApi = {
  getMine: () =>
    client.get<APIResponse<TimetableSlot[]>>(API_ROUTES.MY_TIMETABLE),

  createSlot: (data: TimetableSlotCreate) =>
    client.post<APIResponse<TimetableSlot>>(API_ROUTES.TIMETABLE, data),

  updateSlot: (slotId: string, data: TimetableSlotUpdate) =>
    client.patch<APIResponse<TimetableSlot>>(API_ROUTES.TIMETABLE_SLOT(slotId), data),

  deleteSlot: (slotId: string) =>
    client.delete<APIResponse<TimetableSlot>>(API_ROUTES.TIMETABLE_SLOT(slotId)),
};

export const attendanceApi = {
  getRoster: (slotId: string) =>
    client.get<APIResponse<AttendanceRosterItem[]>>(API_ROUTES.ATTENDANCE_ROSTER(slotId)),

  submitBatch: (data: AttendanceBatchRequest) =>
    client.post<APIResponse<AttendanceRosterItem[]>>(API_ROUTES.ATTENDANCE_BATCH, data),

  getMyStats: () =>
    client.get<APIResponse<AttendanceStat[]>>(API_ROUTES.MY_ATTENDANCE_STATS),
};
