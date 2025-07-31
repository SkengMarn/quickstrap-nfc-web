import { toast, ToastOptions as ReactToastifyOptions } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  OperationType,
  Severity,
  SystemNotification,
  FunctionalNotification,
  SystemNotificationOptions,
  FunctionalNotificationOptions,
  Notification,
  NotificationCategory
} from '@/types/notification.types';

// Helper to get notification store
export const getNotificationStore = () => useNotificationStore.getState();

// Default toast options
const defaultToastOptions: ReactToastifyOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Map severity to toast function
const severityToToastFn: Record<Severity, (message: string, options?: ReactToastifyOptions) => void> = {
  critical: (msg, opts) => toast.error(msg, { ...opts, autoClose: 10000 }),
  error: (msg, opts) => toast.error(msg, { ...opts, autoClose: 8000 }),
  warning: (msg, opts) => toast.warn(msg, { ...opts, autoClose: 6000 }),
  info: (msg, opts) => toast.info(msg, { ...opts, autoClose: 5000 }),
  debug: (msg) => console.debug(msg),
  success: (msg, opts) => toast.success(msg, { ...opts, autoClose: 3000 }),
};

// Helper to get toast function based on severity
const getToastFn = (severity: Severity) => {
  return severityToToastFn[severity] || ((msg, opts) => toast.info(msg, opts));
};

// System notification handler
const system = (config: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category'>): SystemNotification => {
  const notification: SystemNotification = {
    id: uuidv4(),
    timestamp: new Date(),
    read: false,
    category: 'system',
    message: config.message,
    severity: config.severity || 'info',
    origin: config.origin || 'app',
    ...(config.code && { code: config.code }),
    ...(config.logToConsole !== undefined && { logToConsole: config.logToConsole }),
    ...(config.showInUI !== undefined && { showInUI: config.showInUI }),
    ...(config.context && { context: config.context }),
  };

  // Log to console if enabled
  if (notification.logToConsole !== false) {
    const logFn = console[notification.severity] || console.log;
    logFn(`[${notification.origin}] ${notification.message}`, notification.context || '');
  }

  // Show in UI if enabled
  if (notification.showInUI !== false) {
    const toastFn = getToastFn(notification.severity);
    toastFn(notification.message, {
      ...defaultToastOptions,
      ...notification.toastOptions,
      'data-notification-type': 'system',
    });
  }

  // Add to store
  getNotificationStore().addNotification(notification);
  return notification;
};

// Functional notification handler
const functional = (config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'>): FunctionalNotification => {
  const notification: FunctionalNotification = {
    id: uuidv4(),
    timestamp: new Date(),
    read: false,
    category: 'functional',
    message: config.message,
    entity: config.entity,
    operation: config.operation,
    ...(config.technicalDetails && { technicalDetails: config.technicalDetails }),
    ...(config.data && { data: config.data }),
    ...(config.logToConsole !== undefined && { logToConsole: config.logToConsole }),
    ...(config.showInUI !== undefined && { showInUI: config.showInUI }),
    ...(config.context && { context: config.context }),
    ...(config.toastOptions && { toastOptions: config.toastOptions }),
  };

  // Log to console if enabled
  if (notification.logToConsole !== false) {
    console.log(`[${notification.entity}.${notification.operation}] ${notification.message}`, {
      ...notification.data,
      ...(notification.technicalDetails && { technicalDetails: notification.technicalDetails })
    });
  }

  // Show in UI if enabled
  if (notification.showInUI !== false) {
    const toastFn = getToastFn('info'); // Default to info for functional notifications
    toastFn(notification.message, {
      ...defaultToastOptions,
      ...notification.toastOptions,
      'data-notification-type': 'functional',
    });
  }

  // Add to store
  getNotificationStore().addNotification(notification);
  return notification;
};

