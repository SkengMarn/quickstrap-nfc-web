import React, { Component, ErrorInfo, ReactNode, ReactElement } from 'react';
import { performHealthCheck, attemptRecovery, resetCircuitBreaker } from '../utils/selfHealing';

type ErrorBoundaryFallbackProps = {
  error: Error;
  resetErrorBoundary: () => void;
  className?: string;
  style?: React.CSSProperties;
  recovering?: boolean;
  recoveryAttempts?: number;
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactElement<ErrorBoundaryFallbackProps>;
  onReset?: () => void;
  enableAutoRecovery?: boolean; // Enable automatic recovery attempts
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  recovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private readonly maxAutoRecoveryAttempts = 2;
  private readonly recoveryDebounceMs = 5000; // Don't retry recovery within 5s

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recovering: false,
      recoveryAttempts: 0,
      lastRecoveryTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      error: error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Check if this looks like a database/RLS error
    const isDatabaseError = this.isDatabaseError(error);

    if (isDatabaseError && this.props.enableAutoRecovery !== false) {
      console.warn('[ErrorBoundary] Database error detected, attempting automatic recovery...');
      this.attemptAutoRecovery();
    }

    // Emit error event for monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-error', {
        detail: {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          isDatabaseError,
        }
      }));
    }
  }

  private isDatabaseError(error: Error): boolean {
    const errorString = error.message.toLowerCase();
    const databaseKeywords = [
      'database',
      'supabase',
      'query',
      'timeout',
      'rls',
      'organization',
      'connection',
      'postgresql',
    ];

    return databaseKeywords.some(keyword => errorString.includes(keyword));
  }

  private async attemptAutoRecovery(): Promise<void> {
    const { recoveryAttempts, lastRecoveryTime } = this.state;

    // Don't attempt recovery if we've tried too many times
    if (recoveryAttempts >= this.maxAutoRecoveryAttempts) {
      console.warn('[ErrorBoundary] Max auto-recovery attempts reached');
      return;
    }

    // Don't attempt recovery if we just tried
    const timeSinceLastRecovery = Date.now() - lastRecoveryTime;
    if (timeSinceLastRecovery < this.recoveryDebounceMs) {
      console.warn('[ErrorBoundary] Recovery debounce active');
      return;
    }

    this.setState({
      recovering: true,
      recoveryAttempts: recoveryAttempts + 1,
      lastRecoveryTime: Date.now(),
    });

    try {
      // Run health check
      const health = await performHealthCheck();

      if (!health.healthy) {
        // Attempt recovery
        const recovered = await attemptRecovery(health);

        if (recovered) {
          console.log('[ErrorBoundary] Auto-recovery successful, resetting error boundary');
          // Reset error boundary
          this.resetErrorBoundary();
          return;
        }
      }

      console.warn('[ErrorBoundary] Auto-recovery failed');
    } catch (recoveryError) {
      console.error('[ErrorBoundary] Error during recovery:', recoveryError);
    } finally {
      this.setState({ recovering: false });
    }
  }

  resetErrorBoundary = () => {
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      recovering: false,
    });

    // Call custom reset handler
    this.props.onReset?.();

    // Reload the page as last resort if max attempts reached
    if (this.state.recoveryAttempts >= this.maxAutoRecoveryAttempts) {
      console.log('[ErrorBoundary] Reloading page after max recovery attempts');
      window.location.reload();
    }
  };

  handleManualRecovery = async (): Promise<void> => {
    this.setState({ recovering: true });

    try {
      // Clear all caches
      localStorage.removeItem('currentOrganizationId');
      sessionStorage.clear();

      // Run health check
      await performHealthCheck();

      // Reset error boundary
      this.resetErrorBoundary();
    } catch (recoveryError) {
      console.error('[ErrorBoundary] Manual recovery failed:', recoveryError);
    } finally {
      this.setState({ recovering: false });
    }
  };

  render() {
    const { hasError, error, recovering, recoveryAttempts } = this.state;

    if (hasError && error) {
      if (this.props.fallback) {
        // Clone the fallback element with additional recovery props
        const fallbackProps: ErrorBoundaryFallbackProps = {
          error: error,
          resetErrorBoundary: this.resetErrorBoundary,
          recovering,
          recoveryAttempts,
          style: { ...this.props.fallback.props.style, color: 'black', fontWeight: 'bold' },
          className: `${this.props.fallback.props.className || ''} font-bold text-black`
        };
        return React.cloneElement(this.props.fallback, fallbackProps);
      }

      // Enhanced default fallback UI with recovery status
      return (
        <div className="p-4 bg-gray-100 border border-gray-800 rounded-md">
          <h3 className="font-semibold leading-none tracking-tight text-lg font-bold text-black">
            Something went wrong.
          </h3>

          {recovering && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800 font-medium">
                Attempting automatic recovery... ({recoveryAttempts}/{this.maxAutoRecoveryAttempts})
              </p>
            </div>
          )}

          {recoveryAttempts > 0 && !recovering && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800 font-medium">
                Auto-recovery attempts: {recoveryAttempts}/{this.maxAutoRecoveryAttempts}
              </p>
            </div>
          )}

          <details className="mt-2 text-sm text-black font-medium">
            <summary className="font-bold cursor-pointer">Error details</summary>
            <div className="mt-2 p-2 bg-white rounded">
              {error.toString()}
              <br />
              <pre className="mt-2 text-xs overflow-auto">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          </details>

          <div className="mt-3 flex gap-2">
            <button
              onClick={this.resetErrorBoundary}
              disabled={recovering}
              className="px-4 py-2 bg-black text-white font-bold rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Try Again
            </button>

            <button
              onClick={this.handleManualRecovery}
              disabled={recovering}
              className="px-4 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear Cache & Retry
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-600">
            If this problem persists, try clearing your browser cache or contact support.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
