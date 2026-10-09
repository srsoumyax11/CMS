import { client } from './client';
import type {
  APIResponse,
  UserSilentSettingResponse,
  UserSilentSettingUpdateRequest,
  SilentScheduleResponse,
} from '@/types/api';

export const silentApi = {
  getSettings: () =>
    client.get<APIResponse<UserSilentSettingResponse>>('/api/silent/settings'),

  updateSettings: (data: UserSilentSettingUpdateRequest) =>
    client.put<APIResponse<UserSilentSettingResponse>>('/api/silent/settings', data),

  getSchedule: (dateStr?: string) =>
    client.get<APIResponse<SilentScheduleResponse>>('/api/silent/schedule', {
      params: { schedule_date: dateStr },
    }),

  getIcalUrl: () => `${client.defaults.baseURL || ''}/api/silent/ical.ics`,
};
