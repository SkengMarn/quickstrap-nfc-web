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

    // Try to fetch organizations user created
    const { data: createdOrgs, error: createdError } = await supabase
      .from('organizations')
      .select('*')
      .eq('created_by', user.id);

    // Also fetch organizations user is a member of
    const { data: memberOrgs, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(*)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Combine and deduplicate
    const allOrgs: Organization[] = [];
    const seenIds = new Set<string>();

    // Add created orgs
    if (createdOrgs) {
      createdOrgs.forEach(org => {
        if (!seenIds.has(org.id)) {
          allOrgs.push(org);
          seenIds.add(org.id);
        }
      });
    }

    // Add member orgs
    if (memberOrgs) {
      memberOrgs.forEach((item: any) => {
        const org = item.organizations;
        if (org && !seenIds.has(org.id)) {
          allOrgs.push(org);
          seenIds.add(org.id);
        }
      });
    }

    return allOrgs;
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
   * NOTE: The database trigger automatically adds the creator as owner
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

    if (orgError) {
      console.error('Error creating organization:', orgError);
      throw orgError;
    }

    // NOTE: The database trigger 'on_organization_created' automatically
    // adds the creator as owner to organization_members table
    // We don't need to manually insert into organization_members here

    // Wait a moment for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create default settings (optional)
    try {
      const defaultSettings: OrganizationSettings = {
        organization_id: org.id,
        branding: {
          primary_color: '#3B82F6',
          secondary_color: '#1E40AF',
          logo_url: null
        },
        features: {
          analytics_enabled: true,
          fraud_detection: false,
          ai_insights: false,
          api_access: false,
          white_label: false,
          custom_workflows: false
        },
        integrations: {},
        notifications: {
          email_enabled: true,
          sms_enabled: false,
          push_enabled: false,
          webhook_url: null
        },
        security: {
          two_factor_required: false,
          session_timeout_minutes: 60,
          allowed_domains: []
        }
      };

      await this.updateOrganizationSettings(org.id, defaultSettings);
    } catch (settingsError) {
      console.warn('Could not create default settings:', settingsError);
      // Don't fail organization creation if settings fail
    }

    return org;
  },

  /**
   * Update organization details
   */
  async updateOrganization(
    organizationId: string,
    updates: Partial<Organization>
  ): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data as Organization;
  },

  /**
   * Delete organization
   */
  async deleteOrganization(organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (error) throw error;
  },

  /**
   * Get organization settings
   */
  async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings> {
    // Settings might be stored in organization.settings JSONB column
    // or in a separate settings table - adjust based on your schema
    const org = await this.getOrganization(organizationId);

    return (org.settings || {}) as OrganizationSettings;
  },

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<void> {
    // Get current settings
    const currentSettings = await this.getOrganizationSettings(organizationId);

    // Merge with new settings
    const updatedSettings = {
      ...currentSettings,
      ...settings
    };

    // Update organization
    await this.updateOrganization(organizationId, {
      settings: updatedSettings as any
    });
  },

  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as OrganizationMember[];
  },

  /**
   * Get user's membership in an organization
   */
  async getUserMembership(organizationId: string): Promise<OrganizationMember> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data as OrganizationMember;
  },

  /**
   * Invite a member to organization
   */
  async inviteMember(invite: OrganizationInviteRequest): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user exists by email
    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', invite.email)
      .single();

    if (!invitedUser) {
      throw new Error('User with this email does not exist');
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', invitedUser.id)
      .maybeSingle();

    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }

    // Add member
    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invite.organization_id,
        user_id: invitedUser.id,
        role: invite.role || 'member',
        status: 'active',
        invited_by: user.id,
        joined_at: new Date().toISOString()
      });

    if (error) throw error;
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
   * Set current organization (for context)
   */
  setCurrentOrganization(organizationId: string): void {
    localStorage.setItem('currentOrganizationId', organizationId);
  },

  /**
   * Get current organization ID from storage
   */
  getCurrentOrganizationId(): string | null {
    return localStorage.getItem('currentOrganizationId');
  }
};

export default organizationService;
