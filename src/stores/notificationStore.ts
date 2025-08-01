import { create } from 'zustand';
import type { 
  Notification, 
  SystemNotification, 
  FunctionalNotification,
  SystemNotificationConfig,
  FunctionalNotificationConfig,
  Severity
} from '@/types/notification.types';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  add: (notification: Notification) => void;
  addNotification: (notification: Notification) => void; // Alias for add
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
  remove: (id: string) => void;
  getNotifications: () => Notification[];
  getUnreadCount: () => number;
  createSystemNotification: (config: Omit<SystemNotificationConfig, 'severity'>, severity: Severity) => SystemNotification;
  createFunctionalNotification: (config: Omit<FunctionalNotificationConfig, 'severity'>, severity: Severity) => FunctionalNotification;
}

const MAX_NOTIFICATIONS = 100; // Prevent memory issues

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  add: (notification: Notification) => {
    set((state) => {
      const notifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      };
    });
  },
  
  // Alias for add to maintain backward compatibility
  addNotification: function(notification: Notification) {
    return this.add(notification);
  },
  
  createSystemNotification: (config, severity) => {
    const notification: SystemNotification = {
      ...config,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
      category: 'system',
      severity,
      origin: config.origin || 'app',
    };
    get().add(notification);
    return notification;
  },
  
  createFunctionalNotification: (config, severity) => {
    const notification: FunctionalNotification = {
      ...config,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
      category: 'functional',
      severity,
      entity: config.entity,
      operation: config.operation,
    };
    get().add(notification);
    return notification;
  },

  markAsRead: (id: string) => {
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
      notifications: state.notifications.map(notification => ({
        ...notification,
        read: true,
      })),
      unreadCount: 0,
    }));
  },

  clear: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  remove: (id: string) => {
    set((state) => {
      const notifications = state.notifications.filter(n => n.id !== id);
      return {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      };
    });
  },

  getNotifications: () => {
    return get().notifications;
  },

  getUnreadCount: () => {
    return get().unreadCount;
  },
}));
