/**
 * Enhanced Empty States & Loading Experiences
 * Perfect 10/10 UI/UX Implementation
 */

import {
    AlertCircle,
    BarChart3,
    Calendar,
    CheckCircle,
    FileText,
    RefreshCw,
    Search,
    Settings,
    Users,
    Wifi,
    WifiOff
} from 'lucide-react';
import React from 'react';
import { Animate, Stagger } from '../../utils/animations';

// ============================================================================
// LOADING SKELETON COMPONENTS
// ============================================================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  animated = true
}) => {
  return (
    <div
      className={`bg-gray-200 rounded ${animated ? 'animate-pulse' : ''} ${className}`}
      style={{ width, height }}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton width={48} height={48} className="rounded-full" />
      <div className="flex-1">
        <Skeleton height={20} className="mb-2" />
        <Skeleton height={16} width="60%" />
      </div>
    </div>
    <Skeleton height={16} className="mb-2" />
    <Skeleton height={16} width="80%" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
    {/* Header */}
    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
      <div className="flex space-x-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} height={16} width="20%" />
        ))}
      </div>
    </div>

    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
        <div className="flex space-x-4">
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={colIndex} height={16} width="20%" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
    <div className="flex items-center justify-between mb-6">
      <Skeleton height={24} width={200} />
      <Skeleton height={32} width={100} />
    </div>

    <div className="space-y-4">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton width={80} height={16} />
          <Skeleton height={20} width={`${Math.random() * 60 + 20}%`} />
          <Skeleton width={40} height={16} />
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// ENHANCED LOADING STATES
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = '#3b82f6',
  className = ''
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <svg className="animate-spin" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeDasharray="60"
          strokeDashoffset="60"
          className="opacity-25"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeDasharray="60"
          strokeDashoffset="15"
          className="opacity-75"
        />
      </svg>
    </div>
  );
};

interface LoadingDotsProps {
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ className = '' }) => (
  <div className={`flex space-x-1 ${className}`}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"
        style={{
          animationDelay: `${i * 0.2}s`,
          animationDuration: '1s'
        }}
      />
    ))}
  </div>
);

