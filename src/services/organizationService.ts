import { supabase } from './supabase';
import { Organization, OrganizationMember, OrganizationSettings, OrgRole } from '../types/phase1';

class OrganizationService {
  private currentOrganizationId: string | null = null;

  /**
   * Set the current organization context
   */
  setCurrentOrganization(organizationId: string) {
    this.currentOrganizationId = organizationId;
    localStorage.setItem('currentOrganizationId', organizationId);
  }

  /**
   * Get the current organization ID
   */
  getCurrentOrganizationId(): string | null {
    return this.currentOrganizationId || localStorage.getItem('currentOrganizationId');
  }

  /**
   * Get all organizations for the current user
   */
  async getUserOrganizations(): Promise<Organization[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('No authenticated user');
        return [];
      }

      // Get organizations through membership with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      try {
        // Query organization_members to get user's organizations
        const { data: memberships, error: membershipError } = await supabase
          .from('organization_members')
          .select(`
            organization_id,
            role,
            status,
            organization:organizations (*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active');

        clearTimeout(timeoutId);

        if (membershipError) {
          console.error('Error fetching user organizations:', membershipError);
          throw membershipError;
        }

        if (!memberships || memberships.length === 0) {
          console.log('No active organization memberships found');
          return [];
        }

        // Extract organizations from memberships
        const organizations: Organization[] = [];
        for (const membership of memberships) {
          if (membership.organization && typeof membership.organization === 'object' && !Array.isArray(membership.organization)) {
            organizations.push(membership.organization as unknown as Organization);
          }
        }

        console.log(`Found ${organizations.length} organizations for user`);
        return organizations;

      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          console.error('Query timeout: getUserOrganizations took too long');
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }

    } catch (error) {
      console.error('getUserOrganizations failed:', error);
      throw error;
    }
  }

  /**
   * Get user's membership details for a specific organization
   */
  async getUserMembership(organizationId: string): Promise<OrganizationMember | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const { data, error } = await supabase
          .from('organization_members')
          .select(`
            *,
            organization:organizations (*),
            user:profiles (id, email, full_name)
          `)
          .eq('organization_id', organizationId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        clearTimeout(timeoutId);

        if (error) {
          if (error.code === 'PGRST116') {
            // No membership found
            return null;
          }
          console.error('Error fetching user membership:', error);
          throw error;
        }

        return data as OrganizationMember;

      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          console.error('Query timeout: getUserMembership took too long');
          return null;
        }
        throw error;
      }

    } catch (error) {
      console.error('getUserMembership failed:', error);
      return null;
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) {
        console.error('Error fetching organization:', error);
        return null;
      }

      return data as Organization;
    } catch (error) {
      console.error('getOrganization failed:', error);
      return null;
    }
  }

  /**
   * Create a new organization
   */
  async createOrganization(data: {
    name: string;
    slug: string;
    description?: string;
    subscription_tier?: 'free' | 'starter' | 'professional' | 'enterprise';
  }): Promise<Organization> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User must be authenticated to create an organization');
      }

      // Create the organization
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          subscription_tier: data.subscription_tier || 'free',
          created_by: user.id,
        })
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        throw orgError;
      }

      // Add the creator as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          permissions: {
            events: 'admin',
            wristbands: 'admin',
            reports: 'admin',
          },
        });

      if (memberError) {
        console.error('Error adding organization member:', memberError);
        // Rollback organization creation if member creation fails
        await supabase.from('organizations').delete().eq('id', organization.id);
        throw memberError;
      }

      return organization as Organization;
    } catch (error) {
      console.error('createOrganization failed:', error);
      throw error;
    }
  }

  /**
   * Update organization details
   */
  async updateOrganization(
    organizationId: string,
    updates: Partial<Organization>
  ): Promise<Organization> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Error updating organization:', error);
        throw error;
      }

      return data as Organization;
    } catch (error) {
      console.error('updateOrganization failed:', error);
      throw error;
    }
  }

  /**
   * Get organization settings
   */
  async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return default
          return null;
        }
        console.error('Error fetching organization settings:', error);
        throw error;
      }

      return data as OrganizationSettings;
    } catch (error) {
      console.error('getOrganizationSettings failed:', error);
      return null;
    }
  }

  /**
   * Update organization settings
   */
  async updateOrganizationSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings> {
    try {
      // Upsert settings
      const { data, error } = await supabase
        .from('organization_settings')
        .upsert({
          organization_id: organizationId,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Error updating organization settings:', error);
        throw error;
      }

      return data as OrganizationSettings;
    } catch (error) {
      console.error('updateOrganizationSettings failed:', error);
      throw error;
    }
  }

  /**
   * Get all members of an organization
   */
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          user:profiles (id, email, full_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organization members:', error);
        throw error;
      }

      return (data || []) as OrganizationMember[];
    } catch (error) {
      console.error('getOrganizationMembers failed:', error);
      return [];
    }
  }

  /**
   * Invite a user to an organization
   */
  async inviteMember(data: {
    organizationId: string;
    email: string;
    role: OrgRole;
    permissions?: Record<string, string>;
  }): Promise<OrganizationMember> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Check if user exists
      const { data: invitedUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', data.email)
        .single();

      if (!invitedUser) {
        throw new Error('User not found');
      }

      // Create membership
      const { data: membership, error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: data.organizationId,
          user_id: invitedUser.id,
          role: data.role,
          status: 'invited',
          permissions: data.permissions || {
            events: 'read',
            wristbands: 'read',
            reports: 'read',
          },
          invited_by: user.id,
          invited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error inviting member:', error);
        throw error;
      }

      return membership as OrganizationMember;
    } catch (error) {
      console.error('inviteMember failed:', error);
      throw error;
    }
  }

  /**
   * Update member role and permissions
   */
  async updateMember(
    memberId: string,
    updates: {
      role?: OrgRole;
      permissions?: Record<string, string>;
      status?: 'active' | 'suspended' | 'invited';
    }
  ): Promise<OrganizationMember> {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .update(updates)
        .eq('id', memberId)
        .select()
        .single();

      if (error) {
        console.error('Error updating member:', error);
        throw error;
      }

      return data as OrganizationMember;
    } catch (error) {
      console.error('updateMember failed:', error);
      throw error;
    }
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(memberId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('Error removing member:', error);
        throw error;
      }
    } catch (error) {
      console.error('removeMember failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has permission for a specific action
   */
  async hasPermission(
    organizationId: string,
    resource: string,
    level: 'read' | 'write' | 'admin'
  ): Promise<boolean> {
    try {
      const membership = await this.getUserMembership(organizationId);

      if (!membership) {
        return false;
      }

      // Owner and admin have all permissions
      if (membership.role === 'owner' || membership.role === 'admin') {
        return true;
      }

      // Check specific permission
      const permissionLevel = membership.permissions[resource];

      if (level === 'read') {
        return ['read', 'write', 'admin'].includes(permissionLevel);
      } else if (level === 'write') {
        return ['write', 'admin'].includes(permissionLevel);
      } else if (level === 'admin') {
        return permissionLevel === 'admin';
      }

      return false;
    } catch (error) {
      console.error('hasPermission check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
const organizationService = new OrganizationService();
export default organizationService;
