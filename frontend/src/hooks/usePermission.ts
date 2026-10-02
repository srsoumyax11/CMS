import { useAuth } from '@/context/AuthContext';

export function usePermission() {
  const { hasPermission } = useAuth();
  
  return {
    can: (permission: string) => hasPermission(permission),
    require: (permission: string) => {
      if (!hasPermission(permission)) {
        throw new Error(`Missing permission: ${permission}`);
      }
    },
  };
}
