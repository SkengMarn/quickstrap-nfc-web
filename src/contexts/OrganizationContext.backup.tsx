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

      // Admin portal: Single organization for all admins
      const DEFAULT_ORG_ID = '00000000-0000-4000-8000-000000000001';

      try {
        // Try to load the default organization from database
        const org = await organizationService.getOrganization(DEFAULT_ORG_ID);
        const membership = await organizationService.getUserMembership(DEFAULT_ORG_ID);

        setAllOrganizations([org]);
        setCurrentOrganization(org);
        setUserMembership(membership);
      } catch (error) {
        console.warn('Default organization not found, using fallback:', error);

        // Fallback: Set a minimal organization object if DB not set up yet
        const fallbackOrg: Organization = {
          id: DEFAULT_ORG_ID,
          name: 'QuickStrap Admin',
          slug: 'quickstrap-admin',
          description: 'Admin portal organization',
          logo_url: null,
          website: null,
          primary_color: '#3B82F6',
          secondary_color: '#1E40AF',
          custom_domain: null,
          subscription_tier: 'enterprise',
          max_events: 999999,
          max_wristbands: 999999,
          max_team_members: 999999,
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null
        };

        setAllOrganizations([fallbackOrg]);
        setCurrentOrganization(fallbackOrg);
        setUserMembership(null);
      }

    } catch (error) {
      console.error('Failed to load organization:', error);
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
