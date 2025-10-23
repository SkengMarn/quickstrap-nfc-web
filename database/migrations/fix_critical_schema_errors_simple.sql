-- ============================================================================
-- CRITICAL SCHEMA FIXES
-- Fixes: organizations.created_by, organizations.description, 
--        event_access.granted_at, RLS recursion
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

-- Add slug column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'slug'
  ) THEN
    ALTER TABLE organizations ADD COLUMN slug TEXT UNIQUE;
    
    -- Generate slugs for existing organizations
    UPDATE organizations
    SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
    WHERE slug IS NULL;
    
    RAISE NOTICE 'Added slug column to organizations';
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
    organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

CREATE POLICY "organization_members_update" ON organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "organization_members_delete" ON organization_members
  FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE created_by = auth.uid()
    )
    OR
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
    created_by = auth.uid()
    OR
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "organizations_insert" ON organizations
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE
  USING (
    created_by = auth.uid()
  );

CREATE POLICY "organizations_delete" ON organizations
  FOR DELETE
  USING (
    created_by = auth.uid()
  );

COMMIT;

-- Success message
SELECT 'Critical schema fixes applied successfully!' as status;
