import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 bg-[var(--zd-error-soft)] border border-[var(--zd-error)]/25 rounded-lg text-[var(--zd-error)] font-mono text-sm overflow-auto max-h-[80vh]">
          <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
          <div className="mb-4">
            <strong>Error:</strong> {this.state.error && this.state.error.toString()}
          </div>
          <div>
            <strong>Component Stack:</strong>
            <pre className="whitespace-pre-wrap mt-2">{this.state.errorInfo?.componentStack}</pre>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="px-4 py-2 bg-[var(--zd-error)]/15 text-[var(--zd-error)] rounded-md font-medium hover:bg-[var(--zd-error)]/25 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-[var(--zd-surface)] text-[var(--zd-text-primary)] border border-[var(--zd-border)] rounded-md font-medium hover:bg-[var(--zd-surface-raised)] transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
