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
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/api';

export type NavSection = 'Overview' | 'Campus Operations' | 'Administration' | 'Account';

export interface PageMetadata {
  id: string;
  path: string;
  title: string;
  description: string;
  section: NavSection;
  icon: LucideIcon;
  allowedRoles: UserRole[];
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
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 1,
  },
  'admin.notices': {
    id: 'admin.notices',
    path: '/admin/notices',
    title: 'Notices',
    description: 'Create, broadcast, and manage official campus announcements.',
    section: 'Campus Operations',
    icon: Megaphone,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 2,
  },
  'admin.notices.new': {
    id: 'admin.notices.new',
    path: '/admin/notices/new',
    title: 'Create Notice',
    description: 'Publish a new announcement to students and faculty.',
    section: 'Campus Operations',
    icon: Megaphone,
    allowedRoles: ['admin'],
    showInSidebar: false,
    parentPath: '/admin/notices',
  },
  'admin.complaints': {
    id: 'admin.complaints',
    path: '/admin/complaints',
    title: 'Complaints',
    description: 'Review, triage, and resolve student and staff grievances.',
    section: 'Campus Operations',
    icon: ClipboardList,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 3,
  },
  'admin.outpasses': {
    id: 'admin.outpasses',
    path: '/admin/outpasses',
    title: 'Outpass Requests',
    description: 'Manage and approve student hostel gate passes and exit requests.',
    section: 'Campus Operations',
    icon: CheckSquare,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 4,
  },
  'admin.timetable': {
    id: 'admin.timetable',
    path: '/admin/timetable',
    title: 'Timetable',
    description: 'Manage class schedules, department slots, and room allocations.',
    section: 'Campus Operations',
    icon: CalendarDays,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 5,
  },
  'admin.attendance': {
    id: 'admin.attendance',
    path: '/admin/attendance',
    title: 'Attendance Overview',
    description: 'Monitor student lecture attendance percentages and defaulters.',
    section: 'Campus Operations',
    icon: BookOpen,
    allowedRoles: ['admin'],
    showInSidebar: false,
  },
  'admin.mess': {
    id: 'admin.mess',
    path: '/admin/mess',
    title: 'Mess Management',
    description: 'Manage meal schedules, mess menus, and student food ratings.',
    section: 'Campus Operations',
    icon: UtensilsCrossed,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 6,
  },
  'admin.students': {
    id: 'admin.students',
    path: '/admin/students',
    title: 'Students',
    description: 'Manage student accounts, academic records, and enrollment verification.',
    section: 'Administration',
    icon: Users,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 10,
  },
  'admin.users': {
    id: 'admin.users',
    path: '/admin/users',
    title: 'Faculty & Staff',
    description: 'Manage faculty profiles, department assignments, and administrators.',
    section: 'Administration',
    icon: UserCog,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 11,
  },
  'admin.permissions': {
    id: 'admin.permissions',
    path: '/admin/permissions',
    title: 'Roles & Permissions',
    description: 'Configure security roles and fine-grained access control permissions.',
    section: 'Administration',
    icon: ShieldCheck,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 12,
  },
  'admin.courses': {
    id: 'admin.courses',
    path: '/admin/courses',
    title: 'Courses',
    description: 'Manage degree programs, curriculum frameworks, and durations.',
    section: 'Administration',
    icon: BookOpen,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 13,
  },
  'admin.departments': {
    id: 'admin.departments',
    path: '/admin/departments',
    title: 'Departments',
    description: 'Manage academic and administrative departments and department heads.',
    section: 'Administration',
    icon: Building2,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 14,
  },
  'admin.settings': {
    id: 'admin.settings',
    path: '/admin/settings',
    title: 'System Settings',
    description: 'Configure core global settings, policies, and environment parameters.',
    section: 'Administration',
    icon: Settings,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 15,
  },
  'admin.profile': {
    id: 'admin.profile',
    path: '/admin/profile',
    title: 'My Profile',
    description: 'Manage your administrator account security, credentials, and details.',
    section: 'Account',
    icon: UserCircle,
    allowedRoles: ['admin'],
    showInSidebar: true,
    order: 20,
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
    showInSidebar: true,
    order: 3,
  },
  'faculty.timetable': {
    id: 'faculty.timetable',
    path: '/faculty/timetable',
    title: 'Timetable',
    description: 'View your assigned lecture schedule and weekly teaching slots.',
    section: 'Campus Operations',
    icon: CalendarDays,
    allowedRoles: ['faculty'],
    showInSidebar: true,
    order: 4,
  },
  'faculty.attendance': {
    id: 'faculty.attendance',
    path: '/faculty/attendance',
    title: 'Attendance',
    description: 'Record class attendance and view student lecture percentages.',
    section: 'Campus Operations',
    icon: BookOpen,
    allowedRoles: ['faculty'],
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
    showInSidebar: false,
    parentPath: '/student/complaints',
  },
  'student.outpasses': {
    id: 'student.outpasses',
    path: '/student/outpasses',
    title: 'Outpasses',
    description: 'Apply for hostel leave and view approval status for campus exit.',
    section: 'Campus Operations',
    icon: CheckSquare,
    allowedRoles: ['student'],
    showInSidebar: true,
    order: 4,
  },
  'student.outpasses.new': {
    id: 'student.outpasses.new',
    path: '/student/outpasses/new',
    title: 'Apply for Outpass',
    description: 'Submit a new leave and campus exit request with destination details.',
    section: 'Campus Operations',
    icon: CheckSquare,
    allowedRoles: ['student'],
    showInSidebar: false,
    parentPath: '/student/outpasses',
  },
  'student.timetable': {
    id: 'student.timetable',
    path: '/student/timetable',
    title: 'Timetable',
    description: 'View your weekly academic lecture and laboratory schedule.',
    section: 'Campus Operations',
    icon: CalendarDays,
    allowedRoles: ['student'],
    showInSidebar: true,
    order: 5,
  },
  'student.attendance': {
    id: 'student.attendance',
    path: '/student/attendance',
    title: 'Attendance',
    description: 'Track your subject-wise lecture attendance and minimum requirements.',
    section: 'Campus Operations',
    icon: BookOpen,
    allowedRoles: ['student'],
    showInSidebar: true,
    order: 6,
  },
  'student.mess': {
    id: 'student.mess',
    path: '/student/mess',
    title: 'Mess Menu',
    description: 'Daily and weekly hostel meal menus and dining timings.',
    section: 'Campus Operations',
    icon: UtensilsCrossed,
    allowedRoles: ['student'],
    showInSidebar: true,
    order: 7,
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
