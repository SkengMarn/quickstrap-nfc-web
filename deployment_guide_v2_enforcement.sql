-- ========================================================================
-- 🚀 DEPLOYMENT GUIDE: V2.0 DISCOVERY + AUTONOMOUS ENFORCEMENT
-- Complete Setup for Production
-- ========================================================================

-- ========================================================================
-- PART 1: PREREQUISITES CHECK
-- ========================================================================

-- Run this to verify all required tables exist:

DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  table_name TEXT;
BEGIN
  -- Check for required tables
  FOR table_name IN 
    SELECT unnest(ARRAY[
      'events',
      'gates',
      'checkin_logs',
      'wristbands',
      'autonomous_gates',
      'gate_bindings',
      'autonomous_events',
      'gate_performance_cache',
      'gate_merge_suggestions'
    ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing required tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All required tables exist!';
  END IF;
END $$;

-- ========================================================================
-- PART 2: DISABLE BASIC DISCOVERY (Important!)
-- ========================================================================

/*
Since you're using V2.0, we need to ensure Basic Discovery functions
are NEVER called. Here's how to safely disable them:
*/

-- Create "deprecated" wrapper functions that warn if called
CREATE OR REPLACE FUNCTION discover_physical_gates(p_event_id UUID)
RETURNS TABLE (
  cluster_id TEXT,
  gate_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  checkin_count INTEGER,
  dominant_category TEXT,
  category_distribution JSONB,
  first_seen TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE,
  avg_accuracy DOUBLE PRECISION,
  confidence_score NUMERIC,
  derivation_method TEXT,
  metadata JSONB
) AS $$
BEGIN
  RAISE WARNING '⚠️  discover_physical_gates() is DEPRECATED. Use discover_physical_gates_v2() instead!';
  RAISE EXCEPTION 'This function has been disabled. Use V2.0 functions: discover_physical_gates_v2()';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION discover_virtual_gates(p_event_id UUID)
RETURNS TABLE (
  virtual_gate_id TEXT,
  gate_name TEXT,
  category TEXT,
  checkin_count INTEGER,
  unique_attendees INTEGER,
  first_seen TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE,
  confidence_score NUMERIC,
  derivation_method TEXT,
  metadata JSONB
) AS $$
BEGIN
  RAISE WARNING '⚠️  discover_virtual_gates() is DEPRECATED. Use discover_virtual_gates_v2() instead!';
  RAISE EXCEPTION 'This function has been disabled. Use V2.0 functions: discover_virtual_gates_v2()';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION derive_all_gates(p_event_id UUID)
RETURNS TABLE (
  gate_id TEXT,
  gate_name TEXT,
  gate_type TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  dominant_category TEXT,
  checkin_count INTEGER,
  unique_attendees INTEGER,
  confidence_score NUMERIC,
  derivation_method TEXT,
  should_enforce BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RAISE WARNING '⚠️  derive_all_gates() is DEPRECATED. Use derive_all_gates_v2() instead!';
  RAISE EXCEPTION 'This function has been disabled. Use V2.0 functions: derive_all_gates_v2()';
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PART 3: CREATE UNIFIED ORCHESTRATION FUNCTIONS
-- ========================================================================

-- Master function: Run V2.0 discovery for all active events
CREATE OR REPLACE FUNCTION run_gate_discovery_v2()
RETURNS TABLE(
  event_id UUID,
  event_name TEXT,
  gates_created INTEGER,
  gates_updated INTEGER,
  orphans_assigned INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  r RECORD;
  start_time TIMESTAMP;
  v_created INTEGER;
  v_updated INTEGER;
  v_orphans INTEGER;
BEGIN
  FOR r IN 
    SELECT DISTINCT e.id, e.name
    FROM events e
    WHERE e.lifecycle_status IN ('active', 'scheduled')
      AND e.is_active = true
      AND EXISTS (
        SELECT 1 FROM checkin_logs cl
        WHERE cl.event_id = e.id
          AND cl.timestamp >= NOW() - INTERVAL '24 hours'
        LIMIT 1
      )
  LOOP
    start_time := clock_timestamp();
    
    -- Run V2.0 complete pipeline
    SELECT 
      COUNT(*) FILTER (WHERE action = 'created'),
      COUNT(*) FILTER (WHERE action = 'updated'),
      0  -- Orphans will be counted separately
    INTO v_created, v_updated, v_orphans
    FROM execute_complete_gate_pipeline_v2(r.id);
    
    -- Get orphans assigned count
    SELECT COUNT(*) INTO v_orphans
    FROM checkin_logs
    WHERE event_id = r.id
      AND gate_id IS NOT NULL
      AND updated_at >= start_time;
    
    RETURN QUERY SELECT 
      r.id,
      r.name,
      v_created,
      v_updated,
      v_orphans,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER;
    
    RAISE NOTICE 'V2.0 Discovery for event % (%): Created %, Updated %, Orphans %, Time %ms',
      r.name, r.id, v_created, v_updated, v_orphans,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Master function: Run autonomous enforcement for all active events
CREATE OR REPLACE FUNCTION run_autonomous_enforcement()
RETURNS TABLE(
  event_id UUID,
  event_name TEXT,
  gates_processed INTEGER,
  gates_learning INTEGER,
  gates_enforcing INTEGER,
  new_bindings INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  r RECORD;
  start_time TIMESTAMP;
  v_gates_processed INTEGER;
  v_learning INTEGER;
  v_enforcing INTEGER;
  v_bindings INTEGER;
BEGIN
  FOR r IN 
    SELECT DISTINCT e.id, e.name
    FROM events e
    WHERE e.lifecycle_status = 'active'
      AND e.is_active = true
      AND e.start_date <= NOW()
      AND e.end_date >= NOW() - INTERVAL '1 hour'
      AND EXISTS (
        SELECT 1 FROM gates g
        WHERE g.event_id = e.id AND g.status = 'active'
        LIMIT 1
      )
  LOOP
    start_time := clock_timestamp();
    
    -- Run autonomous learning
    SELECT COUNT(*) INTO v_gates_processed
    FROM learn_and_enforce_gates_fixed(
      p_event_id := r.id,
      p_learning_window_hours := 4.0,
      p_cluster_epsilon_meters := 25.0,
      p_min_samples := 5,
      p_soft_threshold := 0.70,
      p_hard_threshold := 0.80,
      p_min_effective_samples := 20
    );
    
    -- Count learning/enforcing gates
    SELECT 
      COUNT(*) FILTER (WHERE status = 'learning'),
      COUNT(*) FILTER (WHERE status = 'optimizing')
    INTO v_learning, v_enforcing
    FROM autonomous_gates ag
    JOIN gates g ON ag.gate_id = g.id
    WHERE g.event_id = r.id
      AND g.status = 'active';
    
    -- Count new bindings created in this cycle
    SELECT COUNT(*) INTO v_bindings
    FROM gate_bindings gb
    JOIN gates g ON gb.gate_id = g.id
    WHERE g.event_id = r.id
      AND gb.updated_at >= start_time;
    
    RETURN QUERY SELECT 
      r.id,
      r.name,
      v_gates_processed,
      v_learning,
      v_enforcing,
      v_bindings,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER;
    
    RAISE NOTICE 'Enforcement for event % (%): Processed %, Learning %, Enforcing %, New bindings %, Time %ms',
      r.name, r.id, v_gates_processed, v_learning, v_enforcing, v_bindings,
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PART 4: CREATE UNIFIED VIEWS
-- ========================================================================

-- Comprehensive view combining V2.0 discovery + autonomous enforcement
CREATE OR REPLACE VIEW v_gates_complete AS
SELECT
  g.id as gate_id,
  g.event_id,
  e.name as event_name,
  g.name as gate_name,
  g.status as gate_status,
  
  -- Location (from V2.0 discovery)
  g.latitude,
  g.longitude,
  g.derivation_method,
  g.derivation_confidence as discovery_confidence,
  g.health_score,
  g.spatial_variance,
  
  -- Autonomous enforcement status
  ag.status as enforcement_status,
  ag.confidence_score as enforcement_confidence,
  ag.total_processed as learning_samples,
  ag.decisions_count as enforcement_decisions,
  ag.last_decision_at as last_learning_at,
  
  -- Category bindings (what this gate enforces)
  COALESCE(
    JSONB_OBJECT_AGG(
      gb.category,
      JSONB_BUILD_OBJECT(
        'status', gb.status,
        'confidence', ROUND(gb.confidence::NUMERIC, 3),
        'sample_count', gb.sample_count,
        'last_updated', gb.updated_at
      )
    ) FILTER (WHERE gb.category IS NOT NULL),
    '{}'::JSONB
  ) as category_bindings,
  
  -- Performance metrics (from V2.0)
  COALESCE(gpc.total_scans, 0) as total_scans,
  COALESCE(gpc.successful_scans, 0) as successful_scans,
  COALESCE(gpc.failed_scans, 0) as failed_scans,
  gpc.category_breakdown,
  gpc.last_scan_at,
  
  -- Overall status
  CASE
    -- Critical issues
    WHEN g.health_score < 50 THEN 'critical'
    WHEN g.derivation_confidence < 0.5 THEN 'low_confidence'
    
    -- Enforcement states
    WHEN ag.status = 'optimizing' AND ag.confidence_score >= 0.80 
      THEN 'enforcing'
    WHEN ag.status = 'optimizing' AND ag.confidence_score >= 0.70 
      THEN 'soft_enforcing'
    WHEN ag.status = 'learning' 
      THEN 'learning'
    
    -- Activity states
    WHEN COALESCE(gpc.total_scans, 0) = 0 
      THEN 'unused'
    WHEN COALESCE(gpc.total_scans, 0) < 10 
      THEN 'low_activity'
    
    -- Health concerns
    WHEN g.health_score < 70 
      THEN 'needs_attention'
    
    ELSE 'active'
  END as overall_status,
  
  -- System info
  JSONB_BUILD_OBJECT(
    'discovery_method', g.derivation_method,
    'has_enforcement', (ag.gate_id IS NOT NULL),
    'has_bindings', (COUNT(gb.id) > 0),
    'has_activity', (gpc.total_scans > 0)
  ) as system_info,
  
  g.metadata as discovery_metadata,
  g.created_at,
  g.updated_at

FROM gates g
JOIN events e ON g.event_id = e.id
LEFT JOIN autonomous_gates ag ON g.id = ag.gate_id
LEFT JOIN gate_bindings gb ON g.id = gb.gate_id
LEFT JOIN gate_performance_cache gpc ON g.id = gpc.gate_id AND g.event_id = gpc.event_id
WHERE g.status != 'deleted'
GROUP BY 
  g.id, g.event_id, e.name, g.name, g.status, g.latitude, g.longitude,
  g.derivation_method, g.derivation_confidence, g.health_score, g.spatial_variance,
  ag.status, ag.confidence_score, ag.total_processed, ag.decisions_count, ag.last_decision_at,
  gpc.total_scans, gpc.successful_scans, gpc.failed_scans, 
  gpc.category_breakdown, gpc.last_scan_at,
  g.metadata, g.created_at, g.updated_at
ORDER BY e.name, COALESCE(gpc.total_scans, 0) DESC;

-- View: Only active gates with enforcement
CREATE OR REPLACE VIEW v_gates_enforcing AS
SELECT *
FROM v_gates_complete
WHERE overall_status IN ('enforcing', 'soft_enforcing', 'learning')
  AND total_scans > 0;

-- View: Gates needing attention
CREATE OR REPLACE VIEW v_gates_attention AS
SELECT *
FROM v_gates_complete
WHERE overall_status IN ('critical', 'low_confidence', 'needs_attention');

-- View: System health dashboard
CREATE OR REPLACE VIEW v_system_health_dashboard AS
SELECT
  e.id as event_id,
  e.name as event_name,
  e.lifecycle_status,
  
  -- Discovery metrics (V2.0)
  COUNT(DISTINCT g.id) as total_gates,
  COUNT(DISTINCT g.id) FILTER (
    WHERE g.derivation_method LIKE '%v2%'
  ) as v2_discovered_gates,
  AVG(g.health_score) as avg_gate_health,
  
  -- Enforcement metrics (Autonomous)
  COUNT(DISTINCT ag.gate_id) as gates_with_learning,
  COUNT(DISTINCT ag.gate_id) FILTER (
    WHERE ag.status = 'learning'
  ) as gates_learning,
  COUNT(DISTINCT ag.gate_id) FILTER (
    WHERE ag.status = 'optimizing'
  ) as gates_enforcing,
  COUNT(DISTINCT gb.id) as total_bindings,
  COUNT(DISTINCT gb.id) FILTER (
    WHERE gb.status = 'enforced'
  ) as enforced_bindings,
  COUNT(DISTINCT gb.id) FILTER (
    WHERE gb.status = 'probation'
  ) as probation_bindings,
  
  -- Performance metrics
  SUM(gpc.total_scans) as total_checkins,
  SUM(gpc.successful_scans) as successful_checkins,
  SUM(gpc.failed_scans) as failed_checkins,
  
  -- Activity timestamps
  MAX(gpc.last_scan_at) as last_checkin,
  MAX(ag.last_decision_at) as last_learning_cycle,
  MAX(gpc.last_computed_at) as last_cache_update,
  
  -- Health status
  CASE
    WHEN COUNT(DISTINCT g.id) = 0 
      THEN 'no_gates_discovered'
    WHEN COUNT(DISTINCT ag.gate_id) = 0 
      THEN 'no_learning_active'
    WHEN COUNT(DISTINCT gb.id) FILTER (WHERE gb.status = 'enforced') = 0 
      THEN 'no_enforcement_yet'
    WHEN AVG(g.health_score) < 70 
      THEN 'gates_unhealthy'
    WHEN MAX(ag.last_decision_at) < NOW() - INTERVAL '10 minutes' 
      THEN 'learning_stale'
    ELSE 'healthy'
  END as system_status,
  
  -- Recommendations
  CASE
    WHEN COUNT(DISTINCT g.id) = 0 
      THEN 'Run gate discovery: SELECT * FROM run_gate_discovery_v2();'
    WHEN COUNT(DISTINCT ag.gate_id) = 0 
      THEN 'Start enforcement: SELECT * FROM run_autonomous_enforcement();'
    WHEN AVG(g.health_score) < 70 
      THEN 'Check gate health: SELECT * FROM v_gates_attention;'
    WHEN MAX(ag.last_decision_at) < NOW() - INTERVAL '10 minutes' 
      THEN 'Learning may be stalled. Check cron job schedule.'
    ELSE 'System operating normally'
  END as recommendation

FROM events e
LEFT JOIN gates g ON e.id = g.event_id AND g.status = 'active'
LEFT JOIN autonomous_gates ag ON g.id = ag.gate_id
LEFT JOIN gate_bindings gb ON g.id = gb.gate_id
LEFT JOIN gate_performance_cache gpc ON g.id = gpc.gate_id AND e.id = gpc.event_id
WHERE e.lifecycle_status IN ('active', 'scheduled')
GROUP BY e.id, e.name, e.lifecycle_status
ORDER BY e.start_date DESC;

-- ========================================================================
-- PART 5: SETUP SCHEDULING (pg_cron)
-- ========================================================================

/*
SCHEDULING STRATEGY:
────────────────────

V2.0 Discovery: Triggered automatically by check-in count (already set up)
  - First discovery: 50 check-ins
  - Refresh: Every 100 check-ins
  - Orphan assignment: Every 50 check-ins

Autonomous Enforcement: Run every 3 minutes via cron
  - Continuously learns from new check-ins
  - Updates confidence scores
  - Moves gates from learning → enforcing
*/

-- Install pg_cron if not already installed
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule autonomous enforcement (every 3 minutes)
SELECT cron.schedule(
  'autonomous-enforcement',
  '*/3 * * * *',
  'SELECT run_autonomous_enforcement()'
);

-- Optional: Schedule manual discovery refresh (hourly backup)
-- This is a safety net in case the auto-trigger misses something
SELECT cron.schedule(
  'discovery-refresh',
  '0 * * * *',  -- Every hour
  'SELECT run_gate_discovery_v2()'
);

-- View scheduled jobs
SELECT * FROM cron.job ORDER BY jobname;

-- ========================================================================
-- PART 6: PERFORMANCE OPTIMIZATION
-- ========================================================================

-- Add critical indexes
CREATE INDEX IF NOT EXISTS idx_checkin_logs_event_gps_success 
ON checkin_logs (event_id, app_lat, app_lon, timestamp) 
WHERE status = 'success' AND app_lat IS NOT NULL AND app_lon IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gates_event_location_active 
ON gates (event_id, latitude, longitude, status) 
WHERE status = 'active' AND latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkin_logs_gate_timestamp 
ON checkin_logs (gate_id, timestamp, status) 
WHERE gate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_autonomous_gates_status 
ON autonomous_gates (gate_id, status, last_decision_at);

CREATE INDEX IF NOT EXISTS idx_gate_bindings_gate_category 
ON gate_bindings (gate_id, category, status);

CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_event 
ON gate_performance_cache (event_id, gate_id, last_scan_at);

-- Analyze tables for query optimization
ANALYZE gates;
ANALYZE checkin_logs;
ANALYZE autonomous_gates;
ANALYZE gate_bindings;
ANALYZE gate_performance_cache;

-- ========================================================================
-- PART 7: MONITORING QUERIES
-- ========================================================================

-- Quick health check
SELECT * FROM v_system_health_dashboard WHERE system_status != 'healthy';

-- View all gates for an event
SELECT * FROM v_gates_complete WHERE event_id = 'your-event-id';

-- View gates currently enforcing
SELECT 
  gate_name,
  enforcement_status,
  enforcement_confidence,
  category_bindings,
  total_scans
FROM v_gates_enforcing
ORDER BY total_scans DESC;

-- View gates needing attention
SELECT 
  event_name,
  gate_name,
  overall_status,
  health_score,
  discovery_confidence,
  total_scans
FROM v_gates_attention
ORDER BY health_score NULLS FIRST;

-- Check recent enforcement decisions
SELECT 
  ae.created_at,
  e.name as event_name,
  g.name as gate_name,
  ae.event_type,
  ae.action,
  ae.reasoning,
  ROUND(ae.confidence_score::NUMERIC * 100, 1) || '%' as confidence,
  ae.metadata->>'category' as category
FROM autonomous_events ae
JOIN gates g ON ae.gate_id = g.id
JOIN events e ON ae.event_id = e.id
WHERE ae.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY ae.created_at DESC
LIMIT 50;

-- Check cron job execution
SELECT 
  jobname,
  schedule,
  last_run_time,
  next_run_time,
  job_status
FROM cron.job_run_details
WHERE jobname IN ('autonomous-enforcement', 'discovery-refresh')
ORDER BY last_run_time DESC
LIMIT 20;

-- ========================================================================
-- PART 8: TESTING CHECKLIST
-- ========================================================================

/*
✅ DEPLOYMENT VERIFICATION:
───────────────────────────

Run these queries in order to verify everything works:
*/

-- 1. Check prerequisites
DO $$
BEGIN
  RAISE NOTICE 'Step 1: Checking prerequisites...';
END $$;
-- (Run PART 1 above)

-- 2. Test V2.0 discovery manually
SELECT 'Step 2: Testing V2.0 discovery...' as step;
SELECT * FROM discover_physical_gates_v2('your-test-event-id') LIMIT 5;

-- 3. Test gate materialization
SELECT 'Step 3: Testing materialization...' as step;
SELECT * FROM execute_complete_gate_pipeline_v2('your-test-event-id');

-- 4. Test autonomous enforcement
SELECT 'Step 4: Testing autonomous enforcement...' as step;
SELECT * FROM learn_and_enforce_gates_fixed('your-test-event-id');

-- 5. Check unified view
SELECT 'Step 5: Checking unified view...' as step;
SELECT * FROM v_gates_complete WHERE event_id = 'your-test-event-id';

-- 6. Verify system health
SELECT 'Step 6: Verifying system health...' as step;
SELECT * FROM v_system_health_dashboard WHERE event_id = 'your-test-event-id';

-- 7. Test real-time validation
SELECT 'Step 7: Testing real-time validation...' as step;
SELECT * FROM validate_checkin_against_gates(
  p_event_id := 'your-test-event-id',
  p_category := 'VIP',
  p_lat := -1.2921,
  p_lon := 36.8219,
  p_max_distance_meters := 50.0
);

-- 8. Verify cron jobs scheduled
SELECT 'Step 8: Verifying cron jobs...' as step;
SELECT jobname, schedule, active FROM cron.job 
WHERE jobname IN ('autonomous-enforcement', 'discovery-refresh');

/*
✅ EXPECTED RESULTS:
────────────────────

Step 1: All tables exist
Step 2: Returns discovered gate clusters
Step 3: Creates/updates gates, assigns orphans
Step 4: Returns gate learning results
Step 5: Shows gates with discovery + enforcement data
Step 6: Shows 'healthy' or specific recommendations
Step 7: Returns validation result with gate info
Step 8: Shows 2 active cron jobs
*/

-- ========================================================================
-- PART 9: TROUBLESHOOTING GUIDE
-- ========================================================================

/*
COMMON ISSUES:
──────────────

ISSUE: "No gates discovered"
SOLUTION:
  1. Check if event has sufficient check-ins (need 50+)
  2. Verify GPS data exists: SELECT COUNT(*) FROM checkin_logs 
     WHERE event_id = 'xxx' AND app_lat IS NOT NULL;
  3. Check GPS quality: Run is_valid_gps() on sample data
  4. Manually run: SELECT * FROM run_gate_discovery_v2();

ISSUE: "Learning not starting"
SOLUTION:
  1. Verify gates exist: SELECT * FROM gates WHERE event_id = 'xxx';
  2. Check cron job running: SELECT * FROM cron.job_run_details 
     WHERE jobname = 'autonomous-enforcement';
  3. Manually run: SELECT * FROM run_autonomous_enforcement();
  4. Check for errors in logs

ISSUE: "Duplicate gates appearing"
SOLUTION:
  1. This shouldn't happen with V2.0! Check if Basic Discovery was called
  2. Find duplicates: See integration_guide.sql PART 6
  3. Merge duplicates: Use merge_duplicate_gates() function
  4. Verify only V2.0 functions being called

ISSUE: "Enforcement not activating"
SOLUTION:
  1. Check confidence scores: SELECT * FROM v_gates_complete;
  2. Verify sufficient samples: enforcement_confidence should reach 0.70+
  3. Check learning window: May need more time/check-ins
  4. Review thresholds in learn_and_enforce_gates_fixed() parameters

ISSUE: "Performance slow"
SOLUTION:
  1. Check indexes exist: Run PART 6 above
  2. Analyze tables: ANALYZE gates; ANALYZE checkin_logs;
  3. Reduce discovery frequency (increase from 100 to 200 check-ins)
  4. Limit enforcement to active events only
*/

-- ========================================================================
-- PART 10: MAINTENANCE TASKS
-- ========================================================================

-- Daily: Check system health
SELECT * FROM v_system_health_dashboard ORDER BY event_name;

-- Weekly: Review merge suggestions
SELECT 
  event_id,
  source_gate_id,
  target_gate_id,
  distance_meters,
  confidence_score,
  status
FROM gate_merge_suggestions
WHERE status = 'pending'
ORDER BY confidence_score DESC;

-- Monthly: Archive old autonomous decisions
DELETE FROM autonomous_events 
WHERE created_at < NOW() - INTERVAL '90 days'
  AND event_id IN (
    SELECT id FROM events WHERE lifecycle_status = 'completed'
  );

-- Cleanup: Remove gates from completed events (optional)
UPDATE gates 
SET status = 'archived'
WHERE event_id IN (
  SELECT id FROM events 
  WHERE lifecycle_status = 'completed'
  AND end_date < NOW() - INTERVAL '30 days'
)
AND status = 'active';

-- ========================================================================
-- DEPLOYMENT COMPLETE!
-- ========================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DEPLOYMENT COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Your system is now running:';
  RAISE NOTICE '  • V2.0 Discovery (GPS clustering + quality controls)';
  RAISE NOTICE '  • Autonomous Enforcement (Bayesian learning)';
  RAISE NOTICE '  • Unified views (complete gate information)';
  RAISE NOTICE '  • Automated scheduling (cron jobs)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Key views to use:';
  RAISE NOTICE '  • v_gates_complete - All gate information';
  RAISE NOTICE '  • v_gates_enforcing - Gates with active enforcement';
  RAISE NOTICE '  • v_system_health_dashboard - System status';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Management functions:';
  RAISE NOTICE '  • run_gate_discovery_v2() - Manual discovery';
  RAISE NOTICE '  • run_autonomous_enforcement() - Manual enforcement';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '  1. Run testing checklist (PART 8)';
  RAISE NOTICE '  2. Monitor v_system_health_dashboard';
  RAISE NOTICE '  3. Check cron jobs executing';
  RAISE NOTICE '  4. Review enforcement decisions in autonomous_events';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Happy discovering and enforcing!';
  RAISE NOTICE '';
END $$;
