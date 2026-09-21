import client from '../client';
import { API_ROUTES } from '@/lib/constants';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  unread_count: number;
}

export const notificationService = {
  getNotifications: async () => {
    const response = await client.get(API_ROUTES.NOTIFICATIONS);
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await client.patch(API_ROUTES.NOTIFICATION_READ(id));
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await client.patch(API_ROUTES.NOTIFICATIONS_READ_ALL);
    return response.data;
  }
};
