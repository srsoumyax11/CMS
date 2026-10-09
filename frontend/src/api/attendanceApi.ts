import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  AttendanceRosterResponse,
  AttendanceSessionResponse,
  AttendanceRecordSubmit,
  StudentAttendanceStatsResponse,
} from '@/types/api';

export const attendanceApi = {
  getRoster: async (slotId: string, dateStr: string) => {
    const res = await client.get<APIResponse<AttendanceRosterResponse>>(
      API_ROUTES.ATTENDANCE_ROSTER,
      { params: { slot_id: slotId, date: dateStr } }
    );
    return res.data;
  },

  openSession: async (slotId: string, dateStr: string) => {
    const res = await client.post<APIResponse<AttendanceSessionResponse>>(
      API_ROUTES.ATTENDANCE_SESSIONS,
      { slot_id: slotId, date: dateStr }
    );
    return res.data;
  },

  submitAttendance: async (sessionId: string, records: AttendanceRecordSubmit[]) => {
    const res = await client.post<APIResponse<{ message: string }>>(
      `${API_ROUTES.ATTENDANCE_SESSIONS}/${sessionId}/submit`,
      { records }
    );
    return res.data;
  },

  lockSession: async (sessionId: string) => {
    const res = await client.post<APIResponse<AttendanceSessionResponse>>(
      `${API_ROUTES.ATTENDANCE_SESSIONS}/${sessionId}/lock`
    );
    return res.data;
  },

  getMyStats: async () => {
    const res = await client.get<APIResponse<StudentAttendanceStatsResponse>>(
      API_ROUTES.MY_ATTENDANCE_STATS
    );
    return res.data;
  },
};
