import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  Course,
} from '@/types/api';

export const metadataApi = {
  getCourses: () =>
    client.get<APIResponse<Course[]>>(API_ROUTES.COURSES),
  getPublicSettings: () =>
    client.get<APIResponse<Record<string, string>>>(API_ROUTES.PUBLIC_SETTINGS),
};
