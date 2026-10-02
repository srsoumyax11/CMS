import type { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import type { PermissionCode } from '@/config/permissions';

interface PermissionGuardProps {
  permission: PermissionCode | (string & {});
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { can } = usePermission();

  if (can(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
