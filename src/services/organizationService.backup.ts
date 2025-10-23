import { supabase } from './supabase';
import {
  Organization,
  OrganizationMember,
  OrganizationSettings,
  OrgRole,
  OrganizationInviteRequest
} from '../types/phase1';

// ============================================================================
// ORGANIZATION MANAGEMENT SERVICE
// ============================================================================

export const organizationService = {
  /**
   * Get all organizations the current user belongs to
   */
  async getUserOrganizations(): Promise<Organization[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members!inner(user_id, role, status)
      `)
      .eq('organization_members.user_id', user.id)
      .eq('organization_members.status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Organization[];
  },

  /**
   * Get a specific organization by ID
   */
  async getOrganization(organizationId: string): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) throw error;
    return data as Organization;
  },

  /**
   * Get organization with settings
   */
  async getOrganizationWithSettings(organizationId: string): Promise<{
    organization: Organization;
    settings: OrganizationSettings;
  }> {
    const [org, settings] = await Promise.all([
      this.getOrganization(organizationId),
      this.getOrganizationSettings(organizationId)
    ]);

    return { organization: org, settings };
  },

  /**
   * Create a new organization
   */
  async createOrganization(data: {
    name: string;
    slug: string;
    description?: string;
    subscription_tier?: string;
  }): Promise<Organization> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        ...data,
        created_by: user.id
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
        status: 'active'
      });

    if (memberError) throw memberError;

    // Create default settings
    const { error: settingsError } = await supabase
      .from('organization_settings')
      .insert({
        organization_id: org.id
      });

    if (settingsError) throw settingsError;

    return org as Organization;
  },

  /**
   * Update organization
   */
  async updateOrganization(
    organizationId: string,
    updates: Partial<Organization>
  ): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data as Organization;
  },

  /**
   * Delete organization (owner only)
   */
  async deleteOrganization(organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (error) throw error;
  },

  // ==========================================================================
  // ORGANIZATION MEMBERS
  // ==========================================================================

  /**
   * Get all members of an organization
   */
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        user:profiles!organization_members_user_id_fkey(id, email, full_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as unknown as OrganizationMember[];
  },

  /**
   * Get current user's membership in an organization
   */
  async getUserMembership(organizationId: string): Promise<OrganizationMember | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as OrganizationMember;
  },

  /**
   * Invite a user to an organization
   */
  async inviteMember(request: OrganizationInviteRequest): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user with email exists
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', request.email)
      .single();

    if (!profiles) {
      throw new Error('User not found. They must create an account first.');
    }

    // Create membership
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: request.organization_id,
        user_id: profiles.id,
        role: request.role,
        permissions: request.permissions || {},
        status: 'invited',
        invited_by: user.id,
        invited_at: new Date().toISOString()
      });

    if (error) throw error;

    // Create in-app notification for the invited user
    try {
      await supabase.from('notifications').insert({
        user_id: profiles.id,
        type: 'organization_invite',
        title: 'Organization Invitation',
        message: `You've been invited to join an organization`,
        data: {
          organization_id: request.organization_id,
          role: request.role,
          invited_by: user.id
        },
        read: false
      });
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
      // Non-critical - don't fail the invitation
    }
  },

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrgRole
  ): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Accept invitation
   */
  async acceptInvitation(organizationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('organization_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'invited');

    if (error) throw error;
  },

  // ==========================================================================
  // ORGANIZATION SETTINGS
  // ==========================================================================

  /**
   * Get organization settings
   */
  async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings> {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return data as OrganizationSettings;
  },

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    organizationId: string,
    updates: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings> {
    const { data, error } = await supabase
      .from('organization_settings')
      .update(updates)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data as OrganizationSettings;
  },

  /**
   * Enable/disable feature
   */
  async toggleFeature(
    organizationId: string,
    feature: string,
    enabled: boolean
  ): Promise<void> {
    const settings = await this.getOrganizationSettings(organizationId);

    const updatedFeatures = {
      ...settings.features,
      [feature]: enabled
    };

    await this.updateOrganizationSettings(organizationId, {
      features: updatedFeatures
    });
  },

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Check if user has specific role in organization
   */
  async hasRole(
    organizationId: string,
    requiredRoles: OrgRole[]
  ): Promise<boolean> {
    const membership = await this.getUserMembership(organizationId);
    if (!membership) return false;

    return requiredRoles.includes(membership.role);
  },

  /**
   * Check if user is admin or owner
   */
  async isAdmin(organizationId: string): Promise<boolean> {
    return this.hasRole(organizationId, ['owner', 'admin']);
  },

  /**
   * Get current user's active organization (default)
   */
  async getCurrentOrganization(): Promise<Organization | null> {
    const orgs = await this.getUserOrganizations();
    if (orgs.length === 0) return null;

    // Return first org, or get from localStorage preference
    const preferredOrgId = localStorage.getItem('current_organization_id');
    if (preferredOrgId) {
      const preferred = orgs.find(o => o.id === preferredOrgId);
      if (preferred) return preferred;
    }

    return orgs[0];
  },

  /**
   * Set current organization
   */
  async setCurrentOrganization(organizationId: string): Promise<void> {
    // SECURITY FIX: Use secure storage for organization data
    const { secureStorage } = await import('../utils/secureStorage');
    secureStorage.setItem('current_organization_id', organizationId, { 
      encrypt: true,
      expiry: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
};

export default organizationService;
