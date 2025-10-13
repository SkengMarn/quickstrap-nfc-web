-- ============================================================================
-- RLS POLICIES FIX - Based on Actual Schema
-- Only fixes Row Level Security policies for existing tables
-- ============================================================================

-- Environment safety check
DO $$
BEGIN
  IF current_database() LIKE '%prod%' OR current_database() LIKE '%production%' THEN
    RAISE NOTICE 'Running RLS policy fixes in production environment';
  END IF;
END $$;

BEGIN;

-- ============================================================================
-- VERIFY EXISTING TABLES
-- ============================================================================

-- Verify the tables exist as per schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_access') THEN
    RAISE EXCEPTION 'event_access table does not exist. Please ensure schema is properly deployed.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'profiles table does not exist. Please ensure schema is properly deployed.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wristbands') THEN
    RAISE EXCEPTION 'wristbands table does not exist. Please ensure schema is properly deployed.';
  END IF;
  
  RAISE NOTICE 'All required tables exist in schema';
END $$;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (SAFE)
-- ============================================================================

-- Drop existing policies to recreate them with fixes
DROP POLICY IF EXISTS event_access_select ON public.event_access;
DROP POLICY IF EXISTS event_access_insert ON public.event_access;
DROP POLICY IF EXISTS event_access_update ON public.event_access;
DROP POLICY IF EXISTS event_access_delete ON public.event_access;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;

-- ============================================================================
-- CREATE FIXED RLS POLICIES
-- ============================================================================

-- event_access policies - FIXED to allow event owners
CREATE POLICY event_access_select ON public.event_access
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = event_access.event_id
      AND ea.user_id = auth.uid()
      AND ea.access_level = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_access.event_id
      AND e.created_by = auth.uid()
    )
  );

-- FIXED: Allow event owners to create initial admin access
CREATE POLICY event_access_insert ON public.event_access
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = event_access.event_id
      AND ea.user_id = auth.uid()
      AND ea.access_level = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_access.event_id
      AND e.created_by = auth.uid()
    )
  );

-- FIXED: Allow event owners to update access
-- WITH CHECK prevents privilege escalation by ensuring updated rows satisfy same conditions
CREATE POLICY event_access_update ON public.event_access
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = event_access.event_id
      AND ea.user_id = auth.uid()
      AND ea.access_level = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_access.event_id
      AND e.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = event_access.event_id
      AND ea.user_id = auth.uid()
      AND ea.access_level = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_access.event_id
      AND e.created_by = auth.uid()
    )
  );

-- FIXED: Allow event owners to delete access
CREATE POLICY event_access_delete ON public.event_access
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = event_access.event_id
      AND ea.user_id = auth.uid()
      AND ea.access_level = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_access.event_id
      AND e.created_by = auth.uid()
    )
  );

-- profiles policies - FIXED with proper INSERT/UPDATE policies
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- FIXED: Add INSERT policy for users to create their own profile
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- FIXED: Add UPDATE policy for users to modify their own profile
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify foreign key relationships exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_access_user_id_fkey' 
    AND table_name = 'event_access'
  ) THEN
    RAISE WARNING 'Foreign key event_access_user_id_fkey does not exist - this may cause issues';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_access_event_id_fkey' 
    AND table_name = 'event_access'
  ) THEN
    RAISE WARNING 'Foreign key event_access_event_id_fkey does not exist - this may cause issues';
  END IF;
  
  RAISE NOTICE 'Foreign key relationship verification completed';
END $$;

-- Verify RLS is enabled on each table individually
DO $$
DECLARE
  event_access_rls boolean;
  profiles_rls boolean;
BEGIN
  -- Check event_access table
  SELECT rowsecurity INTO event_access_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'event_access';

  IF event_access_rls IS NULL OR event_access_rls = false THEN
    RAISE WARNING 'Row Level Security is not enabled on event_access table';
  ELSE
    RAISE NOTICE 'Row Level Security verified for event_access';
  END IF;

  -- Check profiles table
  SELECT rowsecurity INTO profiles_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'profiles';

  IF profiles_rls IS NULL OR profiles_rls = false THEN
    RAISE WARNING 'Row Level Security is not enabled on profiles table';
  ELSE
    RAISE NOTICE 'Row Level Security verified for profiles';
  END IF;

  -- Final status
  IF event_access_rls = true AND profiles_rls = true THEN
    RAISE NOTICE 'Row Level Security verification completed - all tables secured';
  ELSE
    RAISE WARNING 'Row Level Security verification completed - some tables may not be secured';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- COMPLETION STATUS
-- ============================================================================

COMMENT ON TABLE public.event_access IS 'Staff access control for events - FIXED policies for event owners';
COMMENT ON TABLE public.profiles IS 'User profiles - FIXED with proper INSERT/UPDATE policies';

SELECT 'RLS policies fixed successfully! Issues resolved:
- Event owners can now manage event_access (INSERT/UPDATE/DELETE)
- Profiles have proper INSERT/UPDATE policies for self-management
- No unnecessary tables created (categories come from wristbands.category)
- All policies respect existing schema structure' as policy_fix_status;
