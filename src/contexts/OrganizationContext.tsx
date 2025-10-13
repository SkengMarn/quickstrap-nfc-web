import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization, OrganizationMember, OrgRole } from '../types/phase1';
import organizationService from '../services/organizationService';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  userMembership: OrganizationMember | null;
  allOrganizations: Organization[];
  loading: boolean;
  switchOrganization: (organizationId: string) => void;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userMembership, setUserMembership] = useState<OrganizationMember | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrganizations = async () => {
    try {
      setLoading(true);

      // Temporary workaround for RLS policy infinite recursion issue
      // Skip organization loading until database policies are fixed
      console.warn('Organization loading temporarily disabled due to RLS policy issue');
      
      // Set mock organization data to prevent app crashes
      const mockOrg: Organization = {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Default Organization',
        slug: 'default-org',
        description: 'Temporary organization while fixing database policies',
        logo_url: null,
        website: null,
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF',
        custom_domain: null,
        subscription_tier: 'professional',
        max_events: 100,
        max_wristbands: 10000,
        max_team_members: 50,
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: '00000000-0000-4000-8000-000000000003'
      };
      
      const mockMembership: OrganizationMember = {
        id: '00000000-0000-4000-8000-000000000002',
        organization_id: '00000000-0000-4000-8000-000000000001',
        user_id: '00000000-0000-4000-8000-000000000003',
        role: 'owner',
        permissions: {
          events: 'admin',
          wristbands: 'admin',
          reports: 'admin'
        },
        status: 'active',
        invited_by: null,
        invited_at: null,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setAllOrganizations([mockOrg]);
      setCurrentOrganization(mockOrg);
      setUserMembership(mockMembership);
      
    } catch (error) {
      console.error('Failed to load organizations:', error);
      // Set empty state on error
      setAllOrganizations([]);
      setCurrentOrganization(null);
      setUserMembership(null);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = (organizationId: string) => {
    const org = allOrganizations.find(o => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
      organizationService.setCurrentOrganization(organizationId);

      // Reload membership for new org
      organizationService.getUserMembership(organizationId).then(setUserMembership);
    }
  };

  const refreshOrganization = async () => {
    await loadOrganizations();
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        userMembership,
        allOrganizations,
        loading,
        switchOrganization,
        refreshOrganization
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
