import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { broadcastService, BroadcastMessage } from '../services/broadcastService';
import { toast } from 'react-toastify';

export interface UseBroadcastNotificationsOptions {
  eventId?: string;
  onMessage?: (message: BroadcastMessage) => void;
  autoRequestPermission?: boolean;
}

export function useBroadcastNotifications(options: UseBroadcastNotificationsOptions = {}) {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Request notification permission
  const requestPermission = useCallback(async () => {
    const perm = await broadcastService.requestNotificationPermission();
    setPermission(perm);
    return perm;
  }, []);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await broadcastService.markBroadcastAsRead(messageId, user.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  // Load broadcast history
  const loadHistory = useCallback(async (eventId: string) => {
    try {
      const history = await broadcastService.getBroadcastHistory(eventId);
      setMessages(history);

      // Count unread messages
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: notifications } = await supabase
          .from('notifications')
          .select('read')
          .eq('user_id', user.id)
          .eq('type', 'broadcast_message')
          .eq('read', false);

        setUnreadCount(notifications?.length || 0);
      }
    } catch (error) {
      console.error('Error loading broadcast history:', error);
    }
  }, []);

  useEffect(() => {
    if (options.autoRequestPermission && permission === 'default') {
      requestPermission();
    }
  }, [options.autoRequestPermission, permission, requestPermission]);

  useEffect(() => {
    if (!options.eventId) return;

    let unsubscribeNotifications: (() => void) | null = null;

    // Subscribe to broadcasts for the event
    const unsubscribeBroadcasts = broadcastService.subscribeToBroadcasts(
      options.eventId,
      (message) => {
        setMessages(prev => [message, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show toast notification
        const priority = message.priority;
        const toastOptions = {
          autoClose: priority === 'urgent' ? false : (priority === 'high' ? 10000 : 5000) as number | false
        };

        if (priority === 'urgent') {
          toast.error(`🚨 ${message.message}`, toastOptions);
        } else if (priority === 'high') {
          toast.warning(`⚠️ ${message.message}`, toastOptions);
        } else {
          toast.info(`📢 ${message.message}`, toastOptions);
        }

        // Call custom callback if provided
        if (options.onMessage) {
          options.onMessage(message);
        }
      }
    );

    // Subscribe to user notifications
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        unsubscribeNotifications = broadcastService.subscribeToNotifications(
          user.id,
          (notification) => {
            if (notification.type === 'broadcast_message') {
              setUnreadCount(prev => prev + 1);
            }
          }
        );
      }
    });

    setIsConnected(true);

    // Load initial history
    loadHistory(options.eventId);

    return () => {
      unsubscribeBroadcasts();
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
      }
      setIsConnected(false);
    };
  }, [options.eventId, options.onMessage, loadHistory]);

  return {
    messages,
    unreadCount,
    isConnected,
    permission,
    requestPermission,
    markAsRead,
    loadHistory
  };
}

export default useBroadcastNotifications;
