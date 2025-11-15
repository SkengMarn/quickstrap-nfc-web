-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔍 SECURITY STATUS VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run this to verify all security fixes were applied successfully
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHECK 1: RLS STATUS ON ALL TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ SECURED'
    ELSE '❌ VULNERABLE'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profile_creation_log', 'gate_performance_cache', 'beacons',
    'organization_settings', 'fraud_cases', 'gate_bindings', 'gate_geofences',
    'gate_wifi', 'gate_merge_suggestions', 'fraud_rules', 'watchlist',
    'emergency_incidents', 'emergency_actions', 'event_state_transitions',
    'event_category_limits', 'ticket_uploads', 'ticket_link_audit',
    'staff_performance_cache'
  )
ORDER BY 
  CASE WHEN rowsecurity THEN 0 ELSE 1 END,
  tablename;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHECK 2: POLICY COUNT PER TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profile_creation_log', 'gate_performance_cache', 'beacons',
    'organization_settings', 'fraud_cases', 'gate_bindings', 'gate_geofences',
    'gate_wifi', 'gate_merge_suggestions', 'fraud_rules', 'watchlist',
    'emergency_incidents', 'emergency_actions', 'event_state_transitions',
    'event_category_limits', 'ticket_uploads', 'ticket_link_audit',
    'staff_performance_cache'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHECK 3: PERFORMANCE INDEXES CREATED
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  COUNT(*) as total_indexes,
  COUNT(DISTINCT tablename) as tables_with_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHECK 4: CRITICAL INDEXES VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  'idx_active_sessions_user_id' as expected_index,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_active_sessions_user_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'idx_checkin_logs_event_id_timestamp', 
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_checkin_logs_event_id_timestamp') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'idx_events_organization_id',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_events_organization_id')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'idx_fraud_rules_organization_id',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fraud_rules_organization_id')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'idx_wristbands_event_id_status',
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wristbands_event_id_status')
  THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHECK 5: TABLES WITHOUT RLS (POTENTIAL VULNERABILITIES)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  tablename,
  '⚠️ NO RLS ENABLED' as warning
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN (
    -- System/managed tables that don't need RLS
    'schema_migrations', 'supabase_migrations'
  )
ORDER BY tablename;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHECK 6: SUMMARY REPORT
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
  '🔒 SECURITY STATUS' as category,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as secured_tables,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false 
   AND tablename NOT IN ('schema_migrations', 'supabase_migrations')) as vulnerable_tables,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') as performance_indexes;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ NEXT STEPS
-- ═══════════════════════════════════════════════════════════════════════════════

/*
WHAT TO DO NEXT:

1. ✅ IMMEDIATE (DONE):
   - RLS enabled on 18 critical tables
   - 34+ performance indexes created
   - Temporary permissive policies in place

2. ⚠️ URGENT (DO THIS WEEK):
   - Replace temporary policies with organization-scoped policies
   - Example:
     DROP POLICY "temp_auth_select" ON fraud_cases;
     CREATE POLICY "org_member_select" ON fraud_cases 
       FOR SELECT TO authenticated 
       USING (
         organization_id IN (
           SELECT organization_id FROM organization_members 
           WHERE user_id = auth.uid() AND status = 'active'
         )
       );

3. 📊 MONITORING (ONGOING):
   - Run this verification script weekly
   - Monitor query performance with new indexes
   - Check for tables without RLS

4. 🔧 OPTIMIZATION (NEXT MONTH):
   - Run VACUUM ANALYZE during off-peak hours
   - Review and optimize policies based on usage patterns
   - Add more specific indexes if needed

5. 🛡️ SECURITY HARDENING (ONGOING):
   - Enable RLS on remaining tables as needed
   - Implement row-level policies for all sensitive data
   - Regular security audits
*/
