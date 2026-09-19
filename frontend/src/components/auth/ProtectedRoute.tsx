import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ROLE_ROUTES } from '@/lib/navigation';
import type { UserRole } from '@/types/api';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();
  const { pathname } = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;

  // Check if they are a completely new pending student missing academic details.
  // They MUST go to onboarding first.
  if (
    user.account_status === 'pending' &&
    role === 'student' &&
    user.academic_status === null
  ) {
    if (pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  } else {
    // Everyone else (including revision, suspended, rejected) can enter the dashboard.
    // They will just see banners and permission denied errors.
    if (pathname === '/onboarding' && user.account_status !== 'revision') {
      // Active users shouldn't be on onboarding
      return <Navigate to={role ? ROLE_ROUTES[role] : '/login'} replace />;
    }
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const fallback = role ? ROLE_ROUTES[role] : '/login';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
