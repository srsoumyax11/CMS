import type { LucideIcon } from 'lucide-react';
import type { UserType } from '@/types/api';
import { PAGES_CONFIG, type NavSection } from '@/config/pages';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
}

export interface NavGroup {
  name: string;
  items: NavItem[];
}

export const ROLE_ROUTES: Record<UserType, string> = {
  student: '/student',
  faculty: '/faculty',
  admin: '/admin',
  user: '/user',
  parent: '/parent',
  staff: '/admin',
};

export const ROLE_LABELS: Record<UserType, string> = {
  student: 'Student',
  faculty: 'Faculty',
  admin: 'Administrator',
  user: 'General User',
  parent: 'Parent',
  staff: 'Staff',
};

const SECTION_ORDER: NavSection[] = [
  'Overview',
  'Academic Management',
  'Campus Operations',
  'Campus Facilities',
  'Administration & System',
  'Account',
];

/**
 * Derives navigation groups dynamically from the central PAGES_CONFIG registry.
 */
function buildNavGroupsForRole(role: UserType): NavGroup[] {
  const rolePages = Object.values(PAGES_CONFIG).filter(
    (page) => page.allowedRoles && page.allowedRoles.includes(role) && page.showInSidebar !== false
  );

  return SECTION_ORDER.map((section) => {
    const items = rolePages
      .filter((page) => page.section === section)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map((page) => ({
        label: page.title,
        to: page.path,
        icon: page.icon,
        requiredPermissions: page.requiredPermissions,
      }));

    return {
      name: section,
      items,
    };
  }).filter((group) => group.items.length > 0);
}

export const NAV_GROUPS: Record<UserType, NavGroup[]> = {
  student: buildNavGroupsForRole('student'),
  faculty: buildNavGroupsForRole('faculty'),
  admin: buildNavGroupsForRole('admin'),
  user: buildNavGroupsForRole('user'),
  parent: buildNavGroupsForRole('parent'),
  staff: buildNavGroupsForRole('staff'),
};

/**
 * Resolves a readable breadcrumb label for a given path segment or route.
 */
export const getBreadcrumbLabel = (segment: string): string => {
  // Check if segment matches any page id or title
  const match = Object.values(PAGES_CONFIG).find((p) => {
    const lastPart = p.path.split('/').filter(Boolean).pop();
    return lastPart === segment || p.id.endsWith(`.${segment}`);
  });
  if (match) return match.title;

  // Segment overrides
  const overrides: Record<string, string> = {
    admin: 'Dashboard',
    student: 'Dashboard',
    faculty: 'Dashboard',
    new: 'New',
    create: 'Create',
    edit: 'Edit',
    permissions: 'Roles & Permissions',
  };
  if (overrides[segment]) return overrides[segment];

  // If the segment is a UUID, display "Details"
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(segment)) {
    return 'Details';
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1);
};
