import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_ROUTES } from '@/lib/navigation';

export function Unauthorized() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const fallback = role ? ROLE_ROUTES[role] : '/login';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-soft px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don't have permission to view this page. If you believe this is
          an error, contact your administrator.
        </p>
        <Button onClick={() => navigate(fallback, { replace: true })}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
