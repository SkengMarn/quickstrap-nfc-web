import { supabase } from './supabase';

export interface BroadcastMessage {
  id: string;
  event_id: string;
  sender_id: string;
  message: string;
  message_type: 'broadcast' | 'alert' | 'emergency';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  sent_at: string;
  expires_at?: string;
  read_by?: string[];
}

export interface BroadcastNotification {
  id: string;
  message_id: string;
  user_id: string;
  read: boolean;
  read_at?: string;
  delivered_at: string;
}

class BroadcastService {
  private subscriptions: Map<string, any> = new Map();

  /**
   * Send a broadcast message to all users in an event
   */
  async sendBroadcast(
    eventId: string,
    message: string,
    options: {
      type?: 'broadcast' | 'alert' | 'emergency';
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      expiresInMinutes?: number;
    } = {}
  ): Promise<BroadcastMessage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const sentAt = new Date().toISOString();
    const expiresAt = options.expiresInMinutes
      ? new Date(Date.now() + options.expiresInMinutes * 60 * 1000).toISOString()
      : undefined;

    // Create the broadcast message
    const { data: broadcast, error: broadcastError } = await supabase
      .from('staff_messages')
      .insert({
        event_id: eventId,
        sender_id: user.id,
        message,
        message_type: options.type || 'broadcast',
        priority: options.priority || 'normal',
        sent_at: sentAt,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (broadcastError) throw broadcastError;

    // Get all active users/staff for this event
    const { data: eventStaff } = await supabase
      .from('checkin_logs')
      .select('staff_id')
      .eq('event_id', eventId)
      .not('staff_id', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(100);

    // Get unique staff members
    const uniqueStaffIds = [...new Set(eventStaff?.map(s => s.staff_id).filter(Boolean))];

    // Create notifications for each staff member
    if (uniqueStaffIds.length > 0) {
      const notifications = uniqueStaffIds.map(staffId => ({
        user_id: staffId,
        type: 'broadcast_message',
        title: this.getNotificationTitle(options.type || 'broadcast'),
        message: message,
        data: {
          broadcast_id: broadcast.id,
          event_id: eventId,
          priority: options.priority || 'normal',
          sender_id: user.id
        },
        read: false
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return broadcast as BroadcastMessage;
  }

  /**
   * Subscribe to broadcast messages for an event
   * Returns unsubscribe function
   */
  subscribeToBroadcasts(
    eventId: string,
    callback: (message: BroadcastMessage) => void
  ): () => void {

    const channel = supabase
      .channel(`broadcasts:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staff_messages',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const message = payload.new as BroadcastMessage;

          // Check if message is expired
          if (message.expires_at && new Date(message.expires_at) < new Date()) {
            return;
          }

          callback(message);

          // Show browser notification if permission granted
          this.showBrowserNotification(message);
        }
      )
      .subscribe();

    this.subscriptions.set(eventId, channel);

    return () => {
      supabase.removeChannel(channel);
      this.subscriptions.delete(eventId);
    };
  }

  /**
   * Subscribe to notifications for current user
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: any) => void
  ): () => void {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new;
          callback(notification);

          // Auto-show for high priority broadcasts
          if (notification.data?.priority === 'high' || notification.data?.priority === 'urgent') {
            this.showBrowserNotification({
              message: notification.message,
              message_type: 'alert',
              priority: notification.data.priority
            } as any);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Mark a broadcast as read
   */
  async markBroadcastAsRead(broadcastId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('data->>broadcast_id', broadcastId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Get broadcast history for an event
   */
  async getBroadcastHistory(
    eventId: string,
    limit: number = 50
  ): Promise<BroadcastMessage[]> {
    const { data, error } = await supabase
      .from('staff_messages')
      .select('*')
      .eq('event_id', eventId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as BroadcastMessage[];
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(message: BroadcastMessage) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const notification = new Notification(
        this.getNotificationTitle(message.message_type),
        {
          body: message.message,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: message.id,
          requireInteraction: message.priority === 'urgent',
          data: { messageId: message.id }
        }
      );

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  /**
   * Get notification title based on type
   */
  private getNotificationTitle(type: string): string {
    switch (type) {
      case 'emergency':
        return '🚨 Emergency Alert';
      case 'alert':
        return '⚠️ Important Alert';
      case 'broadcast':
      default:
        return '📢 Broadcast Message';
    }
  }

  /**
   * Request browser notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    this.subscriptions.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
  }
}

export const broadcastService = new BroadcastService();
export default broadcastService;
