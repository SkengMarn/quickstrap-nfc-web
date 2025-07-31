import { toast, type ToastContent, type TypeOptions } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  NotificationSeverity,
  OperationType,
  SystemNotification,
  FunctionalNotification,
  ToastOptions,
  NotificationMethods
} from '@/types/notification.types';

// Re-export types for convenience
export type { OperationType, NotificationSeverity as Severity };

// Extend the FunctionalNotification interface to include additional properties
interface ExtendedFunctionalNotification extends Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'> {
  logToConsole?: boolean;
  showInUI?: boolean;
  toastOptions?: ToastOptions;
  origin?: string;
  [key: string]: unknown;
}

// Type for toast function
type ToastFunction = (content: ToastContent, options?: ToastOptions) => void;

// Extend the NotificationMethods interface to include operation method
interface ExtendedNotificationMethods extends Omit<NotificationMethods, 'operation'> {
  operation: (
    operation: OperationType,
    entity: string,
    message: string,
    options?: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'operation' | 'entity' | 'message'> & {
      severity?: NotificationSeverity;
    }
  ) => FunctionalNotification;
}

// Default toast options
const defaultToastOptions: ToastOptions = {
  autoClose: 5000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  position: 'top-right',
  hideProgressBar: false,
  closeButton: true,
  className: 'toast-notification',
  type: 'default'
};

// Map severity to toast functions with proper typing
type SeverityKey = NotificationSeverity | 'trace' | 'success';

// Helper type to ensure all severity keys are handled
type SeverityToToastFn = {
  [K in SeverityKey]: ToastFunction;
};

// Helper function to create toast options
const createToastOptions = (
  options: ToastOptions | undefined, 
  type: TypeOptions, 
  className: string, 
  autoClose: number | false
): ToastOptions => {
  // Create a new options object without className
  const { className: existingClassName, ...restOptions } = options || {};
  
  // If there's an existing className, combine it with the new one
  if (existingClassName) {
    if (typeof existingClassName === 'function') {
      // If className is a function, create a new function that combines both
      const existingFn = existingClassName as (context: any) => string;
      return {
        ...restOptions,
        type,
        autoClose,
        className: (context: any) => {
          const baseClass = className;
          const existingClass = existingFn(context);
          return `${baseClass} ${existingClass || ''}`.trim();
        },
      };
    } else {
      // If className is a string, combine them
      return {
        ...restOptions,
        type,
        autoClose,
        className: `${className} ${existingClassName}`.trim(),
      };
    }
  }

  // If no existing className, just use the new one
  return {
    ...restOptions,
    type,
    autoClose,
    className,
  };
};

// Create a type-safe severity to toast function map
const severityToToastFn: SeverityToToastFn = {
  critical: (content, options) => {
    toast(content, { ...createToastOptions(options, 'error', 'toast-critical', 10000), type: 'error' });
  },
  error: (content, options) => {
    toast.error(content, createToastOptions(options, 'error', 'toast-error', 8000));
  },
  warning: (content, options) => {
    toast.warning(content, createToastOptions(options, 'warning', 'toast-warning', 6000));
  },
  info: (content, options) => {
    toast.info(content, createToastOptions(options, 'info', 'toast-info', 5000));
  },
  debug: (content, options) => {
    if (process.env.NODE_ENV === 'development') {
      toast(content, createToastOptions(options, 'info', 'toast-debug', 4000));
    }
  },
  success: (content, options) => {
    toast.success(content, createToastOptions(options, 'success', 'toast-success', 5000));
  },
  trace: ((content: ToastContent, options?: ToastOptions) => {
    if (process.env.NODE_ENV === 'development') {
      toast.info(content, createToastOptions(options, 'info', 'toast-trace', 3000));
    }
  }) as ToastFunction
};

// Helper to get the appropriate toast function based on severity
const getToastFunction = (
  severity: NotificationSeverity | 'trace' | 'success' = 'info'
): ToastFunction => {
  const key = severity.toLowerCase() as keyof typeof severityToToastFn;
  const toastFn = severityToToastFn[key];
  
  if (!toastFn) {
    console.warn(`No toast function found for severity: ${key}, defaulting to 'info'`);
    return severityToToastFn.info;
  }
  
  return toastFn;
};

// Removed unused operation map
// Map severity to console methods
const consoleMethods: Record<NotificationSeverity | 'trace' | 'success', (...data: any[]) => void> = {
  critical: console.error,
  error: console.error,
  warning: console.warn,
  info: console.log,
  debug: console.debug,
  success: console.log, // Map success to console.log
  trace: console.debug, // Map trace to console.debug
};

