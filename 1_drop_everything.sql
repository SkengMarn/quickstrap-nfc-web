-- ============================================================================
-- STEP 1: DROP EVERYTHING - Clean Slate
-- ============================================================================
-- This removes ALL existing tables, types, and functions
-- Safe to run even if tables don't exist
-- Execution time: ~30 seconds
-- ============================================================================

BEGIN;

-- Drop materialized views first (if they exist)
DROP MATERIALIZED VIEW IF EXISTS recent_checkins_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS event_analytics_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gate_analytics_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS category_analytics_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS staff_analytics_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS fraud_analytics_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS gate_performance_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS event_metrics_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS category_analytics_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS staff_performance_cache CASCADE;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS performance_schedule CASCADE;
DROP TABLE IF EXISTS query_performance_log CASCADE;
DROP TABLE IF EXISTS security_incidents CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS system_status CASCADE;
DROP TABLE IF EXISTS telegram_menu_state CASCADE;
DROP TABLE IF EXISTS telegram_login_sessions CASCADE;
DROP TABLE IF EXISTS telegram_auth_sessions CASCADE;
DROP TABLE IF EXISTS system_health_logs CASCADE;
DROP TABLE IF EXISTS system_alerts CASCADE;
DROP TABLE IF EXISTS staff_performance CASCADE;
DROP TABLE IF EXISTS staff_messages CASCADE;
DROP TABLE IF EXISTS scheduled_reports CASCADE;
DROP TABLE IF EXISTS resource_locks CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS predictive_insights CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS organization_settings CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS ml_models CASCADE;
DROP TABLE IF EXISTS gate_wifi CASCADE;
DROP TABLE IF EXISTS gate_merges CASCADE;
DROP TABLE IF EXISTS gate_merge_suggestions CASCADE;
DROP TABLE IF EXISTS gate_geofences CASCADE;
DROP TABLE IF EXISTS gate_bindings CASCADE;
DROP TABLE IF EXISTS gates CASCADE;
DROP TABLE IF EXISTS fraud_rules CASCADE;
DROP TABLE IF EXISTS fraud_cases CASCADE;
DROP TABLE IF EXISTS fraud_detections CASCADE;
DROP TABLE IF EXISTS export_jobs CASCADE;
DROP TABLE IF EXISTS event_templates CASCADE;
DROP TABLE IF EXISTS event_state_transitions CASCADE;
DROP TABLE IF EXISTS event_clones CASCADE;
DROP TABLE IF EXISTS event_category_limits CASCADE;
DROP TABLE IF EXISTS event_access CASCADE;
DROP TABLE IF EXISTS emergency_status CASCADE;
DROP TABLE IF EXISTS emergency_actions CASCADE;
DROP TABLE IF EXISTS emergency_incidents CASCADE;
DROP TABLE IF EXISTS collaboration_activity CASCADE;
DROP TABLE IF EXISTS checkin_logs CASCADE;
DROP TABLE IF EXISTS beacons CASCADE;
DROP TABLE IF EXISTS autonomous_gates CASCADE;
DROP TABLE IF EXISTS autonomous_events CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS api_rate_limits CASCADE;
DROP TABLE IF EXISTS api_audit_log CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS adaptive_thresholds CASCADE;
DROP TABLE IF EXISTS active_sessions CASCADE;
DROP TABLE IF EXISTS wristband_blocks CASCADE;
DROP TABLE IF EXISTS wristbands CASCADE;
DROP TABLE IF EXISTS ticket_wristband_links CASCADE;
DROP TABLE IF EXISTS ticket_uploads CASCADE;
DROP TABLE IF EXISTS ticket_link_audit CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS template_gates CASCADE;
DROP TABLE IF EXISTS template_categories CASCADE;
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS training_data CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS recent_checkins_cache_id_seq CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS lifecycle_status CASCADE;
DROP TYPE IF EXISTS org_role CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS has_event_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS activate_scheduled_events() CASCADE;
DROP FUNCTION IF EXISTS check_and_activate_events() CASCADE;
DROP FUNCTION IF EXISTS sync_ticket_linking_columns() CASCADE;

COMMIT;

-- ============================================================================
-- Verification: Check that everything is dropped
-- ============================================================================
SELECT 
  'Tables remaining: ' || COUNT(*)::text as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE 'sql_%';

-- Should return: "Tables remaining: 0"
