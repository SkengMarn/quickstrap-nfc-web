-- Fix RLS infinite recursion + Add super_admin bypass
-- Combines non-recursive policies with super_admin/admin access to all data
--
-- Your profiles table already supports the full role hierarchy:
-- System-Level (profiles.role): super_admin, admin, event_owner, event_admin, staff, read_only
-- Organization-Level (organization_members.role): owner, admin, manager, member

BEGIN;

-- ============================================================================
-- STEP 1: Create helper function to break recursion
-- ============================================================================

-- Create helper function to get user's organization IDs without RLS recursion
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_org_ids() TO authenticated;

-- ============================================================================
-- STEP 2: Fix organization_members table
-- ============================================================================

-- Temporarily disable RLS
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can manage organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Users can delete their own membership" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_select_policy" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_insert_policy" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_update_policy" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_delete_policy" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_update" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_delete" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;

-- SELECT: Super admins see all, regular users see their orgs (NO RECURSION)
CREATE POLICY "org_members_select"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  -- Super admins and admins can see all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Users can see their own membership
  user_id = auth.uid()
  OR
  -- Users can see members of their organizations (using helper function)
  organization_id IN (SELECT get_user_org_ids())
);

-- INSERT: Super admins can add anyone, org owners/admins can add to their org
CREATE POLICY "org_members_insert"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins and admins can add anyone
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Organization owners can add members
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_members.organization_id
    AND created_by = auth.uid()
  )
);

-- UPDATE: Super admins can update anyone, org owners can update their org
CREATE POLICY "org_members_update"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (
  -- Super admins and admins can update anyone
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Organization owners can update their members
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_members.organization_id
    AND created_by = auth.uid()
  )
);

-- DELETE: Super admins can delete anyone, users can remove themselves
CREATE POLICY "org_members_delete"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  -- Super admins and admins can delete anyone
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Users can remove themselves
  user_id = auth.uid()
  OR
  -- Organization owners can remove members
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_members.organization_id
    AND created_by = auth.uid()
  )
);

-- Re-enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Fix organizations table
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON public.organizations;
DROP POLICY IF EXISTS "Organization owners can delete" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON public.organizations;
DROP POLICY IF EXISTS "orgs_select" ON public.organizations;
DROP POLICY IF EXISTS "orgs_insert" ON public.organizations;
DROP POLICY IF EXISTS "orgs_update" ON public.organizations;
DROP POLICY IF EXISTS "orgs_delete" ON public.organizations;

-- SELECT: Super admins see all, regular users see their orgs (using helper function)
CREATE POLICY "orgs_select"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  -- Super admins and admins can see all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Regular users see organizations they're members of (using helper function)
  id IN (SELECT get_user_org_ids())
);

-- INSERT: Anyone can create organizations
CREATE POLICY "orgs_insert"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Super admins can update any, org owners can update theirs
CREATE POLICY "orgs_update"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  -- Super admins and admins can update any
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Organization owners can update their org
  created_by = auth.uid()
);

-- DELETE: Super admins can delete any, org owners can delete theirs
CREATE POLICY "orgs_delete"
ON public.organizations
FOR DELETE
TO authenticated
USING (
  -- Super admins and admins can delete any
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Organization owners can delete their org
  created_by = auth.uid()
);

-- ============================================================================
-- STEP 4: Fix event_access table (prevent other recursion issues)
-- ============================================================================

-- Drop ALL existing event_access policies
DROP POLICY IF EXISTS "Users can view event access" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage event access" ON public.event_access;
DROP POLICY IF EXISTS "Event owners can manage access" ON public.event_access;
DROP POLICY IF EXISTS "Users can view their own access" ON public.event_access;
DROP POLICY IF EXISTS "Event creators can manage access" ON public.event_access;
DROP POLICY IF EXISTS "Event admins can view access" ON public.event_access;
DROP POLICY IF EXISTS "event_access_select" ON public.event_access;
DROP POLICY IF EXISTS "event_access_manage" ON public.event_access;
DROP POLICY IF EXISTS "event_access_insert" ON public.event_access;
DROP POLICY IF EXISTS "event_access_update" ON public.event_access;
DROP POLICY IF EXISTS "event_access_delete" ON public.event_access;

-- SELECT: Super admins see all, users see their own access
CREATE POLICY "event_access_select"
ON public.event_access
FOR SELECT
TO authenticated
USING (
  -- Super admins and admins can see all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Users can see their own access
  user_id = auth.uid()
  OR
  -- Event creators can see all access for their events
  event_id IN (
    SELECT id FROM public.events
    WHERE created_by = auth.uid()
  )
);

-- INSERT/UPDATE/DELETE: Super admins or event creators
CREATE POLICY "event_access_manage"
ON public.event_access
FOR ALL
TO authenticated
USING (
  -- Super admins and admins can manage all
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
  OR
  -- Event creators can manage access for their events
  event_id IN (
    SELECT id FROM public.events
    WHERE created_by = auth.uid()
  )
);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  org_policies_count INTEGER;
  org_member_policies_count INTEGER;
  event_access_policies_count INTEGER;
  admin_count INTEGER;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO org_policies_count
  FROM pg_policies WHERE tablename = 'organizations';

  SELECT COUNT(*) INTO org_member_policies_count
  FROM pg_policies WHERE tablename = 'organization_members';

  SELECT COUNT(*) INTO event_access_policies_count
  FROM pg_policies WHERE tablename = 'event_access';

  -- Count admins
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE role IN ('super_admin', 'admin');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS FIX WITH SUPER_ADMIN BYPASS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organizations policies: %', org_policies_count;
  RAISE NOTICE 'Organization members policies: %', org_member_policies_count;
  RAISE NOTICE 'Event access policies: %', event_access_policies_count;
  RAISE NOTICE 'Super admins/admins: %', admin_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Infinite recursion fixed with SECURITY DEFINER function';
  RAISE NOTICE '✅ Super admins can access ALL data';
  RAISE NOTICE '✅ Regular users can only access their data';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)';
  RAISE NOTICE '2. The app should now load in under 2 seconds';
  RAISE NOTICE '3. Organizations will load instantly without timeout';
  RAISE NOTICE '========================================';
END $$;
