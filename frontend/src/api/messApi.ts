import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  MessMenu,
  MessMenuCreate,
  MessFeedbackCreate,
  MessOptOutCreate,
} from '@/types/api';

export const messApi = {
  // Student/Public
  getMenuToday: () =>
    client.get<APIResponse<MessMenu[]>>(API_ROUTES.MESS_MENU_TODAY),

  getMenuWeekly: () =>
    client.get<APIResponse<MessMenu[]>>(API_ROUTES.MESS_MENU_WEEKLY),

  submitFeedback: (data: MessFeedbackCreate) =>
    client.post<APIResponse<MessFeedbackCreate>>(API_ROUTES.MESS_FEEDBACK, data),

  getMyFeedback: () =>
    client.get<APIResponse<MessFeedbackCreate[]>>(API_ROUTES.MESS_FEEDBACK_MINE),

  submitOptOut: (data: MessOptOutCreate) =>
    client.post<APIResponse<MessOptOutCreate>>(API_ROUTES.MESS_OPTOUT, data),

  cancelOptOut: (data: MessOptOutCreate) =>
    client.delete<APIResponse<MessOptOutCreate>>(API_ROUTES.MESS_OPTOUT, { data }),

  // Admin
  createOrUpdateMenu: (data: MessMenuCreate) =>
    client.post<APIResponse<MessMenu>>(API_ROUTES.ADMIN_MESS_MENU, data),

  getAnalyticsToday: () =>
    client.get<APIResponse<Record<string, unknown>>>(API_ROUTES.ADMIN_MESS_ANALYTICS_TODAY),
};
