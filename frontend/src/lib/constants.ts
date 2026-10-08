export const API_ROUTES = {
  // Auth
  LOGIN: '/api/auth/login',
  REFRESH: '/api/auth/refresh',
  ME: '/api/auth/me',
  REGISTER: '/api/auth/register',
  TOKEN: '/api/auth/token',
  CHECK_USERNAME: '/api/auth/check-username',
  CHECK_EMAIL: '/api/auth/check-email',

  // Profile
  UPLOAD_PHOTO: '/api/users/me/photo',
  UPDATE_NAME: '/api/users/me/name',
  UPDATE_USER_ID: '/api/users/me/user-id',
  CHANGE_PASSWORD: '/api/users/me/password',
  CREATE_STUDENT_PROFILE: '/api/users/me/student-profile',
  UPDATE_PREFERENCES: '/api/users/me/preferences',
  REQUEST_EMAIL_UPDATE: '/api/users/me/email/request',
  VERIFY_EMAIL_UPDATE: '/api/users/me/email/verify',

  // Metadata
  COURSES: '/api/metadata/courses',
  DEPARTMENTS: '/api/metadata/departments',
  METADATA_ROLES: '/api/metadata/roles',
  PUBLIC_SETTINGS: '/api/metadata/settings/public',

  // Complaints (Student/Public)
  COMPLAINTS: '/api/complaints',
  MY_COMPLAINTS: '/api/complaints/mine',
  PUBLIC_COMPLAINTS: '/api/complaints/public',
  COMPLAINT_DETAIL: (id: string) => `/api/complaints/${id}`,
  COMPLAINT_CANCEL: (id: string) => `/api/complaints/${id}/cancel`,

  // Complaints (Admin/Faculty)
  ADMIN_COMPLAINTS: '/api/complaints',
  ADMIN_COMPLAINT_STATUS: (id: string) => `/api/complaints/${id}/status`,
  ADMIN_COMPLAINT_ASSIGN: (id: string) => `/api/complaints/${id}/assign`,
  ADMIN_COMPLAINTS_RECURRING: '/api/complaints/analytics/recurring',
  ADMIN_COMPLAINTS_AGEING: '/api/complaints/analytics/ageing',

  // Notices
  NOTICES: '/api/notices',
  NOTICE_DETAIL: (id: string) => `/api/notices/${id}`,
  NOTICE_READ: (id: string) => `/api/notices/${id}/read`,

  // Notifications
  NOTIFICATIONS: '/api/notifications',
  NOTIFICATION_READ: (id: string) => `/api/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: '/api/notifications/read-all',

  // Outpasses (Student)
  OUTPASSES: '/api/outpasses',
    OUTPASS_DETAIL: (id: string) => `/api/outpasses/${id}`,
  OUTPASS_CANCEL: (id: string) => `/api/outpasses/${id}/cancel`,

  // Outpasses (Admin)
    ADMIN_OUTPASS_DETAIL: (id: string) => `/api/outpasses/${id}`,
  ADMIN_OUTPASS_APPROVE: (id: string) => `/api/outpasses/${id}/approve`,
  ADMIN_OUTPASS_REJECT: (id: string) => `/api/outpasses/${id}/reject`,
  ADMIN_OUTPASS_DEPART: (id: string) => `/api/outpasses/${id}/depart`,
  ADMIN_OUTPASS_RETURN: (id: string) => `/api/outpasses/${id}/return`,


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
  ADMIN_MESS_MENU: '/api/mess/menu',
  ADMIN_MESS_ANALYTICS_TODAY: '/api/mess/analytics/today',

  // Admin: Students
  ADMIN_STUDENTS: '/api/admin/students',
  ADMIN_STUDENT_DETAIL: (id: string) => `/api/admin/students/${id}`,
  ADMIN_STUDENT_STATUS: (id: string) => `/api/admin/students/${id}/status`,

  // Admin: Roles & Settings
  ADMIN_ROLES: '/api/admin/roles',
  ADMIN_ROLE_PERMISSIONS: (id: string) => `/api/admin/roles/${id}/permissions`,
  ADMIN_USER_ROLES: (id: string) => `/api/admin/users/${id}/roles`,
  ADMIN_SETTINGS: '/api/admin/settings',

  // Admin: Faculty
  ADMIN_FACULTY: '/api/admin/faculty',
  ADMIN_FACULTY_DETAIL: (id: string) => `/api/admin/faculty/${id}`,

  // Admin: Admins
  ADMIN_ADMINS: '/api/admin/admins',

  // Admin: Onboarding
  ADMIN_ONBOARDING_STATUS: '/api/admin/onboarding-status',

  // Admin: Departments
  ADMIN_DEPARTMENTS: '/api/admin/departments',
  ADMIN_DEPARTMENT_DETAIL: (id: string) => `/api/admin/departments/${id}`,

  // Gate Pass & Parent Safety Matrix
  GATE_PASS_QUICK_EXIT: '/api/gate-pass/quick-exit',
  GATE_PASS_MY_ACTIVE: '/api/gate-pass/my-active',
  GATE_PASS_SCAN: '/api/gate-pass/scan',
  PARENT_SAFETY_DASHBOARD: '/api/gate-pass/parent-safety',

  // Roles & Permissions
  ROLES: '/api/roles',
  ROLE_TEMPLATES: '/api/roles/templates',
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
  DEPARTMENTS: 'departments',
  SYSTEM_SETTINGS: 'system-settings',
  RECURRING_ISSUES: 'recurring-issues',
  AGEING_COMPLAINTS: 'ageing-complaints',
  NOTICES: 'notices',
  NOTICE: 'notice',
    MY_GATE_PASS: 'my-gate-pass',
  PARENT_SAFETY: 'parent-safety',
    
    ATTENDANCE_ROSTER: 'attendance-roster',
  MY_ATTENDANCE_STATS: 'my-attendance-stats',
  MESS_TODAY: 'mess-today',
  MESS_WEEKLY: 'mess-weekly',
  MY_MESS_FEEDBACK: 'my-mess-feedback',
  ADMIN_MESS_ANALYTICS: 'admin-mess-analytics',
  STUDENTS: 'students',
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADMINS: 'admins',
  ROLES: 'roles',
  ROLE_TEMPLATES: 'role-templates',
  PERMISSION_MATRIX: 'permission-matrix',
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const NOTICE_PAGE_SIZE = 50;
export const COMPLAINT_RATE_LIMIT = 3;
