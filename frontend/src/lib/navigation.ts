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
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/api';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const ROLE_ROUTES: Record<UserRole, string> = {
  student: '/student',
  faculty: '/faculty',
  admin: '/admin',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  faculty: 'Faculty',
  admin: 'Administrator',
};

export interface NavGroup {
  name: string;
  items: NavItem[];
}

export const NAV_GROUPS: Record<UserRole, NavGroup[]> = {
  student: [
    {
      name: 'Overview',
      items: [
        { label: 'Dashboard', to: '/student', icon: LayoutDashboard },
      ]
    },
    {
      name: 'Campus Operations',
      items: [
        { label: 'Notices', to: '/student/notices', icon: Megaphone },
        { label: 'My Complaints', to: '/student/complaints', icon: ClipboardList },
        { label: 'Outpasses', to: '/student/outpasses', icon: CheckSquare },
        { label: 'Timetable', to: '/student/timetable', icon: CalendarDays },
        { label: 'Mess Menu', to: '/student/mess', icon: UtensilsCrossed },
        { label: 'Attendance', to: '/student/attendance', icon: BookOpen },
      ]
    },
    {
      name: 'Account',
      items: [
        { label: 'Profile', to: '/student/profile', icon: UserCircle },
      ]
    }
  ],
  faculty: [
    {
      name: 'Overview',
      items: [
        { label: 'Dashboard', to: '/faculty', icon: LayoutDashboard },
      ]
    },
    {
      name: 'Campus Operations',
      items: [
        { label: 'Notices', to: '/faculty/notices', icon: Megaphone },
        { label: 'Complaints', to: '/faculty/complaints', icon: ClipboardList },
        { label: 'Timetable', to: '/faculty/timetable', icon: CalendarDays },
        { label: 'Attendance', to: '/faculty/attendance', icon: BookOpen },
      ]
    },
    {
      name: 'Account',
      items: [
        { label: 'Profile', to: '/faculty/profile', icon: UserCircle },
      ]
    }
  ],
  admin: [
    {
      name: 'Overview',
      items: [
        { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
      ]
    },
    {
      name: 'Campus Operations',
      items: [
        { label: 'Notices', to: '/admin/notices', icon: Megaphone },
        { label: 'Complaints', to: '/admin/complaints', icon: ClipboardList },
        { label: 'Outpass Requests', to: '/admin/outpasses', icon: CheckSquare },
        { label: 'Timetable', to: '/admin/timetable', icon: CalendarDays },
        { label: 'Mess Management', to: '/admin/mess', icon: UtensilsCrossed },
      ]
    },
    {
      name: 'Administration',
      items: [
        { label: 'User Management', to: '/admin/users', icon: Users },
        { label: 'Faculty', to: '/admin/faculty', icon: UserCog },
        { label: 'Roles', to: '/admin/permissions', icon: ShieldCheck },
        { label: 'Courses', to: '/admin/courses', icon: BookOpen },
        { label: 'Departments', to: '/admin/departments', icon: Settings },
        { label: 'System Settings', to: '/admin/settings', icon: Settings },
      ]
    },
    {
      name: 'Account',
      items: [
        { label: 'Profile', to: '/admin/profile', icon: UserCircle },
      ]
    }
  ]
};

// Global Configuration for Route-to-Title Breadcrumb Mapping
export const BREADCRUMB_CONFIG: Record<string, string> = {
  'admin': 'Dashboard',
  'student': 'Dashboard',
  'faculty': 'Dashboard',
  
  'notices': 'Notices',
  'create': 'Create',
  'edit': 'Edit',
  
  'complaints': 'Complaints',
  'outpasses': 'Outpasses',
  'timetable': 'Timetable',
  'mess': 'Mess Menu',
  'attendance': 'Attendance',
  
  'users': 'User Management',
  'permissions': 'Roles & Permissions',
  'profile': 'Profile',
};

export const getBreadcrumbLabel = (segment: string): string => {
  if (BREADCRUMB_CONFIG[segment]) return BREADCRUMB_CONFIG[segment];
  
  // If the segment is a UUID, display a cleaner label instead of the raw ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(segment)) {
    return 'Details';
  }
  
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};
