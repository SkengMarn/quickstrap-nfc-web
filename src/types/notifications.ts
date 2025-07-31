import { ToastOptions } from 'react-toastify';

export type NotificationSeverity = 'critical' | 'error' | 'warning' | 'info' | 'debug';
export type OperationType = 
  // CRUD operations
  | 'create' | 'read' | 'update' | 'delete'
  
  // Auth operations
  | 'login' | 'logout' | 'register' | 'password_reset'
  
  // Notification types
  | 'notify' | 'success' | 'error' | 'info' | 'warning'
  
  // System operations
  | 'network_error' | 'config_load' | 'auth_error' | 'app_start' | 'session_timeout' | 'access_grant' | 'access_revoke';

export interface BaseNotification {
  id: string;
  timestamp: Date;
  read: boolean;
  category: 'system' | 'functional';
  message: string;
  context?: Record<string, unknown>;
  logToConsole?: boolean;
  showInUI?: boolean;
}

export interface SystemNotification extends BaseNotification {
  category: 'system';
  origin: string;
  severity: NotificationSeverity;
  code?: string;
}

export interface FunctionalNotification extends BaseNotification {
  category: 'functional';
  entity: string;
  operation: OperationType;
  technicalDetails?: string;
  data?: Record<string, unknown>;
}

export interface SystemNotificationConfig extends Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category'> {}
export interface FunctionalNotificationConfig extends Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'> {}

export interface NotificationMethods {
  // System notifications
  system: (config: Omit<SystemNotificationConfig, 'category'>) => SystemNotification;
  
  // Functional notifications
  functional: (config: Omit<FunctionalNotificationConfig, 'category'>) => FunctionalNotification;
  
  // Legacy methods for backward compatibility
  success: (message: string, options?: ToastOptions) => SystemNotification;
  error: (message: string, error?: unknown, options?: ToastOptions) => SystemNotification;
  info: (message: string, options?: ToastOptions) => SystemNotification;
  warning: (message: string, options?: ToastOptions) => SystemNotification;
  notify: (message: string, options?: ToastOptions) => SystemNotification;
  
  // Operation-specific methods
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
