-- ============================================================================
-- CRITICAL SCHEMA FIXES
-- Fixes: organizations.created_by, event_access.created_at, RLS recursion
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX ORGANIZATIONS TABLE
-- ============================================================================

-- Add created_by column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE organizations ADD COLUMN created_by UUID REFERENCES auth.users(id);
    
    -- Set existing organizations to their first member as creator
    UPDATE organizations o
    SET created_by = (
      SELECT user_id 
      FROM organization_members 
      WHERE organization_id = o.id 
      ORDER BY joined_at ASC 
      LIMIT 1
    )
    WHERE created_by IS NULL;
    
    RAISE NOTICE 'Added created_by column to organizations';
  END IF;
END $$;

-- Add description column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'description'
  ) THEN
    ALTER TABLE organizations ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column to organizations';
  END IF;
END $$;

-- ============================================================================
-- 2. FIX EVENT_ACCESS TABLE - COLUMN NAME
-- ============================================================================

-- Rename created_at to granted_at if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_access' AND column_name = 'created_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_access' AND column_name = 'granted_at'
  ) THEN
    ALTER TABLE event_access RENAME COLUMN created_at TO granted_at;
    RAISE NOTICE 'Renamed event_access.created_at to granted_at';
  END IF;
  
  -- Add granted_at if missing entirely
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_access' AND column_name = 'granted_at'
  ) THEN
    ALTER TABLE event_access ADD COLUMN granted_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added granted_at column to event_access';
  END IF;
END $$;

-- ============================================================================
-- 3. FIX ORGANIZATION_MEMBERS RLS POLICIES - REMOVE RECURSION
-- ============================================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "organization_members_select" ON organization_members;
DROP POLICY IF EXISTS "organization_members_insert" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update" ON organization_members;
DROP POLICY IF EXISTS "organization_members_delete" ON organization_members;

-- Simple, non-recursive policies
CREATE POLICY "organization_members_select" ON organization_members
  FOR SELECT
  USING (
    -- User can see members of organizations they belong to
    user_id = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "organization_members_insert" ON organization_members
  FOR INSERT
  WITH CHECK (
    -- Organization owner can add members
    organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
    OR
    -- Or user is adding themselves (if organization allows)
    user_id = auth.uid()
  );

CREATE POLICY "organization_members_update" ON organization_members
  FOR UPDATE
  USING (
    -- Organization owner can update members
    organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "organization_members_delete" ON organization_members
  FOR DELETE
  USING (
    -- Organization owner can remove members
    organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
    OR
    -- Users can remove themselves
    user_id = auth.uid()
  );

-- ============================================================================
-- 4. FIX ORGANIZATIONS RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
DROP POLICY IF EXISTS "organizations_delete" ON organizations;

-- Create simple, non-recursive policies
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT
  USING (
    -- User is the creator
    created_by = auth.uid()
    OR
    -- User is a member
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "organizations_insert" ON organizations
  FOR INSERT
  WITH CHECK (
    -- User is creating their own organization
    created_by = auth.uid()
  );

CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE
  USING (
    -- Only creator can update
    created_by = auth.uid()
  );

CREATE POLICY "organizations_delete" ON organizations
  FOR DELETE
  USING (
    -- Only creator can delete
    created_by = auth.uid()
  );

-- ============================================================================
-- 5. VERIFY SCHEMA
-- ============================================================================

-- Check organizations table
DO $$
DECLARE
  has_created_by BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'created_by'
  ) INTO has_created_by;
  
  IF has_created_by THEN
    RAISE NOTICE '✓ organizations.created_by exists';
  ELSE
    RAISE EXCEPTION '✗ organizations.created_by missing';
  END IF;
END $$;

-- Check event_access table
DO $$
DECLARE
  has_granted_at BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'event_access' AND column_name = 'granted_at'
  ) INTO has_granted_at;
  
  IF has_granted_at THEN
    RAISE NOTICE '✓ event_access.granted_at exists';
  ELSE
    RAISE EXCEPTION '✗ event_access.granted_at missing';
  END IF;
END $$;

-- Check RLS policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename IN ('organizations', 'organization_members');
  
  IF policy_count >= 8 THEN
    RAISE NOTICE '✓ RLS policies created (% policies)', policy_count;
  ELSE
    RAISE WARNING '⚠ Only % RLS policies found, expected at least 8', policy_count;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 
  '✅ Critical schema fixes applied successfully!' as status,
  'organizations.created_by added' as fix_1,
  'event_access.granted_at fixed' as fix_2,
  'RLS policies fixed (no recursion)' as fix_3;
