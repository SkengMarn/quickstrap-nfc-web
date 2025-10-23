import { supabase } from './supabase';

// ============================================================================
// APP SESSION SERVICE
// ============================================================================
// Handles mobile app login tracking and session management

export interface AppLoginRequest {
  userId: string;
  organizationId: string;
  platform: 'ios' | 'android';
  appVersion?: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: string;
  loginMethod?: 'password' | 'biometric' | 'token';
  eventId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AppActivityUpdate {
  userId: string;
  eventId?: string;
  deviceId?: string;
}

export const appSessionService = {
  /**
   * Track app login - Called when user logs into the NFC mobile app
   */
  async trackAppLogin(request: AppLoginRequest): Promise<{ sessionId: string }> {
    try {
      const { data, error } = await supabase.rpc('track_app_login', {
        p_user_id: request.userId,
        p_organization_id: request.organizationId,
        p_platform: request.platform,
        p_app_version: request.appVersion || null,
        p_device_id: request.deviceId || null,
        p_device_name: request.deviceName || null,
        p_device_type: request.deviceType || 'mobile',
        p_login_method: request.loginMethod || 'password',
        p_event_id: request.eventId || null,
        p_user_agent: request.userAgent || null,
        p_ip_address: request.ipAddress || null
      });

      if (error) {
        console.error('Error tracking app login:', error);
        throw error;
      }

      return { sessionId: data };
    } catch (error) {
      console.error('Failed to track app login:', error);
      throw error;
    }
  },

  /**
   * Update app activity - Called periodically to keep session alive
   */
  async updateAppActivity(update: AppActivityUpdate): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_app_activity', {
        p_user_id: update.userId,
        p_event_id: update.eventId || null,
        p_device_id: update.deviceId || null
      });

      if (error) {
        console.error('Error updating app activity:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update app activity:', error);
      throw error;
    }
  },

  /**
   * End app session - Called when user logs out of the mobile app
   */
  async endAppSession(userId: string, deviceId?: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('end_app_session', {
        p_user_id: userId,
        p_device_id: deviceId || null
      });

      if (error) {
        console.error('Error ending app session:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to end app session:', error);
      throw error;
    }
  },

  /**
   * Get all active users (both web and app)
   */
  async getAllActiveUsers(organizationId?: string) {
    try {
      let query = supabase
        .from('all_active_users')
        .select('*')
        .order('last_activity_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching active users:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch active users:', error);
      throw error;
    }
  },

  /**
   * Get active app sessions only
   */
  async getActiveAppSessions(organizationId?: string) {
    try {
      let query = supabase
        .from('all_active_users')
        .select('*')
        .eq('login_source', 'app')
        .order('last_activity_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching active app sessions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch active app sessions:', error);
      throw error;
    }
  },

  /**
   * Get session statistics
   */
  async getSessionStats(organizationId?: string) {
    try {
      let query = supabase
        .from('all_active_users')
        .select('login_source, platform, device_type');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        web: data?.filter(s => s.login_source === 'web').length || 0,
        app: data?.filter(s => s.login_source === 'app').length || 0,
        ios: data?.filter(s => s.platform === 'ios').length || 0,
        android: data?.filter(s => s.platform === 'android').length || 0,
        desktop: data?.filter(s => s.device_type === 'desktop').length || 0,
        mobile: data?.filter(s => s.device_type === 'mobile').length || 0,
        tablet: data?.filter(s => s.device_type === 'tablet').length || 0
      };

      return stats;
    } catch (error) {
      console.error('Failed to fetch session stats:', error);
      throw error;
    }
  }
};
