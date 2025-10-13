import { supabase } from './supabase';

export interface StaffMember {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  last_sign_in_at?: string;
  is_online?: boolean;
}

export interface EventAccess {
  id: string;
  event_id: string;
  user_id: string;
  access_level: 'admin' | 'scanner' | 'read_only';
  assigned_at: string;
  assigned_by: string;
  is_active: boolean;
  user?: StaffMember;
}

export interface StaffActivity {
  user_id: string;
  event_id: string;
  last_activity: string;
  total_scans: number;
  current_gate?: string;
  is_online: boolean;
}

class StaffService {
  // Get all staff assigned to an event
  async getEventStaff(eventId: string): Promise<EventAccess[]> {
    const { data, error } = await supabase
      .from('event_access')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Assign staff to event
  async assignStaffToEvent(
    eventId: string, 
    userId: string, 
    accessLevel: 'admin' | 'scanner' | 'read_only'
  ): Promise<void> {
    const { data: currentUser } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('event_access')
      .insert({
        event_id: eventId,
        user_id: userId,
        access_level: accessLevel,
        assigned_by: currentUser.user?.id
      });

    if (error) throw error;

    // Log the assignment
    await this.logStaffAction(eventId, userId, 'staff_assigned', {
      access_level: accessLevel,
      assigned_by: currentUser.user?.id
    });
  }

  // Remove staff from event
  async removeStaffFromEvent(accessId: string): Promise<void> {
    const { data: access } = await supabase
      .from('event_access')
      .select('event_id, user_id')
      .eq('id', accessId)
      .single();

    const { error } = await supabase
      .from('event_access')
      .update({ is_active: false })
      .eq('id', accessId);

    if (error) throw error;

    // Log the removal
    if (access) {
      await this.logStaffAction(access.event_id, access.user_id, 'staff_removed', {
        access_id: accessId
      });
    }
  }

  // Update staff access level
  async updateStaffAccessLevel(
    accessId: string, 
    newLevel: 'admin' | 'scanner' | 'read_only'
  ): Promise<void> {
    const { data: access } = await supabase
      .from('event_access')
      .select('event_id, user_id, access_level')
      .eq('id', accessId)
      .single();

    const { error } = await supabase
      .from('event_access')
      .update({ access_level: newLevel })
      .eq('id', accessId);

    if (error) throw error;

    // Log the change
    if (access) {
      await this.logStaffAction(access.event_id, access.user_id, 'access_level_changed', {
        old_level: access.access_level,
        new_level: newLevel
      });
    }
  }

  // Invite new staff member
  async inviteStaffMember(
    email: string, 
    eventId: string, 
    eventName: string,
    accessLevel: 'admin' | 'scanner' | 'read_only'
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === email);

      if (existingUser) {
        // User exists, just assign them
        await this.assignStaffToEvent(eventId, existingUser.id, accessLevel);
        return { success: true, user: existingUser };
      }

      // Create new user invitation
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          invited_for_event: eventId,
          invited_for_event_name: eventName,
          default_access_level: accessLevel,
          role: 'staff'
        }
      });

      if (error) throw error;

      // Assign them to the event
      if (data.user) {
        await this.assignStaffToEvent(eventId, data.user.id, accessLevel);
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Get staff activity/performance data
  async getStaffActivity(eventId: string): Promise<StaffActivity[]> {
    const { data, error } = await supabase
      .from('checkin_logs')
      .select(`
        staff_id,
        created_at,
        location
      `)
      .eq('event_id', eventId)
      .not('staff_id', 'is', null);

    if (error) throw error;

    // Process activity data
    const activityMap = new Map<string, StaffActivity>();
    
    data?.forEach(log => {
      const staffId = log.staff_id;
      if (!activityMap.has(staffId)) {
        activityMap.set(staffId, {
          user_id: staffId,
          event_id: eventId,
          last_activity: log.created_at,
          total_scans: 0,
          current_gate: log.location,
          is_online: false
        });
      }
      
      const activity = activityMap.get(staffId)!;
      activity.total_scans++;
      
      // Update last activity if this is more recent
      if (new Date(log.created_at) > new Date(activity.last_activity)) {
        activity.last_activity = log.created_at;
        activity.current_gate = log.location;
      }
    });

    // Check online status (active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    activityMap.forEach(activity => {
      activity.is_online = new Date(activity.last_activity) > fiveMinutesAgo;
    });

    return Array.from(activityMap.values());
  }

  // Check if user has access to event
  async checkEventAccess(
    userId: string, 
    eventId: string
  ): Promise<{ hasAccess: boolean; accessLevel?: string }> {
    const { data, error } = await supabase
      .from('event_access')
      .select('access_level')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { hasAccess: false };
    }

    return { hasAccess: true, accessLevel: data.access_level };
  }

  // Get events user has access to (for app)
  async getUserEvents(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('event_access')
      .select(`
        access_level,
        events (
          id,
          name,
          description,
          location,
          start_date,
          end_date,
          config
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  // Send message to staff
  async sendMessageToStaff(
    eventId: string, 
    staffIds: string[], 
    message: string,
    priority: 'low' | 'normal' | 'high' | 'emergency' = 'normal'
  ): Promise<void> {
    // This would integrate with a push notification service
    // For now, we'll log it in the audit trail
    const { data: currentUser } = await supabase.auth.getUser();
    
    for (const staffId of staffIds) {
      await this.logStaffAction(eventId, staffId, 'message_sent', {
        message,
        priority,
        sent_by: currentUser.user?.id
      });
    }
  }

  // Log staff-related actions
  private async logStaffAction(
    eventId: string,
    userId: string,
    action: string,
    metadata: any
  ): Promise<void> {
    const { data: currentUser } = await supabase.auth.getUser();
    
    await supabase
      .from('audit_log')
      .insert({
        event_id: eventId,
        user_id: currentUser.user?.id,
        action,
        table_name: 'event_access',
        record_id: userId,
        new_values: metadata
      });
  }

  // Real-time subscription for staff changes
  subscribeToStaffChanges(eventId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`staff_changes_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_access',
          filter: `event_id=eq.${eventId}`
        },
        callback
      )
      .subscribe();
  }

  // Get staff online status
  async getStaffOnlineStatus(eventId: string): Promise<{ [userId: string]: boolean }> {
    // This would integrate with presence tracking
    // For now, return based on recent activity
    const activity = await this.getStaffActivity(eventId);
    const status: { [userId: string]: boolean } = {};
    
    activity.forEach(a => {
      status[a.user_id] = a.is_online;
    });
    
    return status;
  }
}

export const staffService = new StaffService();
