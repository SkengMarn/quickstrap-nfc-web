import { toast, ToastOptions } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { notificationStore } from '@/stores/notificationStore';

type OperationType = 
  | 'create' | 'read' | 'update' | 'delete' 
  | 'success' | 'error' | 'warning' | 'info'
  | 'login' | 'logout' | 'register' | 'password_reset'
  | 'app_start' | 'session_timeout' | 'network_error';

type Severity = 'critical' | 'error' | 'warning' | 'info' | 'debug';
type NotificationCategory = 'system' | 'functional';

interface BaseNotification {
  id: string;
  timestamp: string;
  category: NotificationCategory;
  message: string;
  logToConsole: boolean;
  showInUI: boolean;
  context?: Record<string, unknown>;
  toastOptions?: ToastOptions;
}

export interface SystemNotification extends BaseNotification {
  category: 'system';
  code?: string;
  origin: string;
  severity: Severity;
}

export interface FunctionalNotification extends BaseNotification {
  category: 'functional';
  entity: string;
  operation: OperationType;
  severity: Severity;
  technicalDetails?: string;
  data?: Record<string, unknown>;
}

type NotificationConfig = Omit<SystemNotification, 'id' | 'timestamp' | 'category'> | 
                         Omit<FunctionalNotification, 'id' | 'timestamp' | 'category'>;

type ToastFunction = (message: string, options?: ToastOptions) => void;

