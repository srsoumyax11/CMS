import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  NotificationResponse,
  NotificationListResponse,
} from '@/types/api';

export const notificationsApi = {
  getMyNotifications: async () => {
    const res = await client.get<APIResponse<NotificationListResponse>>(
      API_ROUTES.NOTIFICATIONS
    );
    return res.data;
  },

  markRead: async (id: string) => {
    const res = await client.patch<APIResponse<NotificationResponse>>(
      API_ROUTES.NOTIFICATION_READ(id)
    );
    return res.data;
  },

  markAllRead: async () => {
    const res = await client.patch<APIResponse<boolean>>(
      API_ROUTES.NOTIFICATIONS_READ_ALL
    );
    return res.data;
  },
};
