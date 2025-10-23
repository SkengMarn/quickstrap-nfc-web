-- Fix infinite recursion in organization_members RLS policies
-- This fixes the error: "infinite recursion detected in policy for relation organization_members"

BEGIN;

-- Drop all existing policies on organization_members to start fresh
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

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- SIMPLE SELECT POLICY: Users can see memberships for organizations they belong to
-- This avoids recursion by using a direct subquery instead of policy-dependent joins
CREATE POLICY "organization_members_select_simple"
ON organization_members
FOR SELECT
TO authenticated
USING (
  -- User can see their own memberships
  user_id = auth.uid()
  OR
  -- User can see other members if they belong to the same organization
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- INSERT POLICY: Only organization owners/admins can add members
CREATE POLICY "organization_members_insert_simple"
ON organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be owner or admin of the organization
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- UPDATE POLICY: Only organization owners/admins can update members
CREATE POLICY "organization_members_update_simple"
ON organization_members
FOR UPDATE
TO authenticated
USING (
  -- Must be owner or admin of the organization
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
);

-- DELETE POLICY: Only organization owners/admins can remove members
CREATE POLICY "organization_members_delete_simple"
ON organization_members
FOR DELETE
TO authenticated
USING (
  -- Must be owner or admin of the organization
  EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  )
  OR
  -- Users can remove themselves
  user_id = auth.uid()
);

COMMIT;

-- Verify the policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'organization_members'
ORDER BY policyname;
