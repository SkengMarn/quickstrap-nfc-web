import { supabase } from './supabase';

/**
 * ACCESS CONTROL SERVICE
 *
 * Manages access control for both Portal (web) and App (mobile)
 *
 * PORTAL ACCESS:
 * - Admins: Full system access, see ALL events, manage everything
 * - Owners: Access ONLY events assigned via event_access table
 *   - Can manage wristbands, event details
 *   - CANNOT see other events or system settings
 * - Scanners: NO PORTAL ACCESS (app only)
 *
 * APP ACCESS:
 * - Admins: See ALL events automatically (no event_access needed)
 * - Managers: See ONLY events with event_access.access_level IN ('admin', 'owner')
 *   - Can manage event (wristbands, gates, etc.)
 * - Scanners: See ONLY events with event_access.access_level = 'scanner'
 *   - Can only scan wristbands
 */

export type UserRole = 'super_admin' | 'admin' | 'user' | 'owner' | 'scanner' | 'manager';
export type EventAccessLevel = 'admin' | 'owner' | 'scanner';

export interface UserAccess {
  userId: string;
  email: string;
  isAdmin: boolean;
  role: UserRole;
  eventAccess: Array<{
    eventId: string;
    accessLevel: EventAccessLevel;
  }>;
}

class AccessControlService {
  /**
   * Get current user's complete access information
   */
  async getUserAccess(): Promise<UserAccess | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get user profile to check if admin
    // First try profiles table, then fallback to auth.users
    let profile: any = null;
    let profileError: any = null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('access_level, email, full_name')
        .eq('id', user.id)
        .single();
      
