import { toast, type TypeOptions, type ToastOptions } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { useNotificationStore } from '@/stores/notificationStore';
import type {
  Severity,
  SystemNotification,
  FunctionalNotification,
  Operation,
  NotificationMethods,
  FunctionalNotificationConfig
} from '@/types/notification.types';

// Default toast options
const defaultToastOptions: Omit<ToastOptions, 'draggable'> & { draggable: boolean } = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: 'light',
};

// Console methods mapping
const consoleMethods: Record<Severity, (...data: any[]) => void> = {
  critical: console.error,
  error: console.error,
  warning: console.warn,
  info: console.info,
  success: console.log,
  debug: console.debug,
};

// Helper for logging with severity
const logWithSeverity = (severity: Severity, message: string, context?: unknown) => {
  const logFn = consoleMethods[severity] || console.info;
  if (typeof logFn === 'function') {
    logFn(`[${severity.toUpperCase()}] ${message}`, context || '');
  }
};

// Create system notification
const createSystemNotification = (
  config: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'severity'> & {
    severity?: Severity;
  },
  severity: Severity = 'info'
): SystemNotification => {
  const notification: SystemNotification = {
    id: uuidv4(),
    timestamp: new Date(),
    read: false,
    category: 'system',
    severity,
    message: config.message,
    origin: config.origin || 'app',
    code: config.code,
    context: config.context,
    logToConsole: config.logToConsole ?? true,
    showInUI: config.showInUI ?? true,
    toastOptions: {
      ...defaultToastOptions,
      ...config.toastOptions,
      type: mapSeverityToType(severity),
    },
  };

  if (notification.logToConsole) {
    logWithSeverity(severity, notification.message, notification.context);
  }

  if (notification.showInUI) {
    toast(notification.message, notification.toastOptions);
  }

  // Add to store
  useNotificationStore.getState().addNotification(notification);
  return notification;
};

// Create functional notification
const createFunctionalNotification = (
  config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'severity'> & {
    severity?: Severity;
  },
  severity: Severity = 'info'
): FunctionalNotification => {
  const notification: FunctionalNotification = {
    id: uuidv4(),
    timestamp: new Date(),
    read: false,
    category: 'functional',
    severity,
    entity: config.entity,
    operation: config.operation,
    message: config.message,
    origin: config.origin || 'app',
    technicalDetails: config.technicalDetails,
    data: config.data,
    context: config.context,
    logToConsole: config.logToConsole ?? true,
    showInUI: config.showInUI ?? true,
    toastOptions: {
      ...defaultToastOptions,
      ...config.toastOptions,
      type: mapSeverityToType(severity),
      'data-entity': config.entity,
      'data-operation': config.operation,
    },
  };

  if (notification.logToConsole) {
    logWithSeverity(severity, `[${notification.entity}.${notification.operation}] ${notification.message}`, notification.context);
  }

  if (notification.showInUI) {
    toast(notification.message, notification.toastOptions);
  }

  // Add to store
  useNotificationStore.getState().addNotification(notification);
  return notification;
};

// Operation-specific creators
const createOperationNotification = (
  operation: Operation,
  entity: string,
  message: string,
  options: Omit<FunctionalNotificationConfig, 'message' | 'entity' | 'operation' | 'severity'> & { severity?: Severity } = {}
): FunctionalNotification => {
  return createFunctionalNotification({
    ...options,
    entity,
    operation,
    message,
  }, options.severity);
};

// Map our Severity to react-toastify's TypeOptions
const mapSeverityToType = (severity: Severity): TypeOptions => {
  switch (severity) {
    case 'success':
      return 'success';
    case 'error':
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    case 'debug':
    default:
      return 'info';
  }
};

// Notification methods
// Helper function to mark a notification as read
const markAsRead = (id: string): void => {
  useNotificationStore.getState().markAsRead(id);
};

const notification: NotificationMethods = {
  // System notifications
  system: (config) => {
    if (!config.message) {
      throw new Error('System notification requires a message');
    }
    
    return createSystemNotification({
      ...config,
      severity: 'severity' in config ? config.severity : 'info',
    });
  },

  // Functional notifications
  functional: (config) => {
    if (!config.message || !config.entity || !config.operation) {
      throw new Error('Functional notification requires message, entity, and operation');
    }
    
    return createFunctionalNotification({
      ...config,
      severity: 'severity' in config ? config.severity : 'info',
    });
  },

  // Severity-based shortcuts
  success: (message, options = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'success',
    });
  },

  error: (message: string, error?: unknown, options: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'message' | 'severity'> = { origin: 'app' }) => {
    const errorMessage = error instanceof Error ? error.message : String(error || message);
    return createSystemNotification({
      ...options,
      message: error ? `${message}: ${errorMessage}` : message,
      severity: 'error',
      context: {
        ...(options.context || {}),
        error: error instanceof Error ? error : new Error(errorMessage)
      },
      origin: options.origin || 'app',
    });
  },

  warning: (message, options = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'warning',
    });
  },

  info: (message, options = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'info',
    });
  },

  critical: (message, options = { origin: 'app' }) => {
    return createSystemNotification({
      ...options,
      message,
      severity: 'critical',
    });
  },

  debug: (message, options = { origin: 'app' }) => {
    if (process.env.NODE_ENV !== 'production') {
      return createSystemNotification({
        ...options,
        message,
        severity: 'debug',
      });
    }
    // In production, just log to console
    console.debug(`[DEBUG] ${message}`, options);
    return null;
  },

  // Operation shortcuts
  operation: {
    create: (entity, message, options = {}) => {
      return createOperationNotification('create', entity, message, options);
    },
    read: (entity, message, options = {}) => {
      return createOperationNotification('read', entity, message, options);
    },
    update: (entity, message, options = {}) => {
      return createOperationNotification('update', entity, message, options);
    },
    delete: (entity, message, options = {}) => {
      return createOperationNotification('delete', entity, message, options);
    },
    sync: (entity, message, options = {}) => {
      return createOperationNotification('sync', entity, message, options);
    },
    validate: (entity, message, options = {}) => {
      return createOperationNotification('validate', entity, message, options);
    },
    process: (entity, message, options = {}) => {
      return createOperationNotification('process', entity, message, options);
    },
  },

  // CRUD shortcuts
  created(entity, message, data) {
    return this.operation.create(entity, message, { data });
  },
  
  // Read operation with markAsRead method
  read(entity: string, message: string, data?: Record<string, unknown>) {
    const result = this.operation.read(entity, message, { data }) as FunctionalNotification & { markAsRead: (id: string) => void };
    result.markAsRead = (id: string) => markAsRead(id);
    return result;
  },
  
  // Mark a notification as read
  markAsRead(id: string): void {
    markAsRead(id);
  },
  
  updated(entity: string, message: string, data?: Record<string, unknown>) {
    return this.operation.update(entity, message, { data });
  },
  
  deleted(entity: string, message: string, data?: Record<string, unknown>) {
    return this.operation.delete(entity, message, { data });
  },
  
  fetched(entity: string, message: string, data?: Record<string, unknown>) {
    return this.functional({
      entity,
      message,
      data,
      operation: 'read',
      severity: 'info'
    });
  }
};

export default notification;
