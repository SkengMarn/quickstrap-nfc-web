// Mock notification store - properly typed
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

// Mock store that returns empty data but with proper types
export const useNotificationStore = (): NotificationStore => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (_notification: Notification) => {},
  markAsRead: (_id: string) => {},
  markAllAsRead: () => {},
  clear: () => {},
  removeNotification: (_id: string) => {},
  createSystemNotification: (config, severity = 'info') => ({
    ...config,
    id: Math.random().toString(36),
    timestamp: new Date(),
    read: false,
    category: 'system' as const,
    severity
  }),
  createFunctionalNotification: (config, severity = 'info') => ({
    ...config,
    id: Math.random().toString(36),
    timestamp: new Date(),
    read: false,
    category: 'functional' as const,
    severity
  })
});

export default useNotificationStore;
