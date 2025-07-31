import { create } from 'zustand';

export type NotificationSeverity = 'critical' | 'error' | 'warning' | 'info' | 'debug' | 'success';
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
  | 'success';

export type NotificationCategory = 'system' | 'functional';

export interface ToastOptions {
  autoClose?: number | false;
  className?: string;
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
  hideProgressBar?: boolean;
  closeOnClick?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
  progress?: number | undefined;
  closeButton?: boolean;
  [key: string]: any;
}

export interface BaseNotification {
  id: string;
  timestamp: Date;
  read: boolean;
  category: 'system' | 'functional';
  logToConsole?: boolean;
  showInUI?: boolean;
  context?: Record<string, unknown>;
  message: string;
}

export interface SystemNotification extends BaseNotification {
  category: 'system';
  code?: string;
  origin: string;
  severity: NotificationSeverity;
  toastOptions?: ToastOptions;
}

export interface FunctionalNotification extends BaseNotification {
  category: 'functional';
  entity: string;
  operation: OperationType;
  severity: NotificationSeverity;
  technicalDetails?: string;
  data?: Record<string, unknown>;
  toastOptions?: ToastOptions;
}

export type Notification = SystemNotification | FunctionalNotification;

export interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

const MAX_NOTIFICATIONS = 100; // Prevent memory issues

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    // Create a properly typed notification based on the category
    const newNotification: Notification = notification.category === 'system'
      ? {
          ...notification as Omit<SystemNotification, 'id' | 'timestamp' | 'read'>,
          id: Date.now().toString(),
          timestamp: new Date(),
          read: false,
        }
      : {
          ...notification as Omit<FunctionalNotification, 'id' | 'timestamp' | 'read'>,
          id: Date.now().toString(),
          timestamp: new Date(),
          read: false,
        };

    set((state) => {
      const notifications = [newNotification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      );
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(notification => ({ ...notification, read: true })),
      unreadCount: 0,
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  removeNotification: (id) => {
    set((state) => {
      const notifications = state.notifications.filter(n => n.id !== id);
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      };
    });
  },
}));
