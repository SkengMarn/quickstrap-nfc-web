import { TypeOptions, ToastPosition, ToastClassName, ToastOptions as ReactToastifyOptions } from 'react-toastify';

// Extend the ToastClassName type to include string for backward compatibility
type ExtendedToastClassName = ToastClassName | string | ((context: any) => string);

export type ToastOptions = Omit<ReactToastifyOptions, 'type' | 'position' | 'className'> & {
  type?: TypeOptions;
  position?: ToastPosition;
  'data-entity'?: string;
  'data-operation'?: string;
  className?: ExtendedToastClassName;
  autoClose?: number | false;
};

export type NotificationSeverity = 'critical' | 'error' | 'warning' | 'info' | 'debug';

export type OperationType = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'register' 
  | 'password_reset'
  | 'access_grant'
  | 'access_revoke'
  | 'app_start'
  | 'session_timeout'
  | 'network_error'
  | 'config_load'
  | 'auth_error'
  | 'notify'
  | 'info'
  | 'success'
  | 'error'
  | 'warning';

export type Severity = 'critical' | 'error' | 'warning' | 'info' | 'debug';
export type NotificationCategory = 'system' | 'functional';

export interface BaseNotification {
  id: string;
  timestamp: Date;
  read: boolean;
  category: NotificationCategory;
  logToConsole?: boolean;
  showInUI?: boolean;
  context?: Record<string, unknown>;
  message: string;
  toastOptions?: ReactToastifyOptions;
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
  technicalDetails?: string;
  data?: Record<string, unknown>;
  severity: NotificationSeverity; // Made required to match usage in notifications.ts
}

export type Notification = SystemNotification | FunctionalNotification;

// Helper types for notification creation
export interface NotificationOptions {
  logToConsole?: boolean;
  showInUI?: boolean;
  context?: Record<string, unknown>;
  toastOptions?: ReactToastifyOptions;
}

export interface SystemNotificationOptions extends NotificationOptions {
  code?: string;
  severity?: Severity;
  origin?: string;
}

export interface FunctionalNotificationOptions extends NotificationOptions {
  entity: string;
  technicalDetails?: string;
  data?: Record<string, unknown>;
  operation?: OperationType;
}

export interface NotificationMethods {
  // System notifications
  system: (config: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category'>) => SystemNotification;
  
  // Functional notifications
  functional: (config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'>) => FunctionalNotification;
  
  // Legacy methods for backward compatibility
  success: (message: string, options?: ToastOptions) => SystemNotification;
  error: (message: string, error?: unknown, options?: ToastOptions) => SystemNotification;
  info: (message: string, options?: ToastOptions) => SystemNotification;
  warning: (message: string, options?: ToastOptions) => SystemNotification;
  notify: (message: string, options?: ToastOptions) => SystemNotification;
  
  // CRUD operations
  created: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  updated: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  deleted: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  fetched: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  
  // Operation shortcuts
  create: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  read: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  update: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  delete: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  
  // Auth operations
  login: (message: string, data?: Record<string, unknown>) => FunctionalNotification;
  logout: (message: string, data?: Record<string, unknown>) => FunctionalNotification;
  register: (message: string, data?: Record<string, unknown>) => FunctionalNotification;
  passwordReset: (message: string, data?: Record<string, unknown>) => FunctionalNotification;
}