// Operation-specific notification helpers
const operation = {
  // CRUD operations
  create: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'>) => 
    functional({ ...options, entity, message, operation: 'create' }),
  
  read: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'>) => 
    functional({ ...options, entity, message, operation: 'read' }),
  
  update: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'>) => 
    functional({ ...options, entity, message, operation: 'update' }),
  
  delete: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'>) => 
    functional({ ...options, entity, message, operation: 'delete' }),
  
  // Auth operations
  login: (message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'>) => 
    functional({ ...options, entity: 'auth', message, operation: 'login' }),
  
  logout: (message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'>) => 
    functional({ ...options, entity: 'auth', message, operation: 'logout' }),
  
  register: (message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'>) => 
    functional({ ...options, entity: 'auth', message, operation: 'register' }),
  
  // Other common operations
  error: (message: string, error?: unknown, options?: Omit<SystemNotificationOptions, 'message' | 'severity'>) => 
    system({ ...options, message, severity: 'error', context: { error } }),
  
  warning: (message: string, options?: Omit<SystemNotificationOptions, 'message' | 'severity'>) => 
    system({ ...options, message, severity: 'warning' }),
  
  info: (message: string, options?: Omit<SystemNotificationOptions, 'message' | 'severity'>) => 
    system({ ...options, message, severity: 'info' }),
  
  success: (message: string, options?: Omit<SystemNotificationOptions, 'message' | 'severity'>) => 
    system({ ...options, message, severity: 'success' }),
};

// Legacy aliases for backward compatibility
const notify = (message: string, options?: Omit<SystemNotificationOptions, 'message' | 'severity'>) => 
  system({ ...options, message, severity: 'info' });

// Export the notification API
const notification = {
  // Core handlers
  system,
  functional,
  
  // Operation helpers
  operation,
  
  // Legacy aliases
  notify,
  success: operation.success,
  error: operation.error,
  warning: operation.warning,
  info: operation.info,
  
  // CRUD shortcuts
  created: (entity: string, message: string, data?: Record<string, unknown>) => 
    operation.create(entity, message, data ? { data } : undefined),
    
  updated: (entity: string, message: string, data?: Record<string, unknown>) => 
    operation.update(entity, message, data ? { data } : undefined),
    
  deleted: (entity: string, message: string, data?: Record<string, unknown>) => 
    operation.delete(entity, message, data ? { data } : undefined),
    
  fetched: (entity: string, message: string, data?: Record<string, unknown>) => 
    operation.read(entity, message, data ? { data } : undefined),
};

export default notification;

// Extend the Window interface to include the notification store
declare global {
  interface Window {
    notificationStore: typeof useNotificationStore;
  }
}

// Initialize the notification store
const notificationStore = useNotificationStore;

// Default toast options
const defaultToastOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Map severity to toast function
const severityToToastFn: Record<Severity, (message: string, options?: ToastOptions) => void> = {
  critical: (msg, opts) => toast.error(msg, { ...opts, className: 'toast-critical' }),
  error: (msg, opts) => toast.error(msg, opts),
  warning: (msg, opts) => toast.warn(msg, opts),
  info: (msg, opts) => toast.info(msg, opts),
  debug: (msg) => console.debug(msg),
};

// Helper to get toast function based on severity
const getToastFn = (severity: Severity = 'info') => {
  return severityToToastFn[severity] || toast;
};

/**
 * System notification function
 * @param config Configuration for the system notification
 */
const system = (config: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category'> & SystemNotificationOptions) => {
  const notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'> = {
    category: 'system',
    message: config.message,
    logToConsole: config.logToConsole ?? true,
    showInUI: config.showInUI ?? true,
    context: config.context,
    code: config.code,
    origin: config.origin || 'app',
    severity: config.severity || 'info',
  };

  // Add to notification store
  notificationStore.getState().addNotification(notification as Omit<Notification, 'id' | 'timestamp' | 'read'>);

  // Show toast if enabled
  if (notification.showInUI) {
    const toastFn = getToastFn(notification.severity);
    toastFn(notification.message, {
      ...defaultToastOptions,
      ...(config.toastOptions || {}),
    });
  }

  // Log to console if enabled
  if (notification.logToConsole) {
    const logFn = console[notification.severity as keyof Console] || console.log;
    logFn(`[${notification.origin}] ${notification.message}`, notification.context);
  }
};

/**
 * Functional notification function
 * @param config Configuration for the functional notification
 */
const functional = (config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'> & FunctionalNotificationOptions) => {
  const notification: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read'> = {
    category: 'functional',
    entity: config.entity,
    operation: config.operation || 'notify',
    message: config.message,
    logToConsole: config.logToConsole ?? true,
    showInUI: config.showInUI ?? true,
    context: config.context,
    technicalDetails: config.technicalDetails,
    data: config.data,
  };

  // Add to notification store
  notificationStore.getState().addNotification(notification as Omit<Notification, 'id' | 'timestamp' | 'read'>);

  // Show toast if enabled
  if (notification.showInUI) {
    const severity = notification.operation === 'error' ? 'error' : 
                    notification.operation === 'warning' ? 'warning' : 'info';
    const toastFn = getToastFn(severity as Severity);
    
    toastFn(notification.message, {
      ...defaultToastOptions,
      ...(config.toastOptions || {}),
    });
  }

  // Log to console if enabled
  if (notification.logToConsole) {
    const logFn = console[notification.operation as keyof Console] || console.log;
    logFn(`[${notification.entity}.${notification.operation}] ${notification.message}`, {
      ...notification.context,
      technicalDetails: notification.technicalDetails,
      data: notification.data,
    });
  }
};

/**
 * Helper for operation notifications
 * @param operation Type of operation (create, read, update, delete, etc.)
 * @param entity Entity name (e.g., 'event', 'user')
 * @param message Notification message
 * @param options Additional options
 */
const operation = (
  operation: OperationType,
  entity: string,
  message: string,
  options: Omit<FunctionalNotificationOptions, 'entity' | 'operation' | 'message'> = {}
) => {
  return functional({
    entity,
    operation,
    message,
    ...options,
  });
};

// Convenience methods
const success = (message: string, options: Omit<FunctionalNotificationOptions, 'operation'> = {}) => 
  functional({ ...options, message, operation: 'success' });

const error = (message: string, options: Omit<FunctionalNotificationOptions, 'operation'> = {}) => 
  functional({ ...options, message, operation: 'error' });

const warning = (message: string, options: Omit<FunctionalNotificationOptions, 'operation'> = {}) => 
  functional({ ...options, message, operation: 'warning' });

const info = (message: string, options: Omit<FunctionalNotificationOptions, 'operation'> = {}) => 
  functional({ ...options, message, operation: 'info' });

// Export the notification API
export const notification = {
  // Core methods
  system,
  functional,
  operation,
  
  // Convenience methods
  success,
  error,
  warning,
  info,
  
  // Direct toast access
  toast: {
    success: (message: string, options?: ToastOptions) => 
      toast.success(message, { ...defaultToastOptions, ...options }),
    error: (message: string, options?: ToastOptions) => 
      toast.error(message, { ...defaultToastOptions, ...options }),
    warning: (message: string, options?: ToastOptions) => 
      toast.warn(message, { ...defaultToastOptions, ...options }),
    info: (message: string, options?: ToastOptions) => 
      toast.info(message, { ...defaultToastOptions, ...options }),
  },
};

export default notification;

// Extend the Window interface to include the notification store
declare global {
  interface Window {
    notificationStore: typeof useNotificationStore;
  }
}

// Initialize the notification store
const notificationStore = useNotificationStore;

// Default toast options
const defaultToastOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Map severity to toast function
const severityToToastFn: Record<Severity, (message: string, options?: ReactToastifyOptions) => void> = {
  critical: (msg, opts) => toast.error(msg, { ...opts, autoClose: 10000 }),
  error: (msg, opts) => toast.error(msg, { ...opts, autoClose: 8000 }),
  warning: (msg, opts) => toast.warn(msg, { ...opts, autoClose: 6000 }),
  info: (msg, opts) => toast.info(msg, { ...opts, autoClose: 5000 }),
  debug: (msg) => console.debug(msg),
  success: (msg, opts) => toast.success(msg, { ...opts, autoClose: 3000 }),
};

// Helper to get toast function based on severity
const getToastFn = (severity: Severity = 'info') => {
  return severityToToastFn[severity] || toast;
};

// System notification function
const system = (config: Omit<SystemNotification, keyof BaseNotification | 'id' | 'timestamp' | 'read' | 'category'>) => {
  const notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'> = {
    category: 'system',
    message: config.message,
    logToConsole: config.logToConsole ?? true,
    showInUI: config.showInUI ?? true,
    context: config.context,
    code: config.code,
    origin: config.origin,
    severity: config.severity || 'info',
  };

  // Add to notification store
  notificationStore.getState().addNotification(notification);

  // Show toast if enabled
  if (notification.showInUI) {
    const toastFn = getToastFn(notification.severity);
    toastFn(notification.message, {
      ...defaultToastOptions,
      ...(config as any).toastOptions,
    });
  }

  // Log to console if enabled
  if (notification.logToConsole) {
    const logFn = console[notification.severity] || console.log;
    logFn(`[${notification.origin}] ${notification.message}`, notification.context);
  }
};

