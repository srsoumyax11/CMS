import { client } from './client';
import type {
  APIResponse,
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
  AcademicTerm,
  AcademicTermCreateRequest,
  AcademicTermUpdateRequest,
  Subject,
  SubjectCreateRequest,
  SubjectUpdateRequest,
  ClassGroup,
  ClassGroupCreateRequest,
  ClassGroupUpdateRequest,
  Holiday,
  HolidayCreateRequest,
  HolidayUpdateRequest,
} from '@/types/api';

export const academicApi = {
  // ── Departments ──
  listDepartments: () =>
    client.get<APIResponse<{ items: Department[]; total: number }>>('/api/academic/departments'),
  createDepartment: (data: DepartmentCreateRequest) =>
    client.post<APIResponse<Department>>('/api/academic/departments', data),
  updateDepartment: (id: string, data: DepartmentUpdateRequest) =>
    client.put<APIResponse<Department>>(`/api/academic/departments/${id}`, data),
  deleteDepartment: (id: string) =>
    client.delete<APIResponse<{ message: string }>>(`/api/academic/departments/${id}`),

  // ── Courses ──
  listCourses: () =>
    client.get<APIResponse<{ items: Course[]; total: number }>>('/api/academic/courses'),
  createCourse: (data: CourseCreateRequest) =>
    client.post<APIResponse<Course>>('/api/academic/courses', data),
  updateCourse: (id: string, data: CourseUpdateRequest) =>
    client.put<APIResponse<Course>>(`/api/academic/courses/${id}`, data),
  deleteCourse: (id: string) =>
    client.delete<APIResponse<{ message: string }>>(`/api/academic/courses/${id}`),

  // ── Academic Terms ──
  listTerms: () =>
    client.get<APIResponse<{ items: AcademicTerm[]; total: number }>>('/api/academic/terms'),
  getCurrentTerm: () =>
    client.get<APIResponse<AcademicTerm>>('/api/academic/terms/current'),
  setCurrentTerm: (id: string) =>
    client.post<APIResponse<AcademicTerm>>(`/api/academic/terms/${id}/set-current`),
  createTerm: (data: AcademicTermCreateRequest) =>
    client.post<APIResponse<AcademicTerm>>('/api/academic/terms', data),
  updateTerm: (id: string, data: AcademicTermUpdateRequest) =>
    client.put<APIResponse<AcademicTerm>>(`/api/academic/terms/${id}`, data),
  deleteTerm: (id: string) =>
    client.delete<APIResponse<{ message: string }>>(`/api/academic/terms/${id}`),

  // ── Subjects ──
  listSubjects: (departmentId?: string) =>
    client.get<APIResponse<{ items: Subject[]; total: number }>>('/api/academic/subjects', {
      params: departmentId ? { department_id: departmentId } : undefined,
    }),
  createSubject: (data: SubjectCreateRequest) =>
    client.post<APIResponse<Subject>>('/api/academic/subjects', data),
  updateSubject: (id: string, data: SubjectUpdateRequest) =>
    client.put<APIResponse<Subject>>(`/api/academic/subjects/${id}`, data),
  deleteSubject: (id: string) =>
    client.delete<APIResponse<{ message: string }>>(`/api/academic/subjects/${id}`),

  // ── Class Group Cohorts ──
  listClassGroups: () =>
    client.get<APIResponse<{ items: ClassGroup[]; total: number }>>('/api/academic/class-groups'),
  createClassGroup: (data: ClassGroupCreateRequest) =>
    client.post<APIResponse<ClassGroup>>('/api/academic/class-groups', data),
  updateClassGroup: (id: string, data: ClassGroupUpdateRequest) =>
    client.put<APIResponse<ClassGroup>>(`/api/academic/class-groups/${id}`, data),
  deleteClassGroup: (id: string) =>
    client.delete<APIResponse<{ message: string }>>(`/api/academic/class-groups/${id}`),

  // ── Holidays ──
  listHolidays: (params?: { start_date?: string; end_date?: string; department_id?: string }) =>
    client.get<APIResponse<{ items: Holiday[]; total: number }>>('/api/academic/holidays', { params }),
  createHoliday: (data: HolidayCreateRequest) =>
    client.post<APIResponse<Holiday>>('/api/academic/holidays', data),
  updateHoliday: (id: string, data: HolidayUpdateRequest) =>
    client.put<APIResponse<Holiday>>(`/api/academic/holidays/${id}`, data),
  deleteHoliday: (id: string) =>
    client.delete<APIResponse<{ message: string }>>(`/api/academic/holidays/${id}`),
};
