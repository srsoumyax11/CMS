import { client } from './client';
import { systemSettingsApi } from './systemSettingsApi';
import { API_ROUTES } from '@/lib/constants';
import type {
  APIResponse,
  StudentItemResponse,
  StudentCreateRequest,
  StudentStatusUpdateRequest,
  FacultyItemResponse,
  FacultyCreateRequest,
  FacultyUpdateRequest,
  AdminItemResponse,
  StudentListParams,
  PaginationParams,
  SystemSettingUpdate,
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  OnboardingStatusResponse,
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
  Building,
  BuildingCreateRequest,
  Room,
  RoomCreateRequest,
  VisitorLog,
  VisitorLogCreate,
  FeeDue,
  HostelAllocation,
  HostelAllocationCreate
} from '@/types/api';

export const adminApi = {
  // Students
  listStudents: (params?: StudentListParams) =>
    client.get<APIResponse<StudentItemResponse[]>>(API_ROUTES.ADMIN_STUDENTS, { params }),

  createStudent: (data: StudentCreateRequest) =>
    client.post<APIResponse<StudentItemResponse>>(API_ROUTES.ADMIN_STUDENTS, data),

  getStudent: (id: string) =>
    client.get<APIResponse<StudentItemResponse>>(API_ROUTES.ADMIN_STUDENT_DETAIL(id)),

  updateStudentStatus: (id: string, data: StudentStatusUpdateRequest) =>
    client.patch<APIResponse<StudentItemResponse>>(API_ROUTES.ADMIN_STUDENT_STATUS(id), data),

  updateStudentDetails: (id: string, data: any) =>
    client.patch<APIResponse<StudentItemResponse>>(API_ROUTES.ADMIN_STUDENT_DETAIL(id), data),

  // Faculty
  listFaculty: (params?: StudentListParams) =>
    client.get<APIResponse<FacultyItemResponse[]>>(API_ROUTES.ADMIN_FACULTY, { params }),

  createFaculty: (data: FacultyCreateRequest) =>
    client.post<APIResponse<FacultyItemResponse>>(API_ROUTES.ADMIN_FACULTY, data),

  updateFaculty: (id: string, data: FacultyUpdateRequest) =>
    client.patch<APIResponse<FacultyItemResponse>>(API_ROUTES.ADMIN_FACULTY_DETAIL(id), data),

  uploadUserPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return client.post<APIResponse<{ photo_url: string }>>(`/api/admin/users/${id}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  listAdmins: (params?: StudentListParams) =>
    client.get<APIResponse<AdminItemResponse[]>>(API_ROUTES.ADMIN_ADMINS, { params }),

  // System Settings Delegation
  getSystemSettings: () => systemSettingsApi.listSystemSettings(),

  updateSystemSetting: (key: string, data: SystemSettingUpdate) =>
    systemSettingsApi.setSystemSetting({ key, value: data.value }),

  // Courses
  listCourses: () =>
    client.get<APIResponse<Course[]>>('/api/admin/courses'),

  createCourse: (data: CourseCreateRequest) =>
    client.post<APIResponse<Course>>('/api/admin/courses', data),

  updateCourse: (id: string, data: CourseUpdateRequest) =>
    client.patch<APIResponse<Course>>(`/api/admin/courses/${id}`, data),

  deleteCourse: (id: string) =>
    client.delete<APIResponse<{message: string}>>(`/api/admin/courses/${id}`),

  // Departments
  listDepartments: () =>
    client.get<APIResponse<Department[]>>(API_ROUTES.ADMIN_DEPARTMENTS),

  createDepartment: (data: DepartmentCreateRequest) =>
    client.post<APIResponse<Department>>(API_ROUTES.ADMIN_DEPARTMENTS, data),

  updateDepartment: (id: string, data: DepartmentUpdateRequest) =>
    client.patch<APIResponse<Department>>(API_ROUTES.ADMIN_DEPARTMENT_DETAIL(id), data),

  deleteDepartment: (id: string) =>
    client.delete<APIResponse<{message: string}>>(API_ROUTES.ADMIN_DEPARTMENT_DETAIL(id)),

  // Onboarding
  getOnboardingStatus: () =>
    client.get<APIResponse<OnboardingStatusResponse>>(API_ROUTES.ADMIN_ONBOARDING_STATUS),

  // ── Infrastructure (Buildings & Rooms) ──
  listBuildings: () =>
    client.get<APIResponse<Building[]>>('/api/infrastructure/buildings'),
  createBuilding: (data: BuildingCreateRequest) =>
    client.post<APIResponse<Building>>('/api/infrastructure/buildings', data),
  updateBuilding: (id: string, data: Partial<BuildingCreateRequest>) =>
    client.patch<APIResponse<Building>>(`/api/infrastructure/buildings/${id}`, data),
  deleteBuilding: (id: string) =>
    client.delete<APIResponse<{message: string}>>(`/api/infrastructure/buildings/${id}`),

  listRooms: (buildingId?: string) =>
    client.get<APIResponse<Room[]>>('/api/infrastructure/rooms', { params: buildingId ? { building_id: buildingId } : undefined }),
  createRoom: (data: RoomCreateRequest) =>
    client.post<APIResponse<Room>>('/api/infrastructure/rooms', data),
  updateRoom: (id: string, data: Partial<RoomCreateRequest>) =>
    client.patch<APIResponse<Room>>(`/api/infrastructure/rooms/${id}`, data),
  deleteRoom: (id: string) =>
    client.delete<APIResponse<{message: string}>>(`/api/infrastructure/rooms/${id}`),

  // ── Facilities (Gate Logs) ──
  listVisitorLogs: (params?: PaginationParams) =>
    client.get<APIResponse<VisitorLog[]>>('/api/visitors', { params }),
  createVisitorLog: (data: VisitorLogCreate) =>
    client.post<APIResponse<VisitorLog>>('/api/visitors/enter', data),
  markVisitorExit: (id: string) =>
    client.patch<APIResponse<VisitorLog>>(`/api/visitors/${id}/exit`, {}),

  // ── Facilities (Fee Dues) ──
  listFeeDues: (params?: PaginationParams) =>
    client.get<APIResponse<FeeDue[]>>('/api/finance', { params }),
  createFeeDue: (data: any) =>
    client.post<APIResponse<FeeDue>>('/api/finance', data),
  updateFeeDue: (id: string, data: any) =>
    client.patch<APIResponse<FeeDue>>(`/api/finance/${id}`, data),
    
  // ── Hostel Allocations ──
  listHostelAllocations: (params?: PaginationParams) =>
    client.get<APIResponse<HostelAllocation[]>>('/api/hostel/allocations', { params }),
  createHostelAllocation: (data: HostelAllocationCreate) =>
    client.post<APIResponse<HostelAllocation>>('/api/hostel/allocations', data),
  vacateHostelRoom: (id: string) =>
    client.patch<APIResponse<HostelAllocation>>(`/api/hostel/allocations/${id}/vacate`, {}),

  // Users
  listUsers: (params?: { skip?: number; limit?: number }) =>
    client.get<APIResponse<any>>('/api/admin/users', { params }),
  updateUser: (id: string, data: any) =>
    client.patch<APIResponse<any>>(`/api/admin/users/${id}`, data),
};
