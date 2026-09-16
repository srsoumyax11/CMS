export const API_ROUTES = {
  // Auth
  LOGIN: '/api/auth/login',
  REFRESH: '/api/auth/refresh',
  ME: '/api/auth/me',
  REGISTER: '/api/auth/register',
  TOKEN: '/api/auth/token',

  // Profile
  UPLOAD_PHOTO: '/api/profiles/me/photo',
  UPDATE_NAME: '/api/profiles/me/name',
  CHANGE_PASSWORD: '/api/profiles/me/password',

  // Metadata
  COURSES: '/api/metadata/courses',

  // Complaints (Student/Public)
  COMPLAINTS: '/api/complaints',
  MY_COMPLAINTS: '/api/complaints/mine',
  PUBLIC_COMPLAINTS: '/api/complaints/public',
  COMPLAINT_DETAIL: (id: string) => `/api/complaints/${id}`,
  COMPLAINT_CANCEL: (id: string) => `/api/complaints/${id}/cancel`,

  // Complaints (Admin/Faculty)
  ADMIN_COMPLAINTS: '/api/admin/complaints',
  ADMIN_COMPLAINT_STATUS: (id: string) => `/api/admin/complaints/${id}/status`,
  ADMIN_COMPLAINT_ASSIGN: (id: string) => `/api/admin/complaints/${id}/assign`,
  ADMIN_COMPLAINTS_RECURRING: '/api/admin/complaints/analytics/recurring',
  ADMIN_COMPLAINTS_AGEING: '/api/admin/complaints/analytics/ageing',

  // Notices
  NOTICES: '/api/notices',
  NOTICE_DETAIL: (id: string) => `/api/notices/${id}`,
  NOTICE_READ: (id: string) => `/api/notices/${id}/read`,

  // Outpasses (Student)
  OUTPASSES: '/api/outpasses',
  MY_OUTPASSES: '/api/outpasses/mine',
  OUTPASS_DETAIL: (id: string) => `/api/outpasses/${id}`,
  OUTPASS_CANCEL: (id: string) => `/api/outpasses/${id}/cancel`,

  // Outpasses (Admin)
  ADMIN_OUTPASSES: '/api/admin/outpasses',
  ADMIN_OUTPASS_DETAIL: (id: string) => `/api/admin/outpasses/${id}`,
  ADMIN_OUTPASS_APPROVE: (id: string) => `/api/admin/outpasses/${id}/approve`,
  ADMIN_OUTPASS_REJECT: (id: string) => `/api/admin/outpasses/${id}/reject`,
  ADMIN_OUTPASS_DEPART: (id: string) => `/api/admin/outpasses/${id}/depart`,
  ADMIN_OUTPASS_RETURN: (id: string) => `/api/admin/outpasses/${id}/return`,

  // Timetable
  MY_TIMETABLE: '/api/timetable/mine',
  TIMETABLE: '/api/timetable/',
  TIMETABLE_SLOT: (slotId: string) => `/api/timetable/${slotId}`,

  // Attendance
  ATTENDANCE_ROSTER: (slotId: string) => `/api/attendance/roster/${slotId}`,
  ATTENDANCE_BATCH: '/api/attendance/batch',
  MY_ATTENDANCE_STATS: '/api/attendance/mine/stats',

  // Mess (Student/Public)
  MESS_MENU_TODAY: '/api/mess/menu/today',
  MESS_MENU_WEEKLY: '/api/mess/menu/weekly',
  MESS_FEEDBACK: '/api/mess/feedback',
  MESS_FEEDBACK_MINE: '/api/mess/feedback/mine',
  MESS_OPTOUT: '/api/mess/optout',

  // Mess (Admin)
  ADMIN_MESS_MENU: '/api/admin/mess/menu',
  ADMIN_MESS_ANALYTICS_TODAY: '/api/admin/mess/analytics/today',

  // Admin: Students
  ADMIN_STUDENTS: '/api/admin/students',
  ADMIN_STUDENT_DETAIL: (id: string) => `/api/admin/students/${id}`,
  ADMIN_STUDENT_STATUS: (id: string) => `/api/admin/students/${id}/status`,

  // Admin: Faculty
  ADMIN_FACULTY: '/api/admin/faculty',
  ADMIN_FACULTY_DETAIL: (id: string) => `/api/admin/faculty/${id}`,

  // Roles & Permissions
  ROLES: '/api/roles',
  PERMISSION_MATRIX: '/api/roles/permission-matrix',
  ROLE_PERMISSIONS: (id: string) => `/api/roles/${id}/permissions`,
  ROLE_ASSIGN: (id: string) => `/api/roles/${id}/assign`,
  ROLE_ASSIGNMENT_COUNT: (id: string) => `/api/roles/${id}/assignments/count`,
  ROLE_DELETE: (id: string) => `/api/roles/${id}`,
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'cms_access_token',
  REFRESH_TOKEN: 'cms_refresh_token',
} as const;

export const USER_ROLES = {
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMIN: 'admin',
} as const;

export const USER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

export const AUTH_EVENTS = {
  UNAUTHORIZED: 'auth:unauthorized',
  LOGOUT: 'auth:logout',
} as const;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const QUERY_KEYS = {
  ME: 'me',
  COURSES: 'courses',
  MY_COMPLAINTS: 'my-complaints',
  PUBLIC_COMPLAINTS: 'public-complaints',
  COMPLAINT: 'complaint',
  ADMIN_COMPLAINTS: 'admin-complaints',
  RECURRING_ISSUES: 'recurring-issues',
  AGEING_COMPLAINTS: 'ageing-complaints',
  NOTICES: 'notices',
  NOTICE: 'notice',
  MY_OUTPASSES: 'my-outpasses',
  OUTPASS: 'outpass',
  ADMIN_OUTPASSES: 'admin-outpasses',
  MY_TIMETABLE: 'my-timetable',
  ATTENDANCE_ROSTER: 'attendance-roster',
  MY_ATTENDANCE_STATS: 'my-attendance-stats',
  MESS_TODAY: 'mess-today',
  MESS_WEEKLY: 'mess-weekly',
  MY_MESS_FEEDBACK: 'my-mess-feedback',
  ADMIN_MESS_ANALYTICS: 'admin-mess-analytics',
  STUDENTS: 'students',
  STUDENT: 'student',
  FACULTY: 'faculty',
  ROLES: 'roles',
  PERMISSION_MATRIX: 'permission-matrix',
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const NOTICE_PAGE_SIZE = 50;
export const COMPLAINT_RATE_LIMIT = 3;
