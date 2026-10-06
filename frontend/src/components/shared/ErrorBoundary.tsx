import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-8 text-center bg-card border border-border rounded-xl shadow-xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">
            Section Temporarily Unavailable
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
            An unexpected error occurred while loading this view. Please try reloading the page. If the problem persists, contact your system administrator.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={this.handleReset} className="gap-2 rounded-full">
              <RefreshCw className="h-3.5 w-3.5" />
              Reload Page
            </Button>
          </div>

          {isDev && this.state.error && (
            <details className="mt-6 text-left max-w-2xl w-full p-4 rounded-lg bg-muted text-xs font-mono border border-border overflow-auto max-h-48">
              <summary className="cursor-pointer font-semibold text-foreground mb-2 text-xs">
                Developer Diagnostics (Dev Mode Only)
              </summary>
              <div className="text-destructive font-medium mb-1">{this.state.error.message}</div>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
              )}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
