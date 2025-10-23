import { supabase } from './supabase';

export interface ShutdownToken {
  token: string;
  expires_at: string;
}

export interface SystemStatus {
  status: 'operational' | 'maintenance' | 'shutting_down' | 'shutdown';
  message: string;
  updated_at: string;
}

export interface ShutdownEvent {
  id: string;
  event_type: string;
  initiated_by: string;
  token_id?: string;
  reason: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  password_verified: boolean;
  token_verified: boolean;
  created_at: string;
  completed_at?: string;
}

class SystemShutdownService {
  /**
   * Check if current user is admin
   */
  async isAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .eq('status', 'active')
      .single();

    return !!data;
  }

  /**
   * Generate a one-time shutdown token
   * Requires admin permissions
   */
  async generateShutdownToken(validMinutes: number = 30): Promise<ShutdownToken> {
    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      throw new Error('Insufficient permissions. Admin access required.');
    }

    const { data, error } = await supabase.rpc('generate_shutdown_token', {
      p_valid_minutes: validMinutes
    });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Failed to generate token');

    return {
      token: data[0].token,
      expires_at: data[0].expires_at
    };
  }

  /**
   * Verify password and shutdown token
   */
  async verifyCredentials(token: string, password: string): Promise<{
    verified: boolean;
    message: string;
  }> {
    const { data, error } = await supabase.rpc('verify_shutdown_credentials', {
      p_token: token,
      p_password: password
    });

    if (error) throw error;
    if (!data || data.length === 0) {
      return { verified: false, message: 'Verification failed' };
    }

    return {
      verified: data[0].verified,
      message: data[0].message
    };
  }

  /**
   * Execute system shutdown
   * Requires verified token and password
   */
  async executeShutdown(token: string, reason: string = 'Manual shutdown'): Promise<{
    success: boolean;
    message: string;
    shutdown_event_id?: string;
  }> {
    const { data, error } = await supabase.rpc('execute_system_shutdown', {
      p_token: token,
      p_reason: reason
    });

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, message: 'Shutdown execution failed' };
    }

    const result = data[0];

    if (result.success) {
      // Broadcast shutdown to all connected clients
      await this.broadcastShutdown(reason);
    }

    return {
      success: result.success,
      message: result.message,
      shutdown_event_id: result.shutdown_event_id
    };
  }

  /**
   * Broadcast shutdown notification to all clients
   */
  private async broadcastShutdown(reason: string): Promise<void> {
    // Update system status to trigger real-time updates
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('system_status')
      .update({
        status: 'shutting_down',
        message: reason,
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', (await supabase.from('system_status').select('id').limit(1).single()).data?.id);

    // Send notifications to all active users
    const { data: activeUsers } = await supabase
      .from('profiles')
      .select('id')
      .limit(1000);

    if (activeUsers && activeUsers.length > 0) {
      const notifications = activeUsers.map(u => ({
        user_id: u.id,
        type: 'system_shutdown',
        title: '🚨 System Shutdown',
        message: `System is shutting down: ${reason}`,
        data: {
          priority: 'urgent',
          action: 'shutdown'
        },
        read: false
      }));

      await supabase.from('notifications').insert(notifications);
    }
  }

  /**
   * Get current system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const { data, error } = await supabase.rpc('get_system_status');

    if (error) throw error;
    if (!data || data.length === 0) {
      return {
        status: 'operational',
        message: 'System is running normally',
        updated_at: new Date().toISOString()
      };
    }

    return data[0] as SystemStatus;
  }

  /**
   * Subscribe to system status changes
   */
  subscribeToSystemStatus(callback: (status: SystemStatus) => void): () => void {
    const channel = supabase
      .channel('system_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_status'
        },
        async (payload) => {
          const newStatus = payload.new as any;
          callback({
            status: newStatus.status,
            message: newStatus.message,
            updated_at: newStatus.updated_at
          });

          // If system is shutting down, show urgent notification
          if (newStatus.status === 'shutting_down' || newStatus.status === 'shutdown') {
            this.showShutdownNotification(newStatus.message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Show browser notification for shutdown
   */
  private showShutdownNotification(message: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('🚨 SYSTEM SHUTDOWN', {
        body: message,
        icon: '/logo.png',
        badge: '/logo.png',
        requireInteraction: true,
        tag: 'system-shutdown'
      });

      notification.onclick = () => {
        window.location.reload();
      };
    }
  }

  /**
   * Get shutdown event history (admin only)
   */
  async getShutdownHistory(limit: number = 50): Promise<ShutdownEvent[]> {
    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      throw new Error('Insufficient permissions');
    }

    const { data, error } = await supabase
      .from('system_shutdown_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ShutdownEvent[];
  }

  /**
   * Cancel shutdown (if still in progress)
   */
  async cancelShutdown(shutdownEventId: string, reason: string): Promise<void> {
    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      throw new Error('Insufficient permissions');
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Update shutdown event status
    await supabase
      .from('system_shutdown_events')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', shutdownEventId)
      .eq('status', 'in_progress');

    // Log cancellation
    await supabase
      .from('system_shutdown_events')
      .insert({
        event_type: 'shutdown_cancelled',
        initiated_by: user?.id,
        reason: reason,
        status: 'completed'
      });

    // Restore system status
    await supabase
      .from('system_status')
      .update({
        status: 'operational',
        message: 'System shutdown cancelled',
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', (await supabase.from('system_status').select('id').limit(1).single()).data?.id);
  }

  /**
   * Revoke an unused token
   */
  async revokeToken(tokenId: string, reason: string): Promise<void> {
    const isAdmin = await this.isAdmin();
    if (!isAdmin) {
      throw new Error('Insufficient permissions');
    }

    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('system_shutdown_tokens')
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_by: user?.id,
        revoke_reason: reason
      })
      .eq('id', tokenId)
      .eq('used', false);
  }
}

export const systemShutdownService = new SystemShutdownService();
export default systemShutdownService;
