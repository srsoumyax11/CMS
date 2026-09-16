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

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Dashboard', to: '/student', icon: LayoutDashboard },
    { label: 'Notices', to: '/student/notices', icon: Megaphone },
    { label: 'My Complaints', to: '/student/complaints', icon: ClipboardList },
    { label: 'Outpasses', to: '/student/outpasses', icon: CheckSquare },
    { label: 'Timetable', to: '/student/timetable', icon: CalendarDays },
    { label: 'Mess Menu', to: '/student/mess', icon: UtensilsCrossed },
    { label: 'Attendance', to: '/student/attendance', icon: BookOpen },
    { label: 'Profile', to: '/student/profile', icon: UserCircle },
  ],
  faculty: [
    { label: 'Dashboard', to: '/faculty', icon: LayoutDashboard },
    { label: 'Notices', to: '/faculty/notices', icon: Megaphone },
    { label: 'Complaints', to: '/faculty/complaints', icon: ClipboardList },
    { label: 'Timetable', to: '/faculty/timetable', icon: CalendarDays },
    { label: 'Attendance', to: '/faculty/attendance', icon: BookOpen },
    { label: 'Profile', to: '/faculty/profile', icon: UserCircle },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
    { label: 'All Notices', to: '/admin/notices', icon: Megaphone },
    { label: 'All Complaints', to: '/admin/complaints', icon: ClipboardList },
    { label: 'Outpass Requests', to: '/admin/outpasses', icon: CheckSquare },
    { label: 'Timetable', to: '/admin/timetable', icon: CalendarDays },
    { label: 'Mess Management', to: '/admin/mess', icon: UtensilsCrossed },
    { label: 'User Management', to: '/admin/users', icon: Users },
    { label: 'Faculty', to: '/admin/faculty', icon: UserCog },
    { label: 'Roles', to: '/admin/permissions', icon: ShieldCheck },
    { label: 'Profile', to: '/admin/profile', icon: UserCircle },
  ],
};
