import { create } from 'zustand';
import type { Notification, SystemNotification, FunctionalNotification, Severity } from '@/types/notification.types';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
  removeNotification: (id: string) => void;
  createSystemNotification: (config: Omit<SystemNotification, 'id' | 'timestamp' | 'read' | 'category'>, severity?: Severity) => SystemNotification;
  createFunctionalNotification: (config: Omit<FunctionalNotification, 'id' | 'timestamp' | 'read' | 'category'>, severity?: Severity) => FunctionalNotification;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => set((state) => {
    const notifications = [notification, ...state.notifications].slice(0, 100);
    return {
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    };
  }),

  markAsRead: (id) => set((state) => {
    const notifications = state.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    return { notifications, unreadCount: notifications.filter(n => !n.read).length };
  }),

  clear: () => set({ notifications: [], unreadCount: 0 }),

  removeNotification: (id) => set((state) => {
    const notifications = state.notifications.filter(n => n.id !== id);
    return { notifications, unreadCount: notifications.filter(n => !n.read).length };
  }),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0
  })),

  createSystemNotification: (config, severity = 'info') => {
    const notification: SystemNotification = {
      ...config,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
      category: 'system',
      severity,
      origin: config.origin || 'app',
    };
    get().addNotification(notification);
    return notification;
  },

  createFunctionalNotification: (config, severity = 'info') => {
    const notification: FunctionalNotification = {
      ...config,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
      category: 'functional',
      severity,
      origin: config.origin || 'app',
    };
    get().addNotification(notification);
    return notification;
  },
}));