interface LoadingProgressProps {
  progress: number;
  label?: string;
  className?: string;
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({
  progress,
  label,
  className = ''
}) => (
  <div className={`w-full ${className}`}>
    {label && (
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
      </div>
    )}
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

// ============================================================================
// EMPTY STATE COMPONENTS
// ============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => (
  <Animate animation="fadeInUp">
    <div className={`text-center py-12 px-6 ${className}`}>
      {icon && (
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={`inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors ${
            action.variant === 'primary'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  </Animate>
);

// ============================================================================
// SPECIFIC EMPTY STATES
// ============================================================================

export const EmptyEvents: React.FC<{ onCreateEvent: () => void }> = ({ onCreateEvent }) => (
  <EmptyState
    icon={<Calendar className="w-8 h-8 text-gray-400" />}
    title="No events yet"
    description="Create your first event to start managing wristbands and check-ins."
    action={{
      label: "Create Event",
      onClick: onCreateEvent,
      variant: "primary"
    }}
  />
);

export const EmptyCheckins: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <EmptyState
    icon={<Users className="w-8 h-8 text-gray-400" />}
    title="No check-ins found"
    description="Check-ins will appear here once people start scanning their wristbands."
    action={{
      label: "Refresh",
      onClick: onRefresh,
      variant: "secondary"
    }}
  />
);

export const EmptySearch: React.FC<{ onClearSearch: () => void }> = ({ onClearSearch }) => (
  <EmptyState
    icon={<Search className="w-8 h-8 text-gray-400" />}
    title="No results found"
    description="Try adjusting your search criteria or filters to find what you're looking for."
    action={{
      label: "Clear Search",
      onClick: onClearSearch,
      variant: "secondary"
    }}
  />
);

export const EmptyAnalytics: React.FC<{ onGenerateReport: () => void }> = ({ onGenerateReport }) => (
  <EmptyState
    icon={<BarChart3 className="w-8 h-8 text-gray-400" />}
    title="No analytics data"
    description="Analytics will be available once you have events with check-in data."
    action={{
      label: "Generate Report",
      onClick: onGenerateReport,
      variant: "primary"
    }}
  />
);

export const EmptyReports: React.FC<{ onCreateReport: () => void }> = ({ onCreateReport }) => (
  <EmptyState
    icon={<FileText className="w-8 h-8 text-gray-400" />}
    title="No reports yet"
    description="Create your first report to analyze event data and generate insights."
    action={{
      label: "Create Report",
      onClick: onCreateReport,
      variant: "primary"
    }}
  />
);

// ============================================================================
// ERROR STATES
// ============================================================================

interface ErrorStateProps {
  title: string;
  description: string;
  error?: Error;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  error,
  onRetry,
  className = ''
}) => (
  <Animate animation="fadeInUp">
    <div className={`text-center py-12 px-6 ${className}`}>
      <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 max-w-sm mx-auto">{description}</p>
      {error && (
        <details className="text-left max-w-md mx-auto mb-4">
          <summary className="text-sm text-gray-500 cursor-pointer">Technical Details</summary>
          <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-50 rounded overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      )}
    </div>
  </Animate>
);

// ============================================================================
// SUCCESS STATES
// ============================================================================

interface SuccessStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title,
  description,
  action,
  className = ''
}) => (
  <Animate animation="scaleIn">
    <div className={`text-center py-12 px-6 ${className}`}>
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  </Animate>
);

// ============================================================================
// CONNECTION STATES
// ============================================================================

interface ConnectionStateProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  className?: string;
}

export const ConnectionState: React.FC<ConnectionStateProps> = ({
  status,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-5 h-5 text-green-600" />,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />,
          text: 'Connecting...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-5 h-5 text-gray-600" />,
          text: 'Disconnected',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          text: 'Connection Error',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color} ${className}`}>
      {config.icon}
      <span className="ml-2">{config.text}</span>
    </div>
  );
};

// ============================================================================
// SYSTEM STATUS INDICATOR
// ============================================================================

interface SystemStatusProps {
  status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  className?: string;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  status,
  className = ''
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          text: 'All Systems Operational',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          text: 'Minor Issues Detected',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        };
      case 'critical':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          text: 'Critical Issues Detected',
          color: 'text-red-600',
          bgColor: 'bg-red-100'
        };
      case 'maintenance':
        return {
          icon: <Settings className="w-5 h-5 text-blue-600" />,
          text: 'System Maintenance',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color} ${className}`}>
      {config.icon}
      <span className="ml-2">{config.text}</span>
    </div>
  );
};

// ============================================================================
// LOADING OVERLAY
// ============================================================================

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  progress,
  className = ''
}) => {
  if (!isLoading) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
          {progress !== undefined && (
            <LoadingProgress progress={progress} className="mt-4" />
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STAGGERED LOADING
// ============================================================================

interface StaggeredLoadingProps {
  items: number;
  renderItem: (index: number) => React.ReactNode;
  className?: string;
}

export const StaggeredLoading: React.FC<StaggeredLoadingProps> = ({
  items,
  renderItem,
  className = ''
}) => (
  <Stagger animation="fadeInUp" className={className}>
    {Array.from({ length: items }, (_, index) => renderItem(index))}
  </Stagger>
);

export default {
  // Skeletons
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,

  // Loading states
  LoadingSpinner,
  LoadingDots,
  LoadingProgress,
  LoadingOverlay,

  // Empty states
  EmptyState,
  EmptyEvents,
  EmptyCheckins,
  EmptySearch,
  EmptyAnalytics,
  EmptyReports,

  // Error states
  ErrorState,

  // Success states
  SuccessState,

  // Connection states
  ConnectionState,
  SystemStatus,

  // Staggered loading
  StaggeredLoading
};