// Functional notification function
const functional = (config: Omit<FunctionalNotification, keyof BaseNotification | 'id' | 'timestamp' | 'read' | 'category'>) => {
  const notification: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read'> = {
    category: 'functional',
    entity: config.entity,
    operation: config.operation,
    message: config.message,
    logToConsole: config.logToConsole ?? true,
    showInUI: config.showInUI ?? true,
    context: config.context,
    technicalDetails: config.technicalDetails,
    data: config.data,
    toastOptions: config.toastOptions,
  };

  // Add to notification store
  notificationStore.getState().addNotification(notification);

  // Show toast if enabled
  if (notification.showInUI) {
    const severity = notification.operation === 'error' ? 'error' : 
                    notification.operation === 'warning' ? 'warning' : 'info';
    const toastFn = getToastFn(severity as Severity);
    
    toastFn(notification.message, {
      ...defaultToastOptions,
      ...(notification.toastOptions || {}),
    });
  }

  // Log to console if enabled
  if (notification.logToConsole) {
    const logFn = console[notification.operation as keyof Console] || console.log;
    logFn(`[${notification.entity}.${notification.operation}] ${notification.message}`, {
      ...notification.context,
      technicalDetails: notification.technicalDetails,
      data: notification.data,
    });
  }
};

// Helper for operation notifications
const operation = (
  operation: OperationType,
  entity: string,
  message: string,
  options: {
    severity?: Severity;
    technicalDetails?: string;
    data?: Record<string, any>;
    toastOptions?: ToastOptions;
    logToConsole?: boolean;
    showInUI?: boolean;
    context?: Record<string, any>;
  } = {}
) => {
  return functional({
    entity,
    operation,
    message,
    technicalDetails: options.technicalDetails,
    data: options.data,
    toastOptions: options.toastOptions,
    logToConsole: options.logToConsole,
    showInUI: options.showInUI,
    context: options.context,
  });
};

