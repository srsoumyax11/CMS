import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  RoleResponse,
  RoleCreateRequest,
  RoleUpdateRequest,
  UpdatePermissionsRequest,
  AssignRoleRequest,
  PermissionMatrixResponse,
  RoleTemplatesResponse,
} from '@/types/api';

export const rolesApi = {
  list: () =>
    client.get<APIResponse<RoleResponse[]>>(API_ROUTES.ROLES),

  create: (data: RoleCreateRequest) =>
    client.post<APIResponse<RoleResponse>>(API_ROUTES.ROLES, data),

  update: (id: string, data: RoleUpdateRequest) =>
    client.patch<APIResponse<RoleResponse>>(`${API_ROUTES.ROLES}/${id}`, data),

  getTemplates: () =>
    client.get<APIResponse<RoleTemplatesResponse>>(API_ROUTES.ROLE_TEMPLATES),

  getPermissionMatrix: (roleId?: string) =>
    client.get<APIResponse<PermissionMatrixResponse>>(API_ROUTES.PERMISSION_MATRIX, {
      params: roleId ? { role_id: roleId } : undefined,
    }),

  updatePermissions: (id: string, data: UpdatePermissionsRequest) =>
    client.patch<APIResponse<boolean>>(API_ROUTES.ROLE_PERMISSIONS(id), data),

  assignRole: (id: string, data: AssignRoleRequest) =>
    client.post<APIResponse<boolean>>(API_ROUTES.ROLE_ASSIGN(id), data),

  getAssignmentCount: (id: string) =>
    client.get<APIResponse<number>>(API_ROUTES.ROLE_ASSIGNMENT_COUNT(id)),

  delete: (id: string, force?: boolean) =>
    client.delete<APIResponse<boolean>>(API_ROUTES.ROLE_DELETE(id), {
      params: force ? { force: true } : undefined,
    }),
};