// Default toast options
const defaultToastOptions: ToastOptions = {
  autoClose: 5000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Map severity levels to toast functions
const severityToToastFn: Record<Severity, ToastFunction> = {
  critical: (msg, opts) => toast.error(msg, { ...opts, className: 'toast-critical' }),
  error: (msg, opts) => toast.error(msg, { ...opts, className: 'toast-error' }),
  warning: (msg, opts) => toast.warn(msg, { ...opts, className: 'toast-warning' }),
  info: (msg, opts) => toast.info(msg, { ...opts, className: 'toast-info' }),
  debug: (msg, opts) => toast.info(msg, { ...opts, className: 'toast-debug' })
};

// Helper to get operation display text
const getOperationText = (operation: OperationType): string => {
  const map: Record<string, string> = {
    create: 'created',
    read: 'fetched',
    update: 'updated',
    delete: 'deleted',
    login: 'logged in',
    logout: 'logged out',
    register: 'registered',
    password_reset: 'password reset',
    app_start: 'app started',
    session_timeout: 'session timed out',
    network_error: 'network error',
  };
  return map[operation] || operation;
};

type OperationType = 
  | 'create' | 'read' | 'update' | 'delete' 
  | 'success' | 'error' | 'warning' | 'info'
  | 'login' | 'logout' | 'register' | 'password_reset'
  | 'app_start' | 'session_timeout' | 'network_error';

type NotificationCategory = 'system' | 'functional';
type Severity = 'critical' | 'error' | 'warning' | 'info' | 'debug';

interface BaseNotificationConfig {
  category: NotificationCategory;
  message: string;
  logToConsole?: boolean;
  showInUI?: boolean;
  context?: Record<string, unknown>;
  toastOptions?: ToastOptions;
}

interface SystemNotificationConfig extends BaseNotificationConfig {
  category: 'system';
  code?: string;
  origin: string;
  severity: Severity;
}

interface FunctionalNotificationConfig extends BaseNotificationConfig {
  category: 'functional';
  entity: string;
  operation: OperationType;
  severity?: Severity;
  technicalDetails?: string;
  data?: Record<string, unknown>;
}

type Notification = SystemNotificationConfig | FunctionalNotificationConfig;

// Map severity levels to toast functions
const severityToToastFn: Record<string, ToastFunction> = {
  critical: toast.error,
  error: toast.error,
  warning: toast.warn,
  info: toast.info,
  success: toast.success,
  debug: toast.info
};

// Default toast options
const defaultToastOptions: ToastOptions = {
  autoClose: 5000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Helper to get operation display text
const getOperationText = (operation: OperationType): string => {
  const map: Record<string, string> = {
    create: 'created',
    read: 'fetched',
    update: 'updated',
    delete: 'deleted',
    login: 'logged in',
    logout: 'logged out',
    register: 'registered',
    password_reset: 'password reset',
    app_start: 'app started',
    session_timeout: 'session timed out',
    network_error: 'network error',
  };
  return map[operation] || operation;
};

// Notification utility implementation
const notification = {
  // System notification method
  system: (config: Omit<SystemNotificationConfig, 'category'>) => {
    const notification: SystemNotificationConfig = {
      ...config,
      category: 'system',
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      config: {
        logToConsole: config.logToConsole ?? true,
        showInUI: config.showInUI ?? true,
        context: config.context,
        toastOptions: { ...defaultToastOptions, ...config.toastOptions }
      }
    };

    // Log to console if enabled
    if (notification.config.logToConsole) {
      const logLevel = notification.severity === 'critical' || notification.severity === 'error' 
        ? 'error' 
        : notification.severity === 'warning' 
          ? 'warn' 
          : 'log';
      
      const consoleMethod = console[logLevel as keyof Console] || console.log;
      consoleMethod(`[${notification.severity.toUpperCase()}] ${notification.message}`, {
        code: notification.code,
        origin: notification.origin,
        context: notification.config.context
      });
    }

    // Show in UI if enabled
    if (notification.config.showInUI) {
      const toastFn = severityToToastFn[notification.severity] || toast;
      toastFn(notification.message, {
        ...notification.config.toastOptions,
        'data-notification-type': 'system',
        'data-severity': notification.severity
      });
    }

    // Add to store
    notificationStore.add(notification);
  },

  // Functional notification method
  functional: (config: Omit<FunctionalNotificationConfig, 'category'>) => {
    const notification: FunctionalNotificationConfig = {
      ...config,
      category: 'functional',
      logToConsole: config.logToConsole ?? true,
      showInUI: config.showInUI ?? true,
      severity: config.severity || 'info',
      toastOptions: { ...defaultToastOptions, ...config.toastOptions }
    };

    // Log to console if enabled
    if (notification.logToConsole) {
      const operationText = getOperationText(notification.operation);
      console.log(`[${operationText.toUpperCase()}] ${notification.entity}: ${notification.message}`, {
        operation: notification.operation,
        entity: notification.entity,
        technicalDetails: notification.technicalDetails,
        data: notification.data,
        context: notification.context
      });
    }

    // Show in UI if enabled
    if (notification.showInUI) {
      const toastFn = severityToToastFn[notification.severity] || toast;
      toastFn(notification.message, {
        ...notification.toastOptions,
        'data-notification-type': 'functional',
        'data-entity': notification.entity,
        'data-operation': notification.operation
      });
    }

    // Add to store
    notificationStore.add(notification);
  },

  // Helper for CRUD operations
  operation: (operation: OperationType, entity: string, message: string, options: Omit<FunctionalNotificationConfig, 'category' | 'message' | 'operation' | 'entity'> = {}) => {
    const severity = options.severity || 
      (operation === 'error' ? 'error' : 
       operation === 'warning' ? 'warning' : 'info');
    
    notification.functional({
      ...options,
      entity,
      operation,
      message,
      severity,
      toastOptions: {
        ...options.toastOptions,
        className: `toast-${operation}`,
        autoClose: operation === 'error' ? 10000 : 5000
      }
    });
  },

  // Helper for success notifications
  success: (message: string, options: Omit<FunctionalNotificationConfig, 'category' | 'message' | 'operation' | 'entity'> = {}) => {
    notification.functional({
      ...options,
      message,
      entity: 'app',
      operation: 'success',
      severity: 'success',
      toastOptions: {
        ...options.toastOptions,
        className: 'toast-success',
        autoClose: 5000
      }
    });
  },

  // Helper for error notifications
  error: (message: string, options: Omit<FunctionalNotificationConfig, 'category' | 'message' | 'operation' | 'entity'> = {}) => {
    notification.functional({
      ...options,
      message,
      entity: 'app',
      operation: 'error',
      severity: 'error',
      toastOptions: {
        ...options.toastOptions,
        className: 'toast-error',
        autoClose: 10000
      }
    });
  },

  // Helper for warning notifications
  warning: (message: string, options: Omit<FunctionalNotificationConfig, 'category' | 'message' | 'operation' | 'entity'> = {}) => {
    notification.functional({
      ...options,
      message,
      entity: 'app',
      operation: 'warning',
      severity: 'warning',
      toastOptions: {
        ...options.toastOptions,
        className: 'toast-warning',
        autoClose: 8000
      }
      context: {},
      toastOptions: {}
    });
  },

  // Alias for info for backward compatibility
  notify(message: string, options: Omit<ToastOptions, 'data-entity' | 'data-operation'> = {}) {
    return this.functional({
      entity: 'app',
      operation: 'notify',
      message,
      data: { ...options },
      context: {},
      logToConsole: true,
      showInUI: true,
      toastOptions: {}
    });
  },

  // Operation-specific notification
  operation(config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'>) {
    const { entity = 'app', operation = 'notify', toastOptions, ...rest } = config;
    
    // Create the notification data
    const notificationData = {
      ...rest,
      entity,
      operation,
      message: rest.message || `${getOperationText(operation)} ${entity}`,
      technicalDetails: rest.technicalDetails || '',
      data: rest.data || {},
      toastOptions: toastOptions || { autoClose: 5000 }
    };
    
    // Add to notification store
    const store = useNotificationStore.getState();
    store.addNotification({
      ...notificationData,
      category: 'functional' as const,
      logToConsole: true,
      showInUI: true,
      context: { source: 'notification.operation', ...(rest as any).context },
    });
    
    // Show toast if configured
    if (notificationData.showInUI !== false) {
      const toastFn = severityToToastType[operation === 'error' ? 'error' : 'info'];
      toastFn(notificationData.message, {
        ...defaultOptions,
        ...notificationData.toastOptions,
        'data-entity': entity,
        'data-operation': operation,
      });
    }
    
    return notificationData;
  },

  created(entity: string, message: string, data?: Record<string, unknown>) {
    return this.functional({
      entity,
      operation: 'create',
      message: message || `${entity} created successfully`,
      data: data || {},
      context: {},
      logToConsole: true,
      showInUI: true,
      toastOptions: {}
    });
  },

  updated(entity: string, message: string, data?: Record<string, unknown>) {
    return this.functional({
      entity,
      operation: 'update',
      message: message || `${entity} updated successfully`,
      data: data || {},
      context: {},
      logToConsole: true,
      showInUI: true,
      toastOptions: {}
    });
  },

  deleted(entity: string, message: string, data?: Record<string, unknown>) {
    return this.functional({
      entity,
      operation: 'delete',
      message: message || `${entity} deleted successfully`,
      data: data || {},
      context: {},
      logToConsole: true,
      showInUI: true,
      toastOptions: {}
    });
  },

  fetched(entity: string, message: string, data?: Record<string, unknown>) {
    return this.functional({
      entity,
      operation: 'read',
      message: message || `${entity} fetched successfully`,
      data: data || {},
      context: {},
      logToConsole: true,
      showInUI: true,
      toastOptions: {}
    });
  }
};

// Export the notification object with proper typing
const notification: typeof notificationImpl = notificationImpl;
export default notification;
