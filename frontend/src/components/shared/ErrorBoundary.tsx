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
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
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

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
          </p>
          <div className="flex gap-2">
            <Button onClick={this.handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-6 text-left max-w-2xl w-full p-4 rounded-lg bg-muted text-xs font-mono overflow-auto max-h-60 border">
              <summary className="cursor-pointer font-bold text-foreground mb-2">Component Stack Trace</summary>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
