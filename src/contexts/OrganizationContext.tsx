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

      // Fetch all organizations the user belongs to
      const orgs = await organizationService.getUserOrganizations();

      if (orgs && orgs.length > 0) {
        setAllOrganizations(orgs);

        // Set current organization (use stored preference or first org)
        const storedOrgId = localStorage.getItem('currentOrganizationId');
        let currentOrg = orgs.find(o => o.id === storedOrgId) || orgs[0];

        setCurrentOrganization(currentOrg);
        organizationService.setCurrentOrganization(currentOrg.id);

        // Load membership for current org
        try {
          const membership = await organizationService.getUserMembership(currentOrg.id);
          setUserMembership(membership);
        } catch (error) {
          console.warn('Could not load membership:', error);
          setUserMembership(null);
        }
      } else {
        // No organizations found - user needs to create one
        console.log('No organizations found for user');
        setAllOrganizations([]);
        setCurrentOrganization(null);
        setUserMembership(null);
      }

    } catch (error) {
      console.error('Failed to load organizations:', error);

      // If error is due to RLS, show helpful message
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Database error code:', (error as any).code);
      }

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

      // Store preference
      localStorage.setItem('currentOrganizationId', organizationId);

      // Reload membership for new org
      organizationService.getUserMembership(organizationId)
        .then(setUserMembership)
        .catch(err => {
          console.warn('Could not load membership for switched org:', err);
          setUserMembership(null);
        });
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
