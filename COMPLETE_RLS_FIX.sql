-- ========================================
-- COMPLETE RLS HEALTH CHECK FIX
-- ========================================
-- This script creates the missing check_rls_enabled() function
-- and enables RLS on all critical tables if not already enabled.
--
-- Run this in your Supabase SQL Editor to fix the health check errors.
-- ========================================

-- 1. Create the check_rls_enabled function
CREATE OR REPLACE FUNCTION check_rls_enabled()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rls_status boolean;
  tables_without_rls integer;
BEGIN
  -- Count critical tables without RLS enabled
  SELECT COUNT(*) INTO tables_without_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN ('events', 'profiles', 'organizations', 'wristbands', 'gates', 'event_access', 'tickets', 'checkin_logs')
  AND NOT c.relrowsecurity;
  
  -- Return true if all critical tables have RLS enabled
  RETURN tables_without_rls = 0;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION check_rls_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION check_rls_enabled() TO anon;

-- 2. Enable RLS on all critical tables (if not already enabled)
-- This is safe to run multiple times - it will only enable if needed

DO $$
DECLARE
  table_name text;
  tables_to_secure text[] := ARRAY[
    'events',
    'profiles', 
    'organizations',
    'organization_members',
    'wristbands',
    'tickets',
    'gates',
    'event_access',
    'checkin_logs',
    'fraud_detections',
    'system_alerts',
    'audit_log',
    'event_series',
    'wristband_blocks',
    'ticket_wristband_links'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_to_secure
  LOOP
    -- Check if table exists before enabling RLS
    IF EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);
      RAISE NOTICE 'RLS enabled on table: %', table_name;
    ELSE
      RAISE NOTICE 'Table does not exist, skipping: %', table_name;
    END IF;
  END LOOP;
END;
$$;

-- 3. Test the function
SELECT 
  check_rls_enabled() as rls_check_result,
  CASE 
    WHEN check_rls_enabled() THEN '✅ All critical tables have RLS enabled'
    ELSE '⚠️ Some critical tables are missing RLS policies'
  END as status;

-- 4. Show detailed RLS status for all tables
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ Protected'
    ELSE '❌ Unprotected'
  END as security_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY 
  rowsecurity DESC,
  tablename;

-- ========================================
-- VERIFICATION COMPLETE
-- ========================================
-- After running this script:
-- 1. The health check error should disappear
-- 2. All critical tables will have RLS enabled
-- 3. The app should load without warnings
-- ========================================
