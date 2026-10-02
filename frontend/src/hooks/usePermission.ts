import { useAuth } from '@/context/AuthContext';
import type { PermissionCode } from '@/config/permissions';

export function usePermission() {
  const { hasPermission } = useAuth();
  
  return {
    can: (permission: PermissionCode | (string & {})) => hasPermission(permission),
    require: (permission: PermissionCode | (string & {})) => {
      if (!hasPermission(permission)) {
        throw new Error(`Missing permission: ${permission}`);
      }
    },
  };
}