// Helper to safely log to console with severity
const logWithSeverity = (
  severity: NotificationSeverity, 
  message: string, 
  context?: unknown
): void => {
  const logMessage = `[${severity.toUpperCase()}] ${message}`;
  const logFn = consoleMethods[severity] || console.log;
  logFn(logMessage, context || '');
};

// Notification utility implementation
const notificationImpl: ExtendedNotificationMethods = {
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
    // Create a new config object with all required properties
    const notificationConfig = {
      severity: config.severity || 'info',
      entity: config.entity || 'unknown',
      operation: config.operation || 'notify',
      message: config.message || 'No message provided',
      context: config.context || {},
      data: config.data || {},
      logToConsole: config.logToConsole ?? true,
      showInUI: config.showInUI ?? true,
      toastOptions: {
        ...defaultToastOptions,
        ...(config.toastOptions || {})
      }
    };
    
    // Create the notification object with all required properties
    const notification: FunctionalNotification = {
      ...notificationConfig,
      id: uuidv4(),
      timestamp: new Date(),
      read: false,
      category: 'functional' as const,
      severity: notificationConfig.severity || 'info', // Ensure severity is always defined
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

  // Operation helper method (kept for backward compatibility)
  operation: (
    operation: OperationType,
    entity: string,
    message: string,
    options: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'operation' | 'entity' | 'message'> & {
      severity?: NotificationSeverity;
    } = { severity: 'info' }
  ): FunctionalNotification => {
    return notificationImpl.functional({
      operation,
      entity,
      message,
      severity: options.severity || 'info',
      ...(options as any) // Type assertion to handle spread with Omit
    });
  },

  // Alias for info for backward compatibility
  notify: (message: string, options: ToastOptions = {}) => {
    return notificationImpl.system({
      message,
      severity: 'info',
      origin: 'app',
      ...options
    });
  },

  // Additional helper methods
  success: (message: string, options: ToastOptions = {}) => {
    return notificationImpl.system({
      message,
      severity: 'info',
      origin: 'app',
      ...options
    });
  },

  error: (message: string, error?: unknown, options: ToastOptions = {}) => {
    return notificationImpl.system({
      message: error ? `${message}: ${String(error)}` : message,
      severity: 'error',
      origin: 'app',
      ...options
    });
  },

  info: (message: string, options: ToastOptions = {}) => {
    return notificationImpl.system({
      message,
      severity: 'info',
      origin: 'app',
      ...options
    });
  },

  warning: (message: string, options: ToastOptions = {}) => {
    return notificationImpl.system({
      message,
      severity: 'warning',
      origin: 'app',
      ...options
    });
  },

  // CRUD aliases
  read: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.fetched(entity, message, data);
  },

  create: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.created(entity, message, data);
  },

  update: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.updated(entity, message, data);
  },

  delete: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.deleted(entity, message, data);
  },

  login: (message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.functional({
      entity: 'auth',
      operation: 'login',
      message,
      severity: 'info',
      data
    });
  },

  logout: (message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.functional({
      entity: 'auth',
      operation: 'logout',
      message,
      severity: 'info',
      data
    });
  },

  register: (message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.functional({
      entity: 'auth',
      operation: 'register',
      message,
      severity: 'info',
      data
    });
  },

  passwordReset: (message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.functional({
      entity: 'auth',
      operation: 'password_reset',
      message,
      severity: 'info',
      data
    });
  },

  // CRUD operation helpers
  created: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.functional({
      entity,
      message,
      operation: 'create',
      severity: 'info', // Changed from 'success' to 'info' to match NotificationSeverity type
      data,
      context: { action: 'create', entity, data }
    });
  },

  updated: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.functional({
      entity,
      message,
      operation: 'update',
      severity: 'info',
      data,
      context: { action: 'update', entity, data }
    });
  },

  deleted: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.functional({
      entity,
      message,
      operation: 'delete',
      severity: 'warning',
      data,
      context: { action: 'delete', entity, data }
    });
  },

  fetched: (entity: string, message: string, data: Record<string, unknown> = {}) => {
    return notificationImpl.functional({
      entity,
      message,
      operation: 'read',
      severity: 'info',
      data,
      context: { action: 'read', entity, data }
    });
  }
};

// Export the notification object with proper typing
export const notification: NotificationMethods = notificationImpl;
export default notification;
