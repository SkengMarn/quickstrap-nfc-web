import React, { Component, ErrorInfo, ReactNode, ReactElement } from 'react';

type ErrorBoundaryFallbackProps = {
  error: Error;
  resetErrorBoundary: () => void;
  className?: string;
  style?: React.CSSProperties;
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactElement<ErrorBoundaryFallbackProps>;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { 
      hasError: true, 
      error: error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        // Clone the fallback element to ensure it has the correct styling
        const fallbackProps: ErrorBoundaryFallbackProps = {
          error: this.state.error,
          resetErrorBoundary: this.resetErrorBoundary,
          style: { ...this.props.fallback.props.style, color: 'black', fontWeight: 'bold' },
          className: `${this.props.fallback.props.className || ''} font-bold text-black`
        };
        return React.cloneElement(this.props.fallback, fallbackProps);
      }

      // Default fallback UI if none provided
      return (
        <div className="p-4 bg-gray-100 border border-gray-800 rounded-md">
          <h3 className="font-semibold leading-none tracking-tight text-lg font-bold text-black">Something went wrong.</h3>
          <details className="mt-2 text-sm text-black font-medium">
            <summary className="font-bold cursor-pointer">Error details</summary>
            <div className="mt-2 p-2 bg-white rounded">
              {this.state.error.toString()}
              <br />
              <pre className="mt-2 text-xs overflow-auto">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          </details>
          <button
            onClick={this.resetErrorBoundary}
            className="mt-3 px-4 py-2 bg-black text-white font-bold rounded hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