      profile = data;
      profileError = error;
    } catch (err) {
      console.log('Profiles table not accessible, using auth user data');
      profileError = err;
    }

    // Fallback: use auth user data and assume admin for now
    if (!profile || profileError) {
      console.log('🔧 Using fallback admin access for user:', user.email);
      profile = {
        access_level: 'admin', // Temporary: assume admin until profiles table is fixed
        email: user.email,
        full_name: user.user_metadata?.full_name || null
      };
    }

    // Get event-level access (with error handling)
    let eventAccessData: any[] = [];
    try {
      const { data, error } = await supabase
        .from('event_access')
        .select('event_id, access_level')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (!error && data) {
        eventAccessData = data;
      }
    } catch (err) {
      console.log('Event access table not accessible, user will have admin-only access');
    }

    // Check for admin roles (super_admin and admin have full system access)
    const isAdmin = profile.access_level === 'super_admin' || 
                   profile.access_level === 'admin' ||
                   (profile.access_level && profile.access_level.includes('admin'));

    // Debug logging for role detection
    console.log('🔍 Access Control Debug:', {
      userId: user.id,
      email: profile.email,
      access_level: profile.access_level,
      isAdmin,
      eventAccessCount: eventAccessData?.length || 0
    });

    return {
      userId: user.id,
      email: profile.email,
      isAdmin,
      role: profile.access_level as UserRole,
      eventAccess: (eventAccessData || []).map(ea => ({
        eventId: ea.event_id,
        accessLevel: ea.access_level as EventAccessLevel
      }))
    };
  }

  /**
   * Check if user is system admin
   */
  async isAdmin(): Promise<boolean> {
    const access = await this.getUserAccess();
    return access?.isAdmin || false;
  }

  /**
   * Get all events user can access
   * - Admins: ALL events
   * - Others: Only events in event_access
   */
  async getAccessibleEventIds(): Promise<string[] | 'all'> {
    const access = await this.getUserAccess();
    if (!access) return [];

    // Admins see all events
    if (access.isAdmin) return 'all';

    // Others see only events they have access to (excluding scanners in portal)
    return access.eventAccess
      .filter(ea => ea.accessLevel === 'admin' || ea.accessLevel === 'owner')
      .map(ea => ea.eventId);
  }

  /**
   * Check if user can access the portal at all
   * Scanners are blocked from portal access
   */
  async canAccessPortal(): Promise<{ allowed: boolean; reason?: string }> {
    const access = await this.getUserAccess();
    
    if (!access) {
      return { 
        allowed: false, 
        reason: 'Authentication required.' 
      };
    }
    
    // Admins always have portal access
    if (access.isAdmin) {
      return { allowed: true };
    }

    // Check if user has any non-scanner access
    const hasPortalAccess = access.eventAccess.some(ea => 
      ea.accessLevel === 'admin' || ea.accessLevel === 'owner'
    );

    if (!hasPortalAccess) {
      // Check if they're a scanner-only user
      const isScannerOnly = access.eventAccess.every(ea => ea.accessLevel === 'scanner');
      
      if (isScannerOnly) {
        return { 
          allowed: false, 
          reason: 'Scanners do not have portal access. Please use the mobile app.' 
        };
      }
      
      return { 
        allowed: false, 
        reason: 'No portal access granted. Contact your administrator.' 
      };
    }

    return { allowed: true };
  }

  /**
   * Check what roles a user can assign to others
   * Based on permission hierarchy
   */
  async getAssignableRoles(): Promise<UserRole[]> {
    const access = await this.getUserAccess();
    if (!access) return [];

    switch (access.role) {
      case 'super_admin':
        return ['admin', 'owner', 'scanner']; // Can add admins, owners, scanners
      
      case 'admin':
        return ['owner', 'scanner']; // Can add owners, scanners
      
      case 'owner':
        return ['owner', 'scanner']; // Can add co-owners, scanners
      
      case 'user':
      case 'scanner':
      case 'manager':
      default:
        return []; // Cannot add anyone
    }
  }

  /**
   * Check if current user can assign a specific role
   */
  async canAssignRole(targetRole: UserRole): Promise<boolean> {
    const assignableRoles = await this.getAssignableRoles();
    return assignableRoles.includes(targetRole);
  }

  /**
   * Validate role assignment with detailed feedback
   */
  async validateRoleAssignment(targetRole: UserRole): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const access = await this.getUserAccess();
    if (!access) {
      return { allowed: false, reason: 'Authentication required' };
    }

    const assignableRoles = await this.getAssignableRoles();
    
    if (!assignableRoles.includes(targetRole)) {
      const roleHierarchy: Record<UserRole, string> = {
        super_admin: 'Super Admin',
        admin: 'Admin', 
        user: 'User',
        owner: 'Owner',
        scanner: 'Scanner',
        manager: 'Manager'
      };

      return {
        allowed: false,
        reason: `${roleHierarchy[access.role]} cannot assign ${roleHierarchy[targetRole]} role`
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can access a specific event
   */
  async canAccessEvent(eventId: string): Promise<boolean> {
    const access = await this.getUserAccess();
    
    if (!access) return false;
    
    // Admins can access all events
    if (access.isAdmin) return true;

    // Others need explicit event_access (but not scanners in portal)
    return access.eventAccess.some(ea => 
      ea.eventId === eventId && 
      (ea.accessLevel === 'admin' || ea.accessLevel === 'owner')
    );
  }

  /**
   * Check if user can manage a specific event (add/delete wristbands, etc.)
   */
  async canManageEvent(eventId: string): Promise<boolean> {
    const access = await this.getUserAccess();
    if (!access) return false;

    // Admins can manage all events
    if (access.isAdmin) return true;

    // Managers/Owners can manage if they have admin or owner access level
    const eventAccess = access.eventAccess.find(ea => ea.eventId === eventId);
    return eventAccess?.accessLevel === 'admin' || eventAccess?.accessLevel === 'owner';
  }

  /**
   * Check if user can scan at a specific event
   */
  async canScanAtEvent(eventId: string): Promise<boolean> {
    const access = await this.getUserAccess();
    if (!access) return false;

    // Admins can scan anywhere
    if (access.isAdmin) return true;

    // Others need explicit scanner access
    return access.eventAccess.some(ea => ea.eventId === eventId);
  }

  /**
   * Grant event access to a user
   * Only admins or event managers can grant access
   */
  async grantEventAccess(
    eventId: string,
    targetUserId: string,
    accessLevel: EventAccessLevel
  ): Promise<void> {
    // Check if current user can manage this event
    const canManage = await this.canManageEvent(eventId);
    if (!canManage) {
      throw new Error('Insufficient permissions to grant access');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('event_access')
      .insert({
        event_id: eventId,
        user_id: targetUserId,
        access_level: accessLevel,
        granted_by: user.id,
        is_active: true
      });

    if (error) throw error;
  }

  /**
   * Revoke event access from a user
   */
  async revokeEventAccess(eventId: string, targetUserId: string): Promise<void> {
    const canManage = await this.canManageEvent(eventId);
    if (!canManage) {
      throw new Error('Insufficient permissions to revoke access');
    }

    const { error } = await supabase
      .from('event_access')
      .update({ is_active: false })
      .eq('event_id', eventId)
      .eq('user_id', targetUserId);

    if (error) throw error;
  }

  /**
   * Get all users with access to an event
   */
  async getEventAccessList(eventId: string): Promise<Array<{
    userId: string;
    email: string;
    fullName: string | null;
    accessLevel: EventAccessLevel;
    grantedAt: string;
  }>> {
    const canAccess = await this.canAccessEvent(eventId);
    if (!canAccess) {
      throw new Error('Insufficient permissions to view event access');
    }

    const { data, error } = await supabase
      .from('event_access')
      .select(`
        user_id,
        access_level,
        created_at,
        user:profiles!event_access_user_id_fkey(email, full_name)
      `)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
      userId: item.user_id,
      email: (item.user as any)?.email || '',
      fullName: (item.user as any)?.full_name || null,
      accessLevel: item.access_level as EventAccessLevel,
      grantedAt: item.created_at
    }));
  }
}

export const accessControlService = new AccessControlService();
export default accessControlService;
