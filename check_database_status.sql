-- ========================================
-- QUICKSTRAP DATABASE STATUS CHECK
-- ========================================

-- 1. Check all tables and their RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Count total tables
SELECT 
  COUNT(*) as total_tables,
  COUNT(CASE WHEN rowsecurity THEN 1 END) as rls_enabled_count,
  COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as rls_disabled_count
FROM pg_tables
WHERE schemaname = 'public';

-- 3. Check if critical tables exist and have RLS
SELECT 
  'events' as table_name,
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') as exists,
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') as rls_enabled
UNION ALL
SELECT 
  'profiles',
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles'),
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles')
UNION ALL
SELECT 
  'organizations',
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations'),
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations')
UNION ALL
SELECT 
  'wristbands',
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wristbands'),
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wristbands')
UNION ALL
SELECT 
  'gates',
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gates'),
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gates')
UNION ALL
SELECT 
  'event_access',
  EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_access'),
  (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_access');

-- 4. Check existing RLS-related functions
SELECT 
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'check_rls_enabled' THEN '✅ Health check function exists'
    ELSE routine_name
  END as description
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%rls%' OR routine_name = 'check_rls_enabled')
ORDER BY routine_name;

-- 5. Check if check_rls_enabled function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'check_rls_enabled'
    ) 
    THEN '✅ check_rls_enabled() function EXISTS'
    ELSE '❌ check_rls_enabled() function MISSING - This is causing the health check error!'
  END as health_check_function_status;