// Convenience methods
const success = (message: string, options: Omit<Parameters<typeof functional>[0], 'message' | 'operation'> = {}) => 
  functional({ ...options, message, operation: 'success' });

const error = (message: string, options: Omit<Parameters<typeof functional>[0], 'message' | 'operation'> = {}) => 
  functional({ ...options, message, operation: 'error' });

const warning = (message: string, options: Omit<Parameters<typeof functional>[0], 'message' | 'operation'> = {}) => 
  functional({ ...options, message, operation: 'warning' });

const info = (message: string, options: Omit<Parameters<typeof functional>[0], 'message' | 'operation'> = {}) => 
  functional({ ...options, message, operation: 'info' });

// Export the notification API
export const notification = {
  // Core methods
  system,
  functional,
  operation,
  
  // Convenience methods
  success,
  error,
  warning,
  info,
  
  // Direct toast access
  toast: {
    success: (message: string, options?: ToastOptions) => toast.success(message, { ...defaultToastOptions, ...options }),
    error: (message: string, options?: ToastOptions) => toast.error(message, { ...defaultToastOptions, ...options }),
    warning: (message: string, options?: ToastOptions) => toast.warn(message, { ...defaultToastOptions, ...options }),
    info: (message: string, options?: ToastOptions) => toast.info(message, { ...defaultToastOptions, ...options }),
  },
};

export default notification;

