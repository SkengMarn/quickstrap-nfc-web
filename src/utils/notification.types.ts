import { ToastOptions } from 'react-toastify';

export type OperationType = 
  | 'create' | 'read' | 'update' | 'delete' 
  | 'login' | 'logout' | 'register' | 'password_reset'
  | 'access_grant' | 'access_revoke' | 'app_start'
  | 'session_timeout' | 'network_error' | 'config_load'
  | 'auth_error' | 'notify' | 'info' | 'success' | 'error' | 'warning';

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
  toastOptions?: {
    autoClose?: number | false;
    className?: string;
    [key: string]: any;
  };
}

export type Notification = SystemNotification | FunctionalNotification;
