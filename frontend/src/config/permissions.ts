/**
 * Single Source of Truth for RBAC Permissions across the frontend.
 * 
 * Naming Convention:
 * - Asset: singular lowercase (e.g., 'notice', 'complaint', 'outpass', 'student_profile')
 * - Action: lowercase verb (e.g., 'create', 'view', 'list', 'edit', 'delete', 'approve', 'resolve')
 * - Full Code: `${asset}:${action}`
 */
export const PERMISSIONS = {
  STUDENT_PROFILE: {
    VIEW: 'student_profile:view',
    LIST: 'student_profile:list',
    CREATE: 'student_profile:create',
    EDIT: 'student_profile:edit',
    DELETE: 'student_profile:delete',
    APPROVE: 'student_profile:approve',
    REJECT: 'student_profile:reject',
  },
  FACULTY_PROFILE: {
    VIEW: 'faculty_profile:view',
    LIST: 'faculty_profile:list',
    CREATE: 'faculty_profile:create',
    EDIT: 'faculty_profile:edit',
    DELETE: 'faculty_profile:delete',
    APPROVE: 'faculty_profile:approve',
    REJECT: 'faculty_profile:reject',
  },
  ROLE: {
    VIEW: 'role:view',
    LIST: 'role:list',
    CREATE: 'role:create',
    EDIT: 'role:edit',
    DELETE: 'role:delete',
    APPROVE: 'role:approve',
    REJECT: 'role:reject',
  },
  NOTICE: {
    VIEW: 'notice:view',
    LIST: 'notice:list',
    CREATE: 'notice:create',
    EDIT: 'notice:edit',
    DELETE: 'notice:delete',
    APPROVE: 'notice:approve',
    REJECT: 'notice:reject',
  },
  COMPLAINT: {
    VIEW: 'complaint:view',
    LIST: 'complaint:list',
    CREATE: 'complaint:create',
    EDIT: 'complaint:edit',
    DELETE: 'complaint:delete',
    RESOLVE: 'complaint:resolve',
    ASSIGN: 'complaint:assign',
    VIEW_PRIVATE: 'complaint:view_private',
  },
  USER: {
    VIEW: 'user:view',
    LIST: 'user:list',
    EDIT: 'user:edit',
  },
  ATTENDANCE: {
    MARK: 'attendance:mark',
    VIEW: 'attendance:view',
  },
  MESS: {
    VIEW: 'mess:view',
    MANAGE: 'mess:manage',
    FEEDBACK: 'mess:feedback',
  },
  SYSTEM_SETTING: {
    MANAGE: 'system_setting:manage',
  },
  DEPARTMENT: {
    MANAGE: 'department:manage',
  },
} as const;

export type PermissionCode =
  | typeof PERMISSIONS.STUDENT_PROFILE[keyof typeof PERMISSIONS.STUDENT_PROFILE]
  | typeof PERMISSIONS.FACULTY_PROFILE[keyof typeof PERMISSIONS.FACULTY_PROFILE]
  | typeof PERMISSIONS.ROLE[keyof typeof PERMISSIONS.ROLE]
  | typeof PERMISSIONS.NOTICE[keyof typeof PERMISSIONS.NOTICE]
  | typeof PERMISSIONS.COMPLAINT[keyof typeof PERMISSIONS.COMPLAINT]
      | typeof PERMISSIONS.ATTENDANCE[keyof typeof PERMISSIONS.ATTENDANCE]
  | typeof PERMISSIONS.MESS[keyof typeof PERMISSIONS.MESS]
  | typeof PERMISSIONS.SYSTEM_SETTING[keyof typeof PERMISSIONS.SYSTEM_SETTING]
  | typeof PERMISSIONS.DEPARTMENT[keyof typeof PERMISSIONS.DEPARTMENT];
