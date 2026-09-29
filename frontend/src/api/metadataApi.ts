import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  Course,
  Department,
  MetadataRole,
} from '@/types/api';

export const metadataApi = {
  getCourses: () =>
    client.get<APIResponse<Course[]>>(API_ROUTES.COURSES),
  getDepartments: () =>
    client.get<APIResponse<Department[]>>(API_ROUTES.DEPARTMENTS),
  getRoles: () =>
    client.get<APIResponse<MetadataRole[]>>(API_ROUTES.METADATA_ROLES),
  getPublicSettings: () =>
    client.get<APIResponse<Record<string, string>>>(API_ROUTES.PUBLIC_SETTINGS),
};
