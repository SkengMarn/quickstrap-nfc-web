/**
 * Layout Safety Component
 * Prevents overlapping elements and ensures proper z-index management
 */

import React, { useEffect, useRef } from 'react';
import { LayoutMonitor, LayoutSafety, OverlapPrevention, ResponsiveLayoutFixes } from '@/utils/layoutSafety';

interface LayoutSafetyProviderProps {
  children: React.ReactNode;
  enableMonitoring?: boolean;
  enableAutoFix?: boolean;
}

export const LayoutSafetyProvider: React.FC<LayoutSafetyProviderProps> = ({
  children,
  enableMonitoring = true,
  enableAutoFix = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (enableMonitoring) {
      LayoutMonitor.startMonitoring();
    }

    if (enableAutoFix) {
      // Initial layout fixes
      ResponsiveLayoutFixes.fixMobileLayout();
      ResponsiveLayoutFixes.fixTabletLayout();
      ResponsiveLayoutFixes.fixDesktopLayout();
      LayoutSafety.preventContentHiding();

      // Fix overlaps
      OverlapPrevention.fixOverlaps();
    }

    // Cleanup
    return () => {
      // Any cleanup needed
    };
  }, [enableMonitoring, enableAutoFix]);

  return (
    <div ref={containerRef} className="layout-safe">
      {children}
    </div>
  );
};

// ============================================================================
// SAFE MODAL COMPONENT
// ============================================================================

interface SafeModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const SafeModal: React.FC<SafeModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Ensure modal is properly positioned
      LayoutSafety.ensureSpacing(modalRef.current, 16);
    }
  }, [isOpen]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-safe">
      <div className="modal-content-safe">
        <div className={`bg-white rounded-lg shadow-xl w-full ${getSizeClasses()} ${className}`}>
          {title && (
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
          )}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SAFE DROPDOWN COMPONENT
// ============================================================================

interface SafeDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const SafeDropdown: React.FC<SafeDropdownProps> = ({
  isOpen,
  onClose,
  children,
  position = 'bottom',
  className = ''
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      // Ensure dropdown is properly positioned
      LayoutSafety.ensureSpacing(dropdownRef.current, 8);
    }
  }, [isOpen]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2';
      case 'bottom':
        return 'top-full mt-2';
      case 'left':
        return 'right-full mr-2';
      case 'right':
        return 'left-full ml-2';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`dropdown-safe ${getPositionClasses()} ${className}`}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// SAFE TOOLTIP COMPONENT
// ============================================================================

interface SafeTooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const SafeTooltip: React.FC<SafeTooltipProps> = ({
  content,
  children,
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      // Ensure tooltip is properly positioned
      LayoutSafety.ensureSpacing(tooltipRef.current, 8);
    }
  }, [isVisible]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2';
      case 'bottom':
        return 'top-full mt-2';
      case 'left':
        return 'right-full mr-2';
      case 'right':
        return 'left-full ml-2';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip-safe ${getPositionClasses()} ${className}`}
        >
          <div className="bg-gray-900 text-white text-sm px-2 py-1 rounded">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SAFE NOTIFICATION COMPONENT
// ============================================================================

interface SafeNotificationProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export const SafeNotification: React.FC<SafeNotificationProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  className = ''
}) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && notificationRef.current) {
      // Ensure notification is properly positioned
      LayoutSafety.ensureSpacing(notificationRef.current, 16);
    }
  }, [isVisible]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onClose]);

  const getTypeClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={notificationRef}
      className={`notification-safe ${className}`}
    >
      <div className={`px-4 py-3 rounded-lg shadow-lg ${getTypeClasses()}`}>
        {message}
      </div>
    </div>
  );
};

// ============================================================================
// SAFE TOAST COMPONENT
// ============================================================================

interface SafeToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export const SafeToast: React.FC<SafeToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  className = ''
}) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && toastRef.current) {
      // Ensure toast is properly positioned
      LayoutSafety.ensureSpacing(toastRef.current, 16);
    }
  }, [isVisible]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, onClose]);

  const getTypeClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={toastRef}
      className={`toast-safe ${className}`}
    >
      <div className={`px-4 py-3 rounded-lg shadow-lg ${getTypeClasses()}`}>
        {message}
      </div>
    </div>
  );
};

// ============================================================================
// SAFE TOUR COMPONENT
// ============================================================================

interface SafeTourProps {
  isActive: boolean;
  targetElement?: HTMLElement;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onClose?: () => void;
  className?: string;
}

export const SafeTour: React.FC<SafeTourProps> = ({
  isActive,
  targetElement,
  content,
  position = 'bottom',
  onClose,
  className = ''
}) => {
  const tourRef = useRef<HTMLDivElement>(null);
  const [tourPosition, setTourPosition] = React.useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isActive && targetElement && tourRef.current) {
      const rect = targetElement.getBoundingClientRect();
      const tourRect = tourRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - tourRect.height - 16;
          left = rect.left + (rect.width - tourRect.width) / 2;
          break;
        case 'bottom':
          top = rect.bottom + 16;
          left = rect.left + (rect.width - tourRect.width) / 2;
          break;
        case 'left':
          top = rect.top + (rect.height - tourRect.height) / 2;
          left = rect.left - tourRect.width - 16;
          break;
        case 'right':
          top = rect.top + (rect.height - tourRect.height) / 2;
          left = rect.right + 16;
          break;
      }

      // Ensure tour is within viewport
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      if (left < 16) left = 16;
      if (left + tourRect.width > viewport.width - 16) {
        left = viewport.width - tourRect.width - 16;
      }
      if (top < 16) top = 16;
      if (top + tourRect.height > viewport.height - 16) {
        top = viewport.height - tourRect.height - 16;
      }

      setTourPosition({ top, left });
    }
  }, [isActive, targetElement, position]);

  if (!isActive) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-80" />

      {/* Tour Content */}
      <div
        ref={tourRef}
        className={`tour-safe ${className}`}
        style={{
          top: tourPosition.top,
          left: tourPosition.left
        }}
      >
        <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Tour</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
          <p className="text-gray-700 text-sm">{content}</p>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// LAYOUT HEALTH MONITOR
// ============================================================================

export const LayoutHealthMonitor: React.FC = () => {
  const [healthReport, setHealthReport] = React.useState<{
    overlaps: number;
    zIndexConflicts: number;
    responsiveIssues: number;
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  } | null>(null);

  useEffect(() => {
    const updateHealthReport = () => {
      const report = LayoutMonitor.getHealthReport();
      setHealthReport(report);
    };

    updateHealthReport();
    const interval = setInterval(updateHealthReport, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (!healthReport) return null;

  const getHealthColor = () => {
    switch (healthReport.overallHealth) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs z-50">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getHealthColor()}`} />
        <span className="font-medium">Layout Health: {healthReport.overallHealth}</span>
      </div>
      <div className="mt-1 text-gray-600">
        Overlaps: {healthReport.overlaps} |
        Z-Index: {healthReport.zIndexConflicts} |
        Responsive: {healthReport.responsiveIssues}
      </div>
    </div>
  );
};

export default {
  LayoutSafetyProvider,
  SafeModal,
  SafeDropdown,
  SafeTooltip,
  SafeNotification,
  SafeToast,
  SafeTour,
  LayoutHealthMonitor
};



