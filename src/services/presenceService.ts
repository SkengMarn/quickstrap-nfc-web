import { supabase } from './supabase';
import {
  ActiveSession,
  ResourceLock,
  LockAcquisitionRequest,
  CollaborationActivity,
  CollaborationActivityType
} from '../types/phase1';

// ============================================================================
// PRESENCE & COLLABORATION SERVICE
// ============================================================================

export const presenceService = {
  // ==========================================================================
  // ACTIVE SESSIONS
  // ==========================================================================

  /**
   * Create or update user's active session
   */
  async updateSession(location: {
    route: string;
    resourceType?: string;
    resourceId?: string;
  }): Promise<ActiveSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current organization
    const currentOrgId = localStorage.getItem('current_organization_id');

    // Check for existing session
    const { data: existing } = await supabase
      .from('active_sessions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Update existing session
      const { data, error } = await supabase
        .from('active_sessions')
        .update({
          organization_id: currentOrgId,
          current_route: location.route,
          current_resource_type: location.resourceType || null,
          current_resource_id: location.resourceId || null,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as ActiveSession;
    } else {
      // Create new session
      const { data, error } = await supabase
        .from('active_sessions')
        .insert({
          user_id: user.id,
          organization_id: currentOrgId,
          current_route: location.route,
          current_resource_type: location.resourceType || null,
          current_resource_id: location.resourceId || null,
          ip_address: null, // Could get from request
          user_agent: navigator.userAgent,
          device_type: this.getDeviceType()
        })
        .select()
        .single();

      if (error) throw error;
      return data as ActiveSession;
    }
  },

  /**
   * Get device type from user agent
   */
  getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi/i.test(ua)) return 'mobile';
    return 'desktop';
  },

  /**
   * Get all active sessions for an organization
   */
  async getOrganizationSessions(organizationId: string): Promise<ActiveSession[]> {
    const { data, error } = await supabase
      .from('active_sessions')
      .select(`
        *,
        user:profiles!active_sessions_user_id_fkey(id, email, full_name)
      `)
      .eq('organization_id', organizationId)
      .gte('last_activity_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Active in last 15 mins
      .order('last_activity_at', { ascending: false });

    if (error) throw error;
    return data as unknown as ActiveSession[];
  },

  /**
   * Get who's viewing a specific resource
   */
  async getResourceViewers(
    resourceType: string,
    resourceId: string
  ): Promise<ActiveSession[]> {
    const { data, error } = await supabase
      .from('active_sessions')
      .select(`
        *,
        user:profiles!active_sessions_user_id_fkey(id, email, full_name)
      `)
      .eq('current_resource_type', resourceType)
      .eq('current_resource_id', resourceId)
      .gte('last_activity_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Active in last 5 mins
      .order('last_activity_at', { ascending: false });

    if (error) throw error;
    return data as unknown as ActiveSession[];
  },

  /**
   * End user's session (on logout)
   */
  async endSession(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('active_sessions')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // ==========================================================================
  // RESOURCE LOCKS
  // ==========================================================================

  /**
   * Acquire lock on a resource
   */
  async acquireLock(request: LockAcquisitionRequest): Promise<ResourceLock> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if resource is already locked
    const existing = await this.getResourceLock(request.resource_type, request.resource_id);

    if (existing) {
      // Check if lock is expired
      if (new Date(existing.expires_at) > new Date()) {
        // Lock is still valid
        if (existing.locked_by_user_id === user.id) {
          // User already owns the lock, extend it
          return this.extendLock(existing.id, request.duration_minutes);
        } else {
          throw new Error(
            `Resource is locked by another user until ${new Date(existing.expires_at).toLocaleString()}`
          );
        }
      } else {
        // Lock expired, delete it
        await supabase
          .from('resource_locks')
          .delete()
          .eq('id', existing.id);
      }
    }

    // Acquire new lock
    const durationMinutes = request.duration_minutes || 15;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from('resource_locks')
      .insert({
        resource_type: request.resource_type,
        resource_id: request.resource_id,
        locked_by_user_id: user.id,
        lock_reason: request.lock_reason || 'editing',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as ResourceLock;
  },

  /**
   * Get lock on a resource
   */
  async getResourceLock(
    resourceType: string,
    resourceId: string
  ): Promise<ResourceLock | null> {
    const { data, error } = await supabase
      .from('resource_locks')
      .select(`
        *,
        locked_by_user:profiles!resource_locks_locked_by_user_id_fkey(id, email, full_name)
      `)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as unknown as ResourceLock;
  },

  /**
   * Release lock
   */
  async releaseLock(resourceType: string, resourceId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('resource_locks')
      .delete()
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('locked_by_user_id', user.id);

    if (error) throw error;
  },

  /**
   * Extend lock duration
   */
  async extendLock(lockId: string, additionalMinutes: number = 15): Promise<ResourceLock> {
    const expiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from('resource_locks')
      .update({ expires_at: expiresAt.toISOString() })
      .eq('id', lockId)
      .select()
      .single();

    if (error) throw error;
    return data as ResourceLock;
  },

  /**
   * Check if current user can edit resource
   */
  async canEdit(resourceType: string, resourceId: string): Promise<{
    canEdit: boolean;
    lockedBy?: { id: string; email: string; full_name: string };
    expiresAt?: string;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canEdit: false };

    const lock = await this.getResourceLock(resourceType, resourceId);

    if (!lock) {
      return { canEdit: true };
    }

    // Check if lock is expired
    if (new Date(lock.expires_at) <= new Date()) {
      // Expired, can edit
      return { canEdit: true };
    }

    // Check if current user owns the lock
    if (lock.locked_by_user_id === user.id) {
      return { canEdit: true };
    }

    return {
      canEdit: false,
      lockedBy: lock.locked_by_user as any,
      expiresAt: lock.expires_at
    };
  },

  /**
   * Force release all locks (admin only)
   */
  async forceReleaseAllLocks(resourceType: string, resourceId: string): Promise<void> {
    const { error } = await supabase
      .from('resource_locks')
      .delete()
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);

    if (error) throw error;
  },

  // ==========================================================================
  // COLLABORATION ACTIVITY
  // ==========================================================================

  /**
   * Add activity/comment
   */
  async addActivity(data: {
    resourceType: string;
    resourceId: string;
    activityType: CollaborationActivityType;
    content?: string;
    mentions?: string[];
  }): Promise<CollaborationActivity> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const currentOrgId = localStorage.getItem('current_organization_id');

    const { data: activity, error } = await supabase
      .from('collaboration_activity')
      .insert({
        organization_id: currentOrgId,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        activity_type: data.activityType,
        content: data.content || null,
        mentions: data.mentions || null,
        user_id: user.id
      })
      .select(`
        *,
        user:profiles!collaboration_activity_user_id_fkey(id, email, full_name)
      `)
      .single();

    if (error) throw error;
    return activity as unknown as CollaborationActivity;
  },

  /**
   * Get activity feed for a resource
   */
  async getResourceActivity(
    resourceType: string,
    resourceId: string
  ): Promise<CollaborationActivity[]> {
    const { data, error } = await supabase
      .from('collaboration_activity')
      .select(`
        *,
        user:profiles!collaboration_activity_user_id_fkey(id, email, full_name)
      `)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data as unknown as CollaborationActivity[];
  },

  /**
   * Get user's mentions
   */
  async getUserMentions(): Promise<CollaborationActivity[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('collaboration_activity')
      .select(`
        *,
        user:profiles!collaboration_activity_user_id_fkey(id, email, full_name)
      `)
      .contains('mentions', [user.id])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data as unknown as CollaborationActivity[];
  }
};

export default presenceService;
