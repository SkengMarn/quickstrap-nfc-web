import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization, OrganizationMember, OrgRole } from '../types/phase1';
import organizationService from '../services/organizationService';
import { supabase } from '../services/supabase';
import { safeQuery, checkSystemHealth } from '../utils/selfHealing';

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

      // Check if user is authenticated first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping organization load');
        setLoading(false);
        return;
      }

      // Use safeQuery with circuit breaker and timeout protection
      const orgs = await safeQuery(
        () => organizationService.getUserOrganizations(),
        {
          operationName: 'getUserOrganizations',
          critical: true,
          fallback: () => [],
        }
      );

      if (orgs && orgs.length > 0) {
        setAllOrganizations(orgs);

        // Set current organization (use stored preference or first org)
        const storedOrgId = localStorage.getItem('currentOrganizationId');
        let currentOrg = orgs.find(o => o.id === storedOrgId) || orgs[0];

        setCurrentOrganization(currentOrg);
        organizationService.setCurrentOrganization(currentOrg.id);

        // Load membership for current org with protection
        try {
          const membership = await safeQuery(
            () => organizationService.getUserMembership(currentOrg.id),
            {
              operationName: 'getUserMembership',
              critical: false,
              fallback: () => null,
            }
          );
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

      // Check if this is a circuit breaker error
      if (error instanceof Error && error.message.includes('Circuit breaker is OPEN')) {
        console.error('Circuit breaker is OPEN. System is in fail-safe mode.');

        // Trigger system health check in background
        checkSystemHealth().catch(console.error);
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
    // Load organizations with self-healing protection
    console.log('OrganizationContext: Loading organizations with self-healing protection');

    // Safety timeout as last resort
    const safetyTimeoutId = setTimeout(() => {
      console.error('Organization load safety timeout - forcing loading to false');
      setLoading(false);
    }, 12000); // 12s absolute max

    loadOrganizations().finally(() => {
      clearTimeout(safetyTimeoutId);
    });

    return () => clearTimeout(safetyTimeoutId);
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
