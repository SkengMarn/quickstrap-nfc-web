import { ToastOptions as ReactToastifyOptions, ToastClassName, ToastPosition, TypeOptions } from 'react-toastify';

// Core types
export type Severity = 'info' | 'warning' | 'error' | 'critical' | 'success' | 'debug';

export const Operations = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  SYNC: 'sync',
  VALIDATE: 'validate',
  PROCESS: 'process',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_RESET: 'password_reset',
  ACCESS_GRANT: 'access_grant',
  ACCESS_REVOKE: 'access_revoke',
  EMAIL_VERIFICATION: 'email_verification',
  STATUS_CHANGE: 'status_change'
} as const;

export type Operation = typeof Operations[keyof typeof Operations];

// Extend React Toastify options with our custom props
export interface ToastOptions extends Omit<ReactToastifyOptions, 'type' | 'draggable' | 'progress'> {
  type?: TypeOptions;
  position?: ToastPosition;
  autoClose?: number | false;
  hideProgressBar?: boolean;
  closeOnClick?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
  progress?: number | undefined;
  className?: ToastClassName | string | ((context: any) => string);
  'data-notification-type'?: string;
  'data-entity'?: string;
  'data-operation'?: string;
}

// Base notification interface
export interface BaseNotification {
  id: string;
  timestamp: Date;
  read: boolean;
  category: 'system' | 'functional';
  severity: Severity;
  message: string;
  logToConsole?: boolean;
  showInUI?: boolean;
  toastOptions?: ToastOptions;
  context?: Record<string, unknown>;
  origin?: string;
}

// System notification interface
export interface SystemNotification extends BaseNotification {
  category: 'system';
  origin: string;
  code?: string;
}

// Functional notification interface
export interface FunctionalNotification extends BaseNotification {
  category: 'functional';
  entity: string;
  operation: Operation;
  technicalDetails?: string;
  data?: Record<string, unknown>;
}

// Union type for all notifications
export type Notification = SystemNotification | FunctionalNotification;

// Notification configuration types
export interface SystemNotificationConfig extends Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'severity'> {
  severity?: Severity;
}

export interface FunctionalNotificationConfig extends Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'severity'> {
  severity?: Severity;
}

// Notification methods interface
export interface NotificationMethods {
  // System notifications
  system(config: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category'>): SystemNotification;

  // Functional notifications
  functional(config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'>): FunctionalNotification;

  // Severity-based shortcuts
  success(message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>): SystemNotification;
  error(message: string, error?: unknown, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>): SystemNotification;
  warning(message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>): SystemNotification;
  info(message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>): SystemNotification;
  critical(message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>): SystemNotification;
  debug(message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>): SystemNotification;

  // CRUD operations
  created(entity: string, message: string, data?: Record<string, unknown>): FunctionalNotification;
  read(entity: string, message: string, data?: Record<string, unknown>): FunctionalNotification;
  updated(entity: string, message: string, data?: Record<string, unknown>): FunctionalNotification;
  deleted(entity: string, message: string, data?: Record<string, unknown>): FunctionalNotification;

  // Operation shortcuts
  operation: {
    create(entity: string, message: string, options?: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message' | 'severity'>): FunctionalNotification;
    read(entity: string, message: string, options?: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message' | 'severity'>): FunctionalNotification;
    update(entity: string, message: string, options?: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message' | 'severity'>): FunctionalNotification;
    delete(entity: string, message: string, options?: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message' | 'severity'>): FunctionalNotification;
    sync(entity: string, message: string, options?: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message' | 'severity'>): FunctionalNotification;
    validate(entity: string, message: string, options?: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message' | 'severity'>): FunctionalNotification;
    process(entity: string, message: string, options?: Omit<FunctionalNotificationConfig, 'entity' | 'operation' | 'message' | 'severity'>): FunctionalNotification;
  };
}

export type NotificationCreators = {
  // Core creators
  system: (config: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category' | 'severity'>, severity: Severity) => SystemNotification;
  functional: (config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category' | 'severity'>, severity: Severity) => FunctionalNotification;

  // Operation-specific creators
  operation: {
    [K in Operation]: (
      entity: string,
      message: string,
      options?: Omit<FunctionalNotificationConfig, 'message' | 'entity' | 'operation' | 'severity'>
    ) => FunctionalNotification;
  };

  // Severity-based creators
  success: (message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>) => SystemNotification;
  error: (message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>) => SystemNotification;
  info: (message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>) => SystemNotification;
  warning: (message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>) => SystemNotification;
  critical: (message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>) => SystemNotification;
  debug: (message: string, options?: Omit<SystemNotificationConfig, 'message' | 'severity'>) => SystemNotification;

  // Convenience creators for common operations
  created: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  updated: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  deleted: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  fetched: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
};

export type NotificationSeverity = Severity;
