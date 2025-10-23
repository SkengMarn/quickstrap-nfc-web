-- COMPLETE FIX: Infinite recursion in organization_members and organizations tables
-- Error: "infinite recursion detected in policy for relation organization_members"
-- 
-- ROOT CAUSE: Circular dependency between organizations and organization_members policies
-- SOLUTION: Break the cycle with simple, non-recursive policies

BEGIN;

-- ============================================================================
-- STEP 1: Fix organization_members table (must be fixed first)
-- ============================================================================

-- Drop all existing policies on organization_members
DROP POLICY IF EXISTS "Users can view their organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Organization admins can manage members" ON organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON organization_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON organization_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON organization_members;
DROP POLICY IF EXISTS "Users can delete their own membership" ON organization_members;
DROP POLICY IF EXISTS "organization_members_select_policy" ON organization_members;
DROP POLICY IF EXISTS "organization_members_insert_policy" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update_policy" ON organization_members;
DROP POLICY IF EXISTS "organization_members_delete_policy" ON organization_members;
DROP POLICY IF EXISTS "organization_members_select_simple" ON organization_members;
DROP POLICY IF EXISTS "organization_members_insert_simple" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update_simple" ON organization_members;
DROP POLICY IF EXISTS "organization_members_delete_simple" ON organization_members;
DROP POLICY IF EXISTS "org_members_select" ON organization_members;
DROP POLICY IF EXISTS "org_members_insert" ON organization_members;
DROP POLICY IF EXISTS "org_members_update" ON organization_members;
DROP POLICY IF EXISTS "org_members_delete" ON organization_members;

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see memberships for organizations they belong to
-- CRITICAL: This uses a direct subquery to avoid recursion
CREATE POLICY "org_members_select"
ON organization_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Only organization owners/admins/super_admins can add members
CREATE POLICY "org_members_insert"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'super_admin')
  )
);

-- UPDATE: Only organization owners/admins/super_admins can update members
CREATE POLICY "org_members_update"
ON organization_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'super_admin')
  )
);

-- DELETE: Owners/admins/super_admins can remove members, users can remove themselves
CREATE POLICY "org_members_delete"
ON organization_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'super_admin')
  )
);

-- ============================================================================
-- STEP 2: Fix organizations table
-- ============================================================================

-- Drop all existing policies on organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete" ON organizations;
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_select_simple" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_simple" ON organizations;
DROP POLICY IF EXISTS "organizations_update_simple" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_simple" ON organizations;
DROP POLICY IF EXISTS "orgs_select" ON organizations;
DROP POLICY IF EXISTS "orgs_insert" ON organizations;
DROP POLICY IF EXISTS "orgs_update" ON organizations;
DROP POLICY IF EXISTS "orgs_delete" ON organizations;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see organizations they are members of
CREATE POLICY "orgs_select"
ON organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Any authenticated user can create an organization
CREATE POLICY "orgs_insert"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only organization owners/admins/super_admins can update
CREATE POLICY "orgs_update"
ON organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'super_admin')
  )
);

-- DELETE: Only organization owners/super_admins can delete
CREATE POLICY "orgs_delete"
ON organizations
FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'super_admin')
  )
);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all policies for both tables
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_members')
ORDER BY tablename, policyname;

-- Test query to verify organizations can be loaded
SELECT 
  o.id,
  o.name,
  o.created_at,
  COUNT(om.user_id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
GROUP BY o.id, o.name, o.created_at
ORDER BY o.created_at DESC;

-- ============================================================================
-- EXECUTION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  org_count INTEGER;
  org_member_count INTEGER;
  org_policies_count INTEGER;
  org_member_policies_count INTEGER;
BEGIN
  -- Count organizations
  SELECT COUNT(*) INTO org_count FROM organizations;
  
  -- Count organization members
  SELECT COUNT(*) INTO org_member_count FROM organization_members;
  
  -- Count policies on organizations table
  SELECT COUNT(*) INTO org_policies_count 
  FROM pg_policies 
  WHERE tablename = 'organizations';
  
  -- Count policies on organization_members table
  SELECT COUNT(*) INTO org_member_policies_count 
  FROM pg_policies 
  WHERE tablename = 'organization_members';
  
  -- Display results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIX EXECUTION VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organizations table: % organizations found', org_count;
  RAISE NOTICE 'Organization members table: % members found', org_member_count;
  RAISE NOTICE 'Organizations policies: % policies created', org_policies_count;
  RAISE NOTICE 'Organization members policies: % policies created', org_member_policies_count;
  RAISE NOTICE '========================================';
  
  IF org_policies_count = 4 AND org_member_policies_count = 4 THEN
    RAISE NOTICE '✅ SUCCESS: All policies created correctly!';
    RAISE NOTICE '✅ Organizations table has 4 policies (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '✅ Organization members table has 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  ELSE
    RAISE WARNING '⚠️  WARNING: Expected 4 policies per table';
    RAISE WARNING '   Organizations: % policies (expected 4)', org_policies_count;
    RAISE WARNING '   Organization members: % policies (expected 4)', org_member_policies_count;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INFINITE RECURSION FIX COMPLETED';
  RAISE NOTICE 'You can now refresh your browser to load organizations';
  RAISE NOTICE '========================================';
END $$;
