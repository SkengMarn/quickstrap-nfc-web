-- ============================================================================
-- IMMEDIATE RLS FIX - Run this directly on the database
-- ============================================================================

BEGIN;

-- ===========================================================================
-- 1. Drop all existing problematic policies
-- ===========================================================================

DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own org memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view other members in their orgs" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Organization members can view their org" ON public.organizations;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view members in their orgs" ON public.organization_members;
DROP POLICY IF EXISTS "Users can insert memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can update memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can delete memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can delete owned organizations" ON public.organizations;

-- ===========================================================================
-- 2. Drop and recreate helper functions
-- ===========================================================================

DROP FUNCTION IF EXISTS public.user_is_org_member(uuid);
DROP FUNCTION IF EXISTS public.user_organization_ids();

-- Check if user is an active member of an organization
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_member boolean;
BEGIN
  -- Direct query bypassing RLS
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) INTO is_member;

  RETURN COALESCE(is_member, false);
END;
$$;

-- Get user's organization IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS TABLE (organization_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid()
    AND om.status = 'active';
END;
$$;

-- ===========================================================================
-- 3. Create new non-recursive RLS policies for organization_members
-- ===========================================================================

-- Policy 1: Users can always view their own membership records
CREATE POLICY "Users can view own memberships"
  ON public.organization_members
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Users can view other members in organizations they belong to
CREATE POLICY "Users can view members in their orgs"
  ON public.organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organization_ids()
    )
  );

-- Policy 3: Users can insert memberships
CREATE POLICY "Users can insert memberships"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_members.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Policy 4: Users can update memberships
CREATE POLICY "Users can update memberships"
  ON public.organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Policy 5: Users can delete memberships
CREATE POLICY "Users can delete memberships"
  ON public.organization_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- ===========================================================================
-- 4. Create new RLS policies for organizations table
-- ===========================================================================

-- Policy 1: Users can view organizations they are members of
CREATE POLICY "Users can view their organizations"
  ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.user_organization_ids()
    )
  );

-- Policy 2: Users can insert organizations
CREATE POLICY "Users can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Users can update organizations they own/admin
CREATE POLICY "Users can update their organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    public.user_is_org_member(id) AND
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Policy 4: Users can delete organizations they own
CREATE POLICY "Users can delete owned organizations"
  ON public.organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND status = 'active'
    )
  );

-- ===========================================================================
-- 5. Ensure RLS is enabled
-- ===========================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- 6. Grant permissions
-- ===========================================================================

GRANT EXECUTE ON FUNCTION public.user_is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;

-- ===========================================================================
-- 7. Add indexes
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_org_members_user_status
  ON public.organization_members(user_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_org_members_org_status
  ON public.organization_members(organization_id, status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_org_members_user_org_role
  ON public.organization_members(user_id, organization_id, role, status)
  WHERE status = 'active';

COMMIT;

SELECT 'RLS policies fixed successfully!' as status;
