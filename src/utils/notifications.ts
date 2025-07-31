import { toast, type ToastContent, type ToastOptions as ReactToastOptions } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  NotificationSeverity,
  OperationType,
  NotificationCategory,
  ToastOptions as StoreToastOptions,
  BaseNotification,
  SystemNotification,
  FunctionalNotification
} from '@/stores/notificationStore';

// Re-export types for convenience
export type { OperationType, NotificationSeverity as Severity };

type ToastOptions = StoreToastOptions & Omit<ReactToastOptions, 'type'> & {
  'data-entity'?: string;
  'data-operation'?: string;
  className?: string;
};

// Type for toast function options
type ToastFnOptions = ToastOptions & {
  type?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
  autoClose?: number | false;
};

type Notification = SystemNotification | FunctionalNotification;

// Local type extensions for notification configs
type SystemNotificationConfig = Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category'> & {
  logToConsole?: boolean;
  showInUI?: boolean;
  toastOptions?: ToastOptions;
};

// Extend the FunctionalNotification interface to include additional properties
interface ExtendedFunctionalNotification extends Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'> {
  logToConsole?: boolean;
  showInUI?: boolean;
  toastOptions?: ToastOptions;
  origin?: string;
  // Add any other missing properties that might be needed
  [key: string]: unknown;
}

type FunctionalNotificationConfig = ExtendedFunctionalNotification;

type ToastFunction = (message: string, options?: ToastOptions) => void;

// Default toast options
const defaultToastOptions: ToastOptions = {
  autoClose: 5000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  position: 'top-right',
  hideProgressBar: false,
  closeButton: true,
  className: 'toast-notification'
};

// Map severity to toast functions with proper typing
// Extend the type to include 'trace' which is used in the codebase
const severityToToastFn: Record<NotificationSeverity | 'trace', ToastFunction> = {
  error: (content: React.ReactNode, options?: ToastOptions) => {
    const toastOptions: ToastFnOptions = {
      ...defaultToastOptions,
      ...options,
      type: 'error',
      className: `toast-error ${options?.className || ''}`.trim()
    };
    return toast.error(content, toastOptions);
  },
  warning: (content: React.ReactNode, options?: ToastOptions) => {
    const toastOptions: ToastFnOptions = {
      ...defaultToastOptions,
      ...options,
      type: 'warning',
      className: `toast-warning ${options?.className || ''}`.trim()
    };
    return toast.warning(content, toastOptions);
  },
  info: (content: React.ReactNode, options?: ToastOptions) => {
    const toastOptions: ToastFnOptions = {
      ...defaultToastOptions,
      ...options,
      type: 'info',
      className: `toast-info ${options?.className || ''}`.trim()
    };
    return toast.info(content, toastOptions);
  },
  // Map 'success' to 'info' since 'success' is not a valid NotificationSeverity
  success: (content: React.ReactNode, options?: ToastOptions) => {
    const toastOptions: ToastFnOptions = {
      ...defaultToastOptions,
      ...options,
      type: 'info',
      className: `toast-info ${options?.className || ''}`.trim()
    };
    return toast.info(content, toastOptions);
  },
  debug: (content: React.ReactNode, options?: ToastOptions) => {
    const toastOptions: ToastFnOptions = {
      ...defaultToastOptions,
      ...options,
      type: 'info',
      className: `toast-debug ${options?.className || ''}`.trim()
    };
    return toast.info(content, toastOptions);
  },
  trace: (content: React.ReactNode, options?: ToastOptions) => {
    const toastOptions: ToastFnOptions = {
      ...defaultToastOptions,
      ...options,
      type: 'info',
      className: `toast-trace ${options?.className || ''}`.trim()
    };
    return toast.info(content, toastOptions);
  },
  critical: (content: React.ReactNode, options?: ToastOptions) => {
    const toastOptions: ToastFnOptions = {
      ...defaultToastOptions,
      ...options,
      type: 'error',
      autoClose: false,
      className: `toast-critical ${options?.className || ''}`.trim()
    };
    return toast.error(content, toastOptions);
  }
};

// Helper to get the appropriate toast function based on severity
const getToastFunction = (severity: NotificationSeverity | 'trace' = 'info'): ToastFunction => {
  // For 'trace' severity, use 'debug' as a fallback since 'trace' is not a valid NotificationSeverity
  const validSeverity = severity === 'trace' ? 'debug' : severity;
  return severityToToastFn[validSeverity] || severityToToastFn.info;
};

// CRUD operation helpers - these will be implemented as methods on the notification object

// Helper to get operation display text
const getOperationText = (operation: string): string => {
  const operationMap: Record<string, string> = {
    create: 'created',
    read: 'fetched',
    update: 'updated',
    delete: 'deleted',
    login: 'logged in',
    logout: 'logged out',
    register: 'registered',
    password_reset: 'password reset',
    access_grant: 'access granted',
    access_revoke: 'access revoked',
    app_start: 'app started',
    session_timeout: 'session timed out',
    network_error: 'network error',
    config_load: 'config loaded',
    auth_error: 'authentication error',
    info: 'info',
    success: 'completed successfully',
    error: 'failed',
    notify: 'notification'
  };

  return operationMap[operation] || operation;
};

