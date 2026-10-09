export const API_ROUTES = {
  // Auth & Profile
  LOGIN: '/api/auth/login',
  REFRESH: '/api/auth/refresh',
  ME: '/api/auth/me',
  REGISTER: '/api/auth/register',
  TOKEN: '/api/auth/token',
  CHECK_USERNAME: '/api/auth/check-username',
  CHECK_EMAIL: '/api/auth/check-email',

  // Profile Management
  UPLOAD_PHOTO: '/api/users/me/photo',
  UPDATE_NAME: '/api/users/me/name',
  CHANGE_PASSWORD: '/api/users/me/password',
  UPDATE_PREFERENCES: '/api/users/me/preferences',
  REQUEST_EMAIL_UPDATE: '/api/users/me/email/request',
  VERIFY_EMAIL_UPDATE: '/api/users/me/email/verify',
  CREATE_STUDENT_PROFILE: '/api/users/me/student-profile',

  // Role Applications & Onboarding
  APPLICATIONS: '/api/applications/',
  APPLICATION_DETAIL: (id: string) => `/api/applications/${id}`,
  CHECK_IDENTIFIER: '/api/applications/check-identifier',
  APPROVE_APPLICATION: (id: string) => `/api/applications/${id}/approve`,
  REJECT_APPLICATION: (id: string) => `/api/applications/${id}/reject`,

  // Metadata & System Settings
  METADATA_COURSES: '/api/metadata/courses',
  METADATA_DEPARTMENTS: '/api/metadata/departments',
  METADATA_ROLES: '/api/metadata/roles',
  PUBLIC_SETTINGS: '/api/settings/public',
  PUBLIC_SYSTEM_SETTINGS: '/api/settings/public',
  SYSTEM_SETTINGS: '/api/settings/',
  TEST_EMAIL: '/api/settings/test-email',

  // Complaints
  COMPLAINTS: '/api/complaints/',
  MY_COMPLAINTS: '/api/complaints/mine',
  PUBLIC_COMPLAINTS: '/api/complaints/public',
  COMPLAINT_DETAIL: (id: string) => `/api/complaints/${id}`,
  COMPLAINT_CANCEL: (id: string) => `/api/complaints/${id}/cancel`,
  ADMIN_COMPLAINT_STATUS: (id: string) => `/api/complaints/${id}/status`,
  ADMIN_COMPLAINT_ASSIGN: (id: string) => `/api/complaints/${id}/assign`,
  ADMIN_COMPLAINTS_RECURRING: '/api/complaints/analytics/recurring',
  ADMIN_COMPLAINTS_AGEING: '/api/complaints/analytics/ageing',

  // Notices
  NOTICES: '/api/notices/',
  NOTICE_DETAIL: (id: string) => `/api/notices/${id}`,
  NOTICE_READ: (id: string) => `/api/notices/${id}/read`,

  // Notifications
  NOTIFICATIONS: '/api/notifications/',
  NOTIFICATION_READ: (id: string) => `/api/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: '/api/notifications/read-all',

  // Gate Pass
  GATE_PASSES: '/api/gate-passes/',
  GATE_PASS_DETAIL: (id: string) => `/api/gate-passes/${id}`,
  GATE_PASS_CANCEL: (id: string) => `/api/gate-passes/${id}/cancel`,
  GATE_PASS_APPROVE: (id: string) => `/api/gate-passes/${id}/approve`,
  GATE_PASS_REJECT: (id: string) => `/api/gate-passes/${id}/reject`,
  GATE_PASS_SCAN: '/api/gate-passes/scan',

  // Documents
  DOCUMENT_TYPES: '/api/documents/types/',
  DOCUMENT_REQUESTS: '/api/documents/requests/',
  DOCUMENT_REQUEST_DETAIL: (id: string) => `/api/documents/requests/${id}`,
  DOCUMENT_REQUEST_APPROVE: (id: string) => `/api/documents/requests/${id}/approve`,
  DOCUMENT_VERIFY: (code: string) => `/api/documents/verify/${code}`,

  // Placements
  PLACEMENT_NOTICES: '/api/placements/notices/',
  PLACEMENT_NOTICE_DETAIL: (id: string) => `/api/placements/notices/${id}`,
  PLACEMENT_APPLY: (id: string) => `/api/placements/notices/${id}/apply`,
  PLACEMENT_APPLICATIONS: (id: string) => `/api/placements/notices/${id}/applications`,

  // Academic Management
  DEPARTMENTS: '/api/academic/departments/',
  COURSES: '/api/academic/courses/',
  TERMS: '/api/academic/terms/',
  SUBJECTS: '/api/academic/subjects/',
  CLASS_GROUPS: '/api/academic/class-groups/',
  HOLIDAYS: '/api/academic/holidays/',

  // Hostels
  HOSTELS: '/api/hostels/',
  HOSTEL_ROOMS: (id: string) => `/api/hostels/${id}/rooms`,
  HOSTEL_ALLOCATE: '/api/hostels/allocate',

  // Timetable
  TIMETABLE_SLOTS: '/api/timetable/slots/',
  TIMETABLE_EXCEPTIONS: '/api/timetable/exceptions/',
  MY_SCHEDULE: '/api/timetable/mine',

  // Attendance
  ATTENDANCE_SESSIONS: '/api/attendance/sessions/',
  ATTENDANCE_RECORDS: '/api/attendance/records/',
  MY_ATTENDANCE_STATS: '/api/attendance/mine/stats',

  // Silent Mode
  SILENT_SETTINGS: '/api/silent/settings',
  SILENT_SCHEDULE: '/api/silent/schedule',
  SILENT_ICAL_FEED: '/api/silent/ical.ics',

  // Campus Map
  MAP_LOCATIONS: '/api/map/locations',
  MAP_PATHS: '/api/map/paths',
  MAP_ROUTE: '/api/map/route',

  // AI Assistant
  AI_CONVERSATIONS: '/api/ai/conversations',
  AI_CONVERSATION_MESSAGES: (id: string) => `/api/ai/conversations/${id}/messages`,

  // Admin & RBAC
  ADMIN_USERS: '/api/admin/users/',
  ADMIN_USER_DETAIL: (id: string) => `/api/admin/users/${id}`,
  ROLES: '/api/roles/',
  ROLE_DETAIL: (id: string) => `/api/roles/${id}`,
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
  STAFF: 'staff',
  PARENT: 'parent',
} as const;

export const USER_STATUS = {
  BASE: 'base',
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
} as const;

export const AUTH_EVENTS = {
  UNAUTHORIZED: 'auth:unauthorized',
  LOGOUT: 'auth:logout',
  MAINTENANCE: 'system:maintenance',
} as const;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const QUERY_KEYS = {
  ME: 'me',
  COURSES: 'courses',
  DEPARTMENTS: 'departments',
  ROLES: 'roles',
  APPLICATIONS: 'applications',
  STUDENTS: 'students',
  FACULTY: 'faculty',
  ADMINS: 'admins',
  MY_COMPLAINTS: 'my-complaints',
  PUBLIC_COMPLAINTS: 'public-complaints',
  COMPLAINT: 'complaint',
  ADMIN_COMPLAINTS: 'admin-complaints',
  NOTICES: 'notices',
  NOTICE: 'notice',
  NOTIFICATIONS: 'notifications',
  GATE_PASSES: 'gate-passes',
  MY_GATE_PASSES: 'my-gate-passes',
  DOCUMENT_TYPES: 'document-types',
  DOCUMENT_REQUESTS: 'document-requests',
  PLACEMENT_NOTICES: 'placement-notices',
  HOSTELS: 'hostels',
  HOSTEL_ROOMS: 'hostel-rooms',
  MY_HOSTEL_ALLOCATION: 'my-hostel-allocation',
  TERMS: 'terms',
  CLASS_GROUPS: 'class-groups',
  SUBJECTS: 'subjects',
  HOLIDAYS: 'holidays',
  TIMETABLE: 'timetable',
  TIMETABLE_SLOTS: 'timetable-slots',
  TIMETABLE_EXCEPTIONS: 'timetable-exceptions',
  MY_SCHEDULE: 'my-schedule',
  ATTENDANCE: 'attendance',
  SILENT_SETTINGS: 'silent-settings',
  SILENT_SCHEDULE: 'silent-schedule',
  MAP_LOCATIONS: 'map-locations',
  MAP_ROUTE: 'map-route',
  AI_CONVERSATIONS: 'ai-conversations',
  SYSTEM_SETTINGS: 'system-settings',
  ADMIN_USERS: 'admin-users',
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const NOTICE_PAGE_SIZE = 50;
