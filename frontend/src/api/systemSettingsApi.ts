import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  SystemSetting,
  SystemSettingCreateUpdate,
  SystemSettingListResponse,
} from '@/types/api';

export const systemSettingsApi = {
  getPublicSystemSettings: () =>
    client.get<APIResponse<SystemSettingListResponse>>(API_ROUTES.PUBLIC_SYSTEM_SETTINGS),

  listSystemSettings: (category?: string) =>
    client.get<APIResponse<SystemSettingListResponse>>(API_ROUTES.SYSTEM_SETTINGS, {
      params: category ? { category } : undefined,
    }),

  setSystemSetting: (data: SystemSettingCreateUpdate) =>
    client.post<APIResponse<SystemSetting>>(API_ROUTES.SYSTEM_SETTINGS, data),
};
