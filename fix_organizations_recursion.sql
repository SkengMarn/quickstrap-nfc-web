-- Fix organizations table RLS policies to avoid recursion
-- Ensures organizations can be loaded without circular dependencies

BEGIN;

-- Drop all existing policies on organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete" ON organizations;
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations;

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- SELECT POLICY: Users can see organizations they are members of
CREATE POLICY "organizations_select_simple"
ON organizations
FOR SELECT
TO authenticated
USING (
  -- User is a member of this organization
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- INSERT POLICY: Any authenticated user can create an organization
CREATE POLICY "organizations_insert_simple"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
);

-- UPDATE POLICY: Only organization owners/admins can update
CREATE POLICY "organizations_update_simple"
ON organizations
FOR UPDATE
TO authenticated
USING (
  -- Must be owner or admin
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
  )
);

-- DELETE POLICY: Only organization owners can delete
CREATE POLICY "organizations_delete_simple"
ON organizations
FOR DELETE
TO authenticated
USING (
  -- Must be owner
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() 
      AND role = 'owner'
  )
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
WHERE tablename = 'organizations'
ORDER BY policyname;
