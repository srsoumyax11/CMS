import { type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  icon?: ReactNode;
  error?: unknown;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
  icon,
  error,
}: ErrorStateProps) {
  const isForbidden = (error as Error & { status?: number })?.status === 403;

  const displayTitle = isForbidden ? 'Permission Denied' : title;
  const displayDescription = isForbidden 
    ? 'You do not have permission to view this content. Your account may still be pending approval or restricted.' 
    : description;
  const displayIcon = isForbidden ? <Lock className="h-6 w-6" /> : (icon ?? <AlertCircle className="h-6 w-6" />);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        {displayIcon}
      </div>
      <h3 className="text-base font-semibold text-foreground">{displayTitle}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{displayDescription}</p>
      {onRetry && !isForbidden && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
