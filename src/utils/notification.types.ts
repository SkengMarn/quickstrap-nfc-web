// src/types/notification.types.ts

import { ToastOptions as ReactToastifyOptions } from 'react-toastify';

// Core types
export type Severity = 'info' | 'warning' | 'error' | 'critical' | 'success';
export type Operation = 'create' | 'read' | 'update' | 'delete' | 'sync' | 'validate' | 'process';

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
  toastOptions?: ReactToastifyOptions;
}

// System notification interface
export interface SystemNotification extends BaseNotification {
  category: 'system';
  origin: string;
  code?: string;
  context?: Record<string, unknown>;
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

// Extended functional notification with required severity
export interface ExtendedFunctionalNotification extends Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'> {
  severity: Severity;
}

// Options for creating notifications (without auto-generated fields)
export interface SystemNotificationOptions extends Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category'> {}
export interface FunctionalNotificationOptions extends Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'> {}

// Configuration types for simplified notification creation
export interface SystemNotificationConfig extends Partial<Omit<SystemNotificationOptions, 'severity' | 'message'>> {
  severity?: Severity;
}

export interface FunctionalNotificationConfig extends Partial<Omit<FunctionalNotificationOptions, 'severity' | 'message' | 'entity' | 'operation'>> {
  severity?: Severity;
}

// Notification creators interface
export interface NotificationCreators {
  // Core creators
  system: (config: SystemNotificationOptions) => SystemNotification;
  functional: (config: ExtendedFunctionalNotification) => FunctionalNotification;

  // Operation creators
  operation: {
    create: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'> & { severity?: Severity }) => FunctionalNotification;
    read: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'> & { severity?: Severity }) => FunctionalNotification;
    update: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'> & { severity?: Severity }) => FunctionalNotification;
    delete: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'> & { severity?: Severity }) => FunctionalNotification;
    sync: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'> & { severity?: Severity }) => FunctionalNotification;
    validate: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'> & { severity?: Severity }) => FunctionalNotification;
    process: (entity: string, message: string, options?: Omit<FunctionalNotificationOptions, 'message' | 'entity' | 'operation'> & { severity?: Severity }) => FunctionalNotification;
  };

  // Convenience creators
  created: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  updated: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  deleted: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;
  fetched: (entity: string, message: string, data?: Record<string, unknown>) => FunctionalNotification;

  // Severity-based creators
  success: (message: string, options?: SystemNotificationConfig) => SystemNotification;
  error: (message: string, options?: SystemNotificationConfig) => SystemNotification;
  warning: (message: string, options?: SystemNotificationConfig) => SystemNotification;
  info: (message: string, options?: SystemNotificationConfig) => SystemNotification;
}

// Legacy type aliases for backward compatibility (if needed)
export type NotificationSeverity = Severity;
export type OperationType = Operation;
