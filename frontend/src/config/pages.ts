import {
  Megaphone,
  ClipboardList,
  CheckSquare,
  CalendarDays,
  UtensilsCrossed,
  BookOpen,
  Users,
  UserCog,
  ShieldCheck,
  LayoutDashboard,
  UserCircle,
  Settings,
  Building2,
  Filter,
  FileText,
  Landmark,
  Key,
  Receipt,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import type { UserType } from '@/types/api';

export type NavSection =
  | 'Overview'
  | 'Academic Management'
  | 'Campus Operations'
  | 'Campus Facilities'
  | 'Administration & System'
  | 'Account';

export interface PageMetadata {
  id: string;
  path: string;
  title: string;
  description: string;
  section: NavSection;
  icon: LucideIcon;
  allowedRoles?: UserType[];
  requiredPermissions?: string[];
  requiredPermission?: string;
  showInSidebar?: boolean;
  order?: number;
  parentPath?: string;
}

export const PAGES_CONFIG: Record<string, PageMetadata> = {
  // ================= ADMIN ROUTES =================
  'admin.dashboard': {
    id: 'admin.dashboard',
    path: '/admin',
    title: 'Dashboard',
    description: 'System-wide analytics, key metrics, and administration overview.',
    section: 'Overview',
    icon: LayoutDashboard,
    allowedRoles: ['admin', 'staff'],
    showInSidebar: true,
    order: 1,
  },
  'admin.notices': {
    id: 'admin.notices',
    path: '/admin/notices',
    title: 'Notices',
    description: 'Create, broadcast, and manage official campus announcements.',
    section: 'Overview',
    icon: Megaphone,
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['notice:list', 'notice:view'],
    showInSidebar: true,
    order: 2,
  },
  'admin.notices.new': {
    id: 'admin.notices.new',
    path: '/admin/notices/new',
    title: 'Create Notice',
    description: 'Publish a new announcement to students and faculty.',
    section: 'Overview',
    icon: Megaphone,
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['notice:list', 'notice:view'],
    showInSidebar: false,
    parentPath: '/admin/notices',
  },

  // --- Academic Management ---
  'admin.students': {
    id: 'admin.students',
    path: '/admin/students',
    title: 'Students',
    description: 'Manage student accounts, academic records, and enrollment verification.',
    section: 'Academic Management',
    icon: Users,
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['student_profile:list'],
    showInSidebar: true,
    order: 1,
  },
  'admin.departments': {
    id: 'admin.departments',
    path: '/admin/departments',
    title: 'Departments',
    description: 'Manage academic and administrative departments and department heads.',
    section: 'Academic Management',
    icon: Building2,
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['department:manage'],
    showInSidebar: true,
    order: 2,
  },
  'admin.courses': {
    id: 'admin.courses',
    path: '/admin/courses',
    title: 'Courses',
    description: 'Manage degree programs, curriculum frameworks, and durations.',
    section: 'Academic Management',
    icon: BookOpen,
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['department:manage'],
    showInSidebar: true,
    order: 3,
  },
  // --- Campus Operations ---
  'admin.role_applications': {
    id: 'admin.role_applications',
    path: '/admin/role-applications',
    title: 'Role Applications',
    description: 'Review and approve pending student, parent, faculty, and staff role requests.',
    section: 'Campus Operations',
    icon: UserCheck,
    allowedRoles: ['admin', 'staff'],
    showInSidebar: true,
    order: 1,
  },
  'admin.complaints': {
    id: 'admin.complaints',
    path: '/admin/complaints',
    title: 'Complaints',
    description: 'Review, triage, and resolve student and staff grievances.',
    section: 'Campus Operations',
    icon: ClipboardList,
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['complaint:list'],
    showInSidebar: true,
    order: 2,
  },
  // --- Campus Facilities ---
  // --- Administration & System ---
  'admin.users': {
    id: 'admin.users',
    path: '/admin/users',
    title: 'Faculty & Staff',
    description: 'Manage faculty profiles, department assignments, and administrators.',
    section: 'Administration & System',
    icon: UserCog,
    allowedRoles: ['admin', 'staff'],
    showInSidebar: true,
    order: 1,
  },
  'admin.permissions': {
    id: 'admin.permissions',
    path: '/admin/permissions',
    title: 'Roles & Permissions',
    description: 'Configure security roles and fine-grained access control permissions.',
    section: 'Administration & System',
    icon: ShieldCheck,
    allowedRoles: ['admin', 'staff'],
    showInSidebar: true,
    order: 2,
  },
  'admin.settings': {
    id: 'admin.settings',
    path: '/admin/settings',
    title: 'System Settings',
    description: 'Configure core global settings, policies, and environment parameters.',
    section: 'Administration & System',
    icon: Settings,
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['system_setting:manage'],
    showInSidebar: true,
    order: 3,
  },
  'admin.profile': {
    id: 'admin.profile',
    path: '/admin/profile',
    title: 'My Profile',
    description: 'Manage your administrator account security, credentials, and details.',
    section: 'Account',
    icon: UserCircle,
    allowedRoles: ['admin', 'staff'],
    showInSidebar: true,
    order: 1,
  },

  // ================= FACULTY ROUTES =================
  'faculty.dashboard': {
    id: 'faculty.dashboard',
    path: '/faculty',
    title: 'Faculty Dashboard',
    description: 'Welcome back. Overview of your lectures, notices, and departmental alerts.',
    section: 'Overview',
    icon: LayoutDashboard,
    allowedRoles: ['faculty'],
    showInSidebar: true,
    order: 1,
  },
  'faculty.notices': {
    id: 'faculty.notices',
    path: '/faculty/notices',
    title: 'Notices',
    description: 'View and publish notices for your courses and department.',
    section: 'Campus Operations',
    icon: Megaphone,
    allowedRoles: ['faculty'],
    requiredPermissions: ['notice:view'],
    showInSidebar: true,
    order: 2,
  },
  'faculty.notices.new': {
    id: 'faculty.notices.new',
    path: '/faculty/notices/new',
    title: 'Post Notice',
    description: 'Broadcast a notice to students.',
    section: 'Campus Operations',
    icon: Megaphone,
    allowedRoles: ['faculty'],
    requiredPermissions: ['notice:view'],
    showInSidebar: false,
    parentPath: '/faculty/notices',
  },
  'faculty.complaints': {
    id: 'faculty.complaints',
    path: '/faculty/complaints',
    title: 'Complaints',
    description: 'Track and address student grievances submitted to faculty.',
    section: 'Campus Operations',
    icon: ClipboardList,
    allowedRoles: ['faculty'],
    requiredPermissions: ['complaint:view'],
    showInSidebar: true,
    order: 3,
  },
  'faculty.attendance': {
    id: 'faculty.attendance',
    path: '/faculty/attendance',
    title: 'Attendance',
    description: 'Record class attendance and view student lecture percentages.',
    section: 'Campus Operations',
    icon: BookOpen,
    allowedRoles: ['faculty'],
    requiredPermissions: ['attendance:mark'],
    showInSidebar: true,
    order: 5,
  },
  'faculty.profile': {
    id: 'faculty.profile',
    path: '/faculty/profile',
    title: 'My Profile',
    description: 'Manage personal details, academic designation, and credentials.',
    section: 'Account',
    icon: UserCircle,
    allowedRoles: ['faculty'],
    showInSidebar: true,
    order: 10,
  },

  // ================= STUDENT ROUTES =================
  'student.dashboard': {
    id: 'student.dashboard',
    path: '/student',
    title: 'Student Dashboard',
    description: 'Welcome back. Overview of your classes, attendance, and campus updates.',
    section: 'Overview',
    icon: LayoutDashboard,
    allowedRoles: ['student'],
    showInSidebar: true,
    order: 1,
  },
  'student.notices': {
    id: 'student.notices',
    path: '/student/notices',
    title: 'Notices',
    description: 'Official campus announcements, academic notifications, and circulars.',
    section: 'Campus Operations',
    icon: Megaphone,
    allowedRoles: ['student'],
    requiredPermissions: ['notice:view'],
    showInSidebar: true,
    order: 2,
  },
  'student.complaints': {
    id: 'student.complaints',
    path: '/student/complaints',
    title: 'My Complaints',
    description: 'Submit grievances and track their review and resolution status.',
    section: 'Campus Operations',
    icon: ClipboardList,
    allowedRoles: ['student'],
    requiredPermissions: ['complaint:view'],
    showInSidebar: true,
    order: 3,
  },
  'student.complaints.new': {
    id: 'student.complaints.new',
    path: '/student/complaints/new',
    title: 'Submit Complaint',
    description: 'Lodge a new grievance regarding hostel, academic, or campus facilities.',
    section: 'Campus Operations',
    icon: ClipboardList,
    allowedRoles: ['student'],
    requiredPermissions: ['complaint:view'],
    showInSidebar: false,
    parentPath: '/student/complaints',
  },
  'student.attendance': {
    id: 'student.attendance',
    path: '/student/attendance',
    title: 'Attendance',
    description: 'Track your subject-wise lecture attendance and minimum requirements.',
    section: 'Campus Operations',
    icon: BookOpen,
    allowedRoles: ['student'],
    requiredPermissions: ['attendance:view'],
    showInSidebar: true,
    order: 6,
  },
  'student.profile': {
    id: 'student.profile',
    path: '/student/profile',
    title: 'My Profile',
    description: 'View and manage student profile, hostel room, and contact information.',
    section: 'Account',
    icon: UserCircle,
    allowedRoles: ['student'],
    showInSidebar: true,
    order: 10,
  },

  // ================= GENERAL USER & PARENT ROUTES =================
  'user.dashboard': {
    id: 'user.dashboard',
    path: '/user',
    title: 'Dashboard',
    description: 'Welcome. Select your campus role and submit verification details.',
    section: 'Overview',
    icon: LayoutDashboard,
    allowedRoles: ['user'],
    showInSidebar: true,
    order: 1,
  },
  'user.profile': {
    id: 'user.profile',
    path: '/user/profile',
    title: 'My Profile',
    description: 'Manage account security, credentials, and settings.',
    section: 'Account',
    icon: UserCircle,
    allowedRoles: ['user'],
    showInSidebar: true,
    order: 10,
  },
  'parent.profile': {
    id: 'parent.profile',
    path: '/parent',
    title: 'My Profile',
    description: 'View your profile and manage parent account details.',
    section: 'Overview',
    icon: UserCircle,
    allowedRoles: ['parent'],
    showInSidebar: true,
    order: 1,
  },
};

/**
 * Finds page metadata by route pathname.
 * Handles exact matches as well as parent/prefix route matches.
 */
export function getPageMetadata(pathname: string): PageMetadata | undefined {
  // 1. Exact match
  const exact = Object.values(PAGES_CONFIG).find((p) => p.path === pathname);
  if (exact) return exact;

  // 2. Remove trailing slash
  const cleanPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const cleanMatch = Object.values(PAGES_CONFIG).find((p) => p.path === cleanPath);
  if (cleanMatch) return cleanMatch;

  // 3. Match dynamic routes (e.g., /admin/notices/123 -> matches /admin/notices)
  const segments = cleanPath.split('/').filter(Boolean);
  while (segments.length > 1) {
    segments.pop();
    const subPath = '/' + segments.join('/');
    const subMatch = Object.values(PAGES_CONFIG).find((p) => p.path === subPath);
    if (subMatch) return subMatch;
  }

  return undefined;
}