// Default toast options
const defaultToastOptions: ToastOptions = {
  autoClose: 5000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Map severity levels to toast functions
const severityToToastFn: Record<Severity, (msg: string, opts?: ToastOptions) => void> = {
  critical: (msg, opts) => toast.error(msg, { ...opts, className: 'toast-critical' }),
  error: (msg, opts) => toast.error(msg, { ...opts, className: 'toast-error' }),
  warning: (msg, opts) => toast.warn(msg, { ...opts, className: 'toast-warning' }),
  info: (msg, opts) => toast.info(msg, { ...opts, className: 'toast-info' }),
  debug: (msg, opts) => toast.info(msg, { ...opts, className: 'toast-debug' })
};

// System notification method
const system = (config: SystemNotificationConfig): void => {
  const notification: SystemNotification = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    category: 'system',
    message: config.message || 'System notification',
    logToConsole: config.logToConsole ?? true,
    showInUI: config.showInUI ?? true,
    context: config.context,
    toastOptions: { ...defaultToastOptions, ...config.toastOptions },
    code: config.code,
    origin: config.origin,
    severity: config.severity
  };

  // Log to console if enabled
  if (notification.logToConsole) {
    const logLevel = notification.severity === 'critical' || notification.severity === 'error' 
      ? 'error' 
      : notification.severity === 'warning' 
        ? 'warn' 
        : 'log';
    
    const logContext = { code: notification.code, origin: notification.origin, context: notification.context };
    const logMessage = `[${notification.severity.toUpperCase()}] ${notification.message}`;
    
    if (logLevel === 'error') console.error(logMessage, logContext);
    else if (logLevel === 'warn') console.warn(logMessage, logContext);
    else console.log(logMessage, logContext);
  }

  // Show in UI if enabled
  if (notification.showInUI) {
    const toastFn = severityToToastFn[notification.severity] || toast;
    toastFn(notification.message, {
      ...notification.toastOptions,
      'data-notification-type': 'system',
      'data-severity': notification.severity
    });
  }

  // Add to store
  notificationStore.add(notification);
};

// Functional notification method
const functional = (config: FunctionalNotificationConfig): void => {
  const notification: FunctionalNotification = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    category: 'functional',
    message: config.message,
    logToConsole: config.logToConsole ?? true,
    showInUI: config.showInUI ?? true,
    context: config.context,
    toastOptions: { ...defaultToastOptions, ...config.toastOptions },
    entity: config.entity,
    operation: config.operation,
    severity: config.severity || 'info',
    technicalDetails: config.technicalDetails,
    data: config.data
  };

  // Log to console if enabled
  if (notification.logToConsole) {
    console.log(`[${notification.operation.toUpperCase()}] ${notification.entity}: ${notification.message}`, {
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
};

// Helper for CRUD operations
const operation = (
  operation: OperationType,
  entity: string,
  message: string,
  options: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message'> = {}
): void => {
  const severity = options.severity || 
    (operation === 'error' ? 'error' : 
     operation === 'warning' ? 'warning' : 'info');
  
  functional({
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
};

// Export the notification API
export const notification = {
  // Core methods
  system,
  functional,
  operation,
  
  // Convenience methods
  success: (message: string, options: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message'> = {}) => 
    operation('success', 'app', message, { severity: 'info', ...options }),
    
  error: (message: string, options: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message'> = {}) => 
    operation('error', 'app', message, { severity: 'error', ...options }),
    
  warning: (message: string, options: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message'> = {}) => 
    operation('warning', 'app', message, { severity: 'warning', ...options }),
    
  info: (message: string, options: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message'> = {}) => 
    operation('info', 'app', message, { severity: 'info', ...options }),
  
  // Direct toast access (for advanced use cases)
  toast: {
    ...toast,
    success: (message: string, options?: ToastOptions) => 
      operation('success', 'app', message, { toastOptions: options }),
    error: (message: string, options?: ToastOptions) => 
      operation('error', 'app', message, { toastOptions: options }),
    warning: (message: string, options?: ToastOptions) => 
      operation('warning', 'app', message, { toastOptions: options }),
    info: (message: string, options?: ToastOptions) => 
      operation('info', 'app', message, { toastOptions: options })
  }
};

export default notification;
