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
        <div className="p-8 m-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 font-mono text-sm overflow-auto max-h-[80vh]">
          <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
          <div className="mb-4">
            <strong>Error:</strong> {this.state.error && this.state.error.toString()}
          </div>
          <div>
            <strong>Component Stack:</strong>
            <pre className="whitespace-pre-wrap mt-2">{this.state.errorInfo?.componentStack}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
