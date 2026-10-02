import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/types/api';
import { PAGES_CONFIG, type NavSection } from '@/config/pages';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  name: string;
  items: NavItem[];
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

const SECTION_ORDER: NavSection[] = [
  'Overview',
  'Campus Operations',
  'Administration',
  'Account',
];

/**
 * Derives navigation groups dynamically from the central PAGES_CONFIG registry.
 */
function buildNavGroupsForRole(role: UserRole): NavGroup[] {
  const rolePages = Object.values(PAGES_CONFIG).filter(
    (page) => page.allowedRoles.includes(role) && page.showInSidebar !== false
  );

  return SECTION_ORDER.map((section) => {
    const items = rolePages
      .filter((page) => page.section === section)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
      .map((page) => ({
        label: page.title,
        to: page.path,
        icon: page.icon,
      }));

    return {
      name: section,
      items,
    };
  }).filter((group) => group.items.length > 0);
}

export const NAV_GROUPS: Record<UserRole, NavGroup[]> = {
  student: buildNavGroupsForRole('student'),
  faculty: buildNavGroupsForRole('faculty'),
  admin: buildNavGroupsForRole('admin'),
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