// Map severity to console methods
const consoleMethods = {
  critical: console.error,
  error: console.error,
  warning: console.warn,
  info: console.log,
  debug: console.debug,
  success: console.log, // Map success to console.log
  // Note: 'trace' is not a valid NotificationSeverity, so we'll use a type assertion here
} as Record<NotificationSeverity | 'trace', (...data: any[]) => void>;

// Helper to safely log to console with severity
const logWithSeverity = (severity: NotificationSeverity, message: string, context?: unknown) => {
  const logMessage = `[${severity.toUpperCase()}] ${message}`;
  const logFn = consoleMethods[severity] || console.log;
  logFn(logMessage, context || '');
};

// Notification utility implementation
const notificationImpl = {
  // System notification method
  system: (config: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category'>): SystemNotification => {
    const notification: SystemNotification = {
      ...config,
      id: uuidv4(),
      timestamp: new Date(),
      read: false,
      category: 'system',
      code: config.code || 'SYSTEM_NOTIFICATION',
      origin: config.origin || 'system',
      severity: config.severity || 'info',
      message: config.message || 'System notification',
      logToConsole: config.logToConsole ?? true,
      showInUI: config.showInUI ?? true,
      context: config.context || {},
      toastOptions: {
        ...defaultToastOptions,
        ...(config.toastOptions || {})
      }
    };

    // Log to console if enabled
    if (notification.logToConsole) {
      logWithSeverity(notification.severity, notification.message, notification.context);
    }

    // Show in UI if enabled
    if (notification.showInUI && notification.toastOptions) {
      const toastFn = getToastFunction(notification.severity);
      toastFn(notification.message, {
        ...defaultToastOptions,
        ...notification.toastOptions,
        toastId: notification.code || `toast-${Date.now()}`,
        data: {
          ...notification.context,
          entity: 'system',
          operation: notification.origin
        }
      });
    }

    // Add to store
    useNotificationStore.getState().addNotification(notification);
    return notification;
  },

  // Functional notification method
  functional: (config: ExtendedFunctionalNotification): FunctionalNotification => {
    // Ensure required properties are provided
    const severity = config.severity || 'info';
    const origin = config.origin || 'unknown';
    
    // Create the notification object with required properties
    // We'll exclude the origin from the spread since it's not part of the FunctionalNotification type
    const { origin: _, ...restConfig } = config;
    
    const notification: FunctionalNotification = {
      ...restConfig,
      id: uuidv4(),
      timestamp: new Date(),
      read: false,
      category: 'functional' as const,
      severity,
      context: config.context || {},
      data: config.data || {},
      logToConsole: config.logToConsole ?? true,
      showInUI: config.showInUI ?? true,
      toastOptions: {
        ...defaultToastOptions,
        ...(config.toastOptions || {})
      }
    };

    // Log to console if enabled
    if (notification.logToConsole) {
      logWithSeverity(
        notification.severity,
        `[${notification.operation}] ${notification.entity}: ${notification.message}`,
        notification.context
      );
    }

    // Show in UI if enabled
    if (notification.showInUI) {
      const toastFn = getToastFunction(notification.severity);
      const toastOptions = notification.toastOptions || {};
      toastFn(notification.message, {
        ...toastOptions,
        'data-entity': notification.entity,
        'data-operation': notification.operation,
        className: `toast-${notification.severity} ${toastOptions.className || ''}`.trim()
      });
    }

    // Add to store
    useNotificationStore.getState().addNotification(notification);
    return notification;
  },

  // Operation helper method
  operation: (
    operation: OperationType,
    entity: string,
    message: string,
    options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'operation' | 'entity' | 'message'> & {
      severity?: NotificationSeverity;
    } = { severity: 'info' } // Provide a default severity
  ): FunctionalNotification => {
    // Ensure required properties are provided with proper types
    const severity: NotificationSeverity = options.severity || 'info';
    
    // Create a new options object with required properties
    const notificationOptions = {
      ...options,
      operation,
      entity,
      message,
      severity
    };
    
    return notificationImpl.functional(notificationOptions);
  },

  // Alias for info for backward compatibility
  notify: (message: string, options: Omit<ToastOptions, 'data-entity' | 'data-operation'> = {}) => {
    return notificationImpl.functional({
      entity: 'app',
      operation: 'notify',
      message,
      severity: 'info',
      context: {},
      logToConsole: true,
      showInUI: true,
      toastOptions: {
        ...defaultToastOptions,
        ...options
      }
    });
  },

  // CRUD operation helpers
  created: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.operation('create', entity, message, {
      data,
      severity: 'info',
      context: { action: 'create', entity, data }
    });
  },

  updated: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.operation('update', entity, message, {
      data,
      severity: 'info',
      context: { action: 'update', entity, data }
    });
  },

  deleted: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.operation('delete', entity, message, {
      data,
      severity: 'warning',
      context: { action: 'delete', entity, data }
    });
  },

  fetched: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.operation('read', entity, message, {
      data,
      severity: 'info',
      context: { action: 'read', entity, data }
    });
  }
};

// Export the notification object with proper typing
export const notification = notificationImpl;
export default notification;
