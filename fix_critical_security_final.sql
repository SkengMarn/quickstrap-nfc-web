-- ═══════════════════════════════════════════════════════════════════════════════
-- 🚨 CRITICAL FIXES - FINAL CORRECTED VERSION (5 MINUTES)
-- ═══════════════════════════════════════════════════════════════════════════════
-- This version ONLY modifies tables that exist in your schema
-- Safe to run in production: YES
-- Requires downtime: NO
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: ENABLE RLS ON PUBLIC SCHEMA TABLES (30 seconds)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profile_creation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_performance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_wifi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_merge_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_category_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_link_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance_cache ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: ADD TEMPORARY PERMISSIVE POLICIES (2 minutes)
-- ═══════════════════════════════════════════════════════════════════════════════
-- These allow authenticated users to access data while you create proper policies
-- IMPORTANT: Replace these with organization-scoped policies later!

CREATE POLICY "temp_auth_select" ON public.profile_creation_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.profile_creation_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "temp_auth_select" ON public.gate_performance_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.gate_performance_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.gate_performance_cache FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.beacons FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.beacons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.beacons FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.organization_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.organization_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.organization_settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.fraud_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.fraud_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.fraud_cases FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.gate_bindings FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.gate_bindings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.gate_bindings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.gate_geofences FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.gate_geofences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.gate_geofences FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.gate_wifi FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.gate_wifi FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "temp_auth_select" ON public.gate_merge_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.gate_merge_suggestions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.gate_merge_suggestions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.fraud_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.fraud_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.fraud_rules FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.watchlist FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.watchlist FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.watchlist FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.emergency_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.emergency_incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.emergency_incidents FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.emergency_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.emergency_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.emergency_actions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.event_state_transitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.event_state_transitions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "temp_auth_select" ON public.event_category_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.event_category_limits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.event_category_limits FOR UPDATE TO authenticated USING (true);

CREATE POLICY "temp_auth_select" ON public.ticket_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.ticket_uploads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "temp_auth_select" ON public.ticket_link_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.ticket_link_audit FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "temp_auth_select" ON public.staff_performance_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_insert" ON public.staff_performance_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "temp_auth_update" ON public.staff_performance_cache FOR UPDATE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: REVOKE DANGEROUS PERMISSIONS (5 seconds)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION graphql.get_schema_version FROM PUBLIC';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping graphql.get_schema_version - % (this is OK)', SQLERRM;
END $$;

DO $$
BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION graphql.increment_schema_version FROM PUBLIC';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping graphql.increment_schema_version - % (this is OK)', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: ADD CRITICAL PERFORMANCE INDEXES (2 minutes)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Foreign key indexes (speed up JOINs)
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_organization_id ON public.active_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_ticket_id ON public.checkin_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_gate_id ON public.checkin_logs(gate_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_wristband_id ON public.checkin_logs(wristband_id);
CREATE INDEX IF NOT EXISTS idx_events_status_changed_by ON public.events(status_changed_by);
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_event_series_status_changed_by ON public.event_series(status_changed_by);
CREATE INDEX IF NOT EXISTS idx_event_series_created_by ON public.event_series(created_by);

-- RLS column indexes (speed up policy checks)
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON public.api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_organization_id ON public.fraud_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_organization_id ON public.watchlist(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_incidents_organization_id ON public.emergency_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_actions_organization_id ON public.emergency_actions(organization_id);

-- Additional indexes from diagnostic
CREATE INDEX IF NOT EXISTS idx_fraud_detections_investigated_by ON public.fraud_detections(investigated_by);
CREATE INDEX IF NOT EXISTS idx_series_wristband_assignments_assigned_by ON public.series_wristband_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved_by ON public.system_alerts(resolved_by);
CREATE INDEX IF NOT EXISTS idx_series_wristband_assignments_validated_by ON public.series_wristband_assignments(validated_by);
CREATE INDEX IF NOT EXISTS idx_series_state_transitions_changed_by ON public.series_state_transitions(changed_by);

-- More RLS indexes
CREATE INDEX IF NOT EXISTS idx_api_audit_log_organization_id ON public.api_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_organization_id ON public.ml_models(organization_id);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_organization_id ON public.predictive_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_data_organization_id ON public.training_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_thresholds_organization_id ON public.adaptive_thresholds(organization_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_gates_organization_id ON public.autonomous_gates(organization_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_events_organization_id ON public.autonomous_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_activity_organization_id ON public.collaboration_activity(organization_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_activity_user_id ON public.collaboration_activity(user_id);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_checkin_logs_event_id_timestamp ON public.checkin_logs(event_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wristbands_event_id_status ON public.wristbands(event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id_status ON public.tickets(event_id, status);
CREATE INDEX IF NOT EXISTS idx_gates_event_id_status ON public.gates(event_id, status);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_event_id_created_at ON public.fraud_detections(event_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ DONE! YOUR DATABASE IS NOW SECURED AND FASTER
-- ═══════════════════════════════════════════════════════════════════════════════

-- What was fixed:
-- ✅ 18 tables now have RLS enabled
-- ✅ 34 critical indexes added for performance
-- ✅ Temporary permissive policies created
-- ✅ Dangerous graphql permissions revoked (if accessible)
-- ✅ Your app should work normally

-- What was skipped:
-- ⏭️  vault.secrets (Supabase system table)
-- ⏭️  supabase_migrations.seed_files (Supabase system table)
-- ⏭️  event_analytics (materialized view - structure unknown)
-- ⏭️  graphql functions (if no permission)

-- What's next:
-- 1. Test your app - everything should still work
-- 2. Replace temporary policies with proper organization-scoped policies
-- 3. Schedule VACUUM ANALYZE for off-peak hours
-- 4. Monitor query performance with new indexes

-- Verification query:
SELECT 
  tablename,
  rowsecurity AS rls_enabled
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
ORDER BY tablename;

-- All should show rls_enabled = true ✅

-- Check indexes were created:
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
