import { client } from './client';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  StudentItemResponse,
  StudentStatusUpdateRequest,
  FacultyItemResponse,
  FacultyCreateRequest,
  FacultyUpdateRequest,
  AdminItemResponse,
  StudentListParams,
  PaginationParams,
  SystemSetting,
  SystemSettingUpdate,
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest
} from '@/types/api';

export const adminApi = {
  // Students
  listStudents: (params?: StudentListParams) =>
    client.get<APIResponse<StudentItemResponse[]>>(API_ROUTES.ADMIN_STUDENTS, { params }),

  getStudent: (id: string) =>
    client.get<APIResponse<StudentItemResponse>>(API_ROUTES.ADMIN_STUDENT_DETAIL(id)),

  updateStudentStatus: (id: string, data: StudentStatusUpdateRequest) =>
    client.patch<APIResponse<StudentItemResponse>>(API_ROUTES.ADMIN_STUDENT_STATUS(id), data),

  updateStudentDetails: (id: string, data: any) =>
    client.put<APIResponse<StudentItemResponse>>(API_ROUTES.ADMIN_STUDENT_DETAIL(id), data),

  // Faculty
  listFaculty: (params?: StudentListParams) =>
    client.get<APIResponse<FacultyItemResponse[]>>(API_ROUTES.ADMIN_FACULTY, { params }),

  createFaculty: (data: FacultyCreateRequest) =>
    client.post<APIResponse<FacultyItemResponse>>(API_ROUTES.ADMIN_FACULTY, data),

  updateFaculty: (id: string, data: FacultyUpdateRequest) =>
    client.patch<APIResponse<FacultyItemResponse>>(API_ROUTES.ADMIN_FACULTY_DETAIL(id), data),

  listAdmins: (params?: StudentListParams) =>
    client.get<APIResponse<AdminItemResponse[]>>(API_ROUTES.ADMIN_ADMINS, { params }),

  // Settings
  getSystemSettings: () =>
    client.get<APIResponse<SystemSetting[]>>(API_ROUTES.ADMIN_SETTINGS),

  updateSystemSetting: (key: string, data: SystemSettingUpdate) =>
    client.patch<APIResponse<SystemSetting>>(`${API_ROUTES.ADMIN_SETTINGS}/${key}`, data),

  // Departments
  listDepartments: () =>
    client.get<APIResponse<Department[]>>(API_ROUTES.ADMIN_DEPARTMENTS),

  createDepartment: (data: DepartmentCreateRequest) =>
    client.post<APIResponse<Department>>(API_ROUTES.ADMIN_DEPARTMENTS, data),

  updateDepartment: (id: string, data: DepartmentUpdateRequest) =>
    client.patch<APIResponse<Department>>(API_ROUTES.ADMIN_DEPARTMENT_DETAIL(id), data),

  deleteDepartment: (id: string) =>
    client.delete<APIResponse<{message: string}>>(API_ROUTES.ADMIN_DEPARTMENT_DETAIL(id)),
};
