-- =====================================================
-- QUICK FIX: ORGANIZATION RLS POLICIES
-- =====================================================
-- Run this in Supabase SQL Editor to fix organization creation
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DROP ALL DUPLICATE POLICIES
-- =====================================================

-- Drop organizations policies
DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "orgs_delete" ON public.organizations;
DROP POLICY IF EXISTS "orgs_insert" ON public.organizations;
DROP POLICY IF EXISTS "orgs_select" ON public.organizations;
DROP POLICY IF EXISTS "orgs_update" ON public.organizations;

-- Drop organization_members policies
DROP POLICY IF EXISTS "organization_members_delete" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_insert" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_select" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_update" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_delete" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_update" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can manage memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organization memberships" ON public.organization_members;

-- =====================================================
-- 2. CREATE CLEAN POLICIES FOR ORGANIZATIONS
-- =====================================================

-- SELECT: Users can view organizations they created or are members of
CREATE POLICY "organizations_select_policy" ON public.organizations
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
    OR
    id IN (
      SELECT organization_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
  );

-- INSERT: Any authenticated user can create an organization
CREATE POLICY "organizations_insert_policy" ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Users can update organizations they created or where they are admin/owner
CREATE POLICY "organizations_update_policy" ON public.organizations
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND status = 'active'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND status = 'active'
    )
  );

-- DELETE: Only creators or owners can delete
CREATE POLICY "organizations_delete_policy" ON public.organizations
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
    )
  );

-- =====================================================
-- 3. CREATE CLEAN POLICIES FOR ORGANIZATION_MEMBERS
-- =====================================================

-- SELECT: Users can view memberships for their organizations
CREATE POLICY "organization_members_select_policy" ON public.organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
    OR
    organization_id IN (
      SELECT id
      FROM public.organizations
      WHERE created_by = auth.uid()
    )
  );

-- INSERT: Organization admins/owners can add members
CREATE POLICY "organization_members_insert_policy" ON public.organization_members
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND status = 'active'
    )
    OR
    organization_id IN (
      SELECT id
      FROM public.organizations
      WHERE created_by = auth.uid()
    )
    OR
    NOT EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_id = organization_members.organization_id
    )
  );

-- UPDATE: Organization admins/owners can update memberships
CREATE POLICY "organization_members_update_policy" ON public.organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND status = 'active'
    )
    OR
    organization_id IN (
      SELECT id
      FROM public.organizations
      WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND status = 'active'
    )
    OR
    organization_id IN (
      SELECT id
      FROM public.organizations
      WHERE created_by = auth.uid()
    )
  );

-- DELETE: Organization admins/owners can remove members, users can remove themselves
CREATE POLICY "organization_members_delete_policy" ON public.organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
      AND status = 'active'
    )
    OR
    organization_id IN (
      SELECT id
      FROM public.organizations
      WHERE created_by = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

-- =====================================================
-- 4. CREATE AUTO-ADD CREATOR TRIGGER
-- =====================================================

-- Function to automatically add creator as owner
CREATE OR REPLACE FUNCTION public.add_creator_as_organization_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as an owner of the organization
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  ) VALUES (
    NEW.id,
    NEW.created_by,
    'owner',
    'active',
    NEW.created_by,
    NOW()
  );

  -- Also update their profile if it exists
  UPDATE public.profiles
  SET organization_id = NEW.id
  WHERE id = NEW.created_by
  AND organization_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;

-- Create trigger to run after organization insert
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_organization_owner();

-- =====================================================
-- 5. VERIFY RLS IS ENABLED
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;

COMMIT;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this after to verify the fix worked:
--
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('organizations', 'organization_members')
-- GROUP BY tablename;
--
-- Should show:
-- organizations: 4 policies
-- organization_members: 4 policies
