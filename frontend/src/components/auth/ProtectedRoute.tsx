import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ROLE_ROUTES } from '@/lib/navigation';
import { PAGES_CONFIG } from '@/config/pages';
import type { UserType } from '@/types/api';

interface ProtectedRouteProps {
  allowedRoles?: UserType[];
  requiredPermissions?: string[];
}

export function ProtectedRoute({ allowedRoles, requiredPermissions }: ProtectedRouteProps) {
  const { user, role, isLoading, hasPermission } = useAuth();
  const { pathname } = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;

  if (
    user.account_status === 'pending' &&
    role === 'student' &&
    user.academic_status === null
  ) {
    if (pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  } else {
    if (pathname === '/onboarding' && user.account_status !== 'revision') {
      return <Navigate to={role ? ROLE_ROUTES[role] : '/login'} replace />;
    }
  }

  // 1. Role Check (Fallback for high-level grouping)
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const fallback = role ? ROLE_ROUTES[role] : '/login';
    return <Navigate to={fallback} replace />;
  }

  // 2. Strict Permission Check
  let effectivePermissions = requiredPermissions;
  
  if (!effectivePermissions) {
    // Automatically infer permissions from PAGES_CONFIG based on current route
    const matchingPages = Object.values(PAGES_CONFIG)
      .filter((p) => pathname === p.path || pathname.startsWith(p.path + '/'))
      .sort((a, b) => b.path.length - a.path.length); // Most specific match first

    if (matchingPages.length > 0 && matchingPages[0].requiredPermissions) {
      effectivePermissions = matchingPages[0].requiredPermissions;
    }
  }

  if (effectivePermissions && effectivePermissions.length > 0) {
    const hasAnyPermission = effectivePermissions.some((perm) => hasPermission(perm));
    if (!hasAnyPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
