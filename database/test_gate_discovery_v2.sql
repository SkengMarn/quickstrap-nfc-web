-- ========================================================================
-- 🧪 GATE DISCOVERY SYSTEM V2.0 - TESTING SCRIPT
-- ========================================================================
-- Copy and paste sections into your Supabase SQL Editor
-- Replace 'YOUR-EVENT-ID-HERE' with your actual event ID
-- ========================================================================

-- ========================================================================
-- STEP 1: CHECK SYSTEM INSTALLATION
-- ========================================================================
-- This should return a list of all installed functions
-- If you see errors, the deployment didn't complete successfully

SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%gate%'
  OR routine_name LIKE '%haversine%'
ORDER BY routine_name;

-- Expected: You should see functions like:
-- - haversine_distance
-- - discover_physical_gates_v2
-- - discover_virtual_gates_v2
-- - derive_all_gates_v2
-- - materialize_derived_gates_v2
-- - execute_complete_gate_pipeline_v2
-- - etc.

-- ========================================================================
-- STEP 2: GET YOUR EVENT ID
-- ========================================================================
-- Find your event ID to use in tests

SELECT
  id,
  name,
  start_date,
  end_date,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = events.id) as total_checkins
FROM events
ORDER BY created_at DESC
LIMIT 5;

-- Copy an event ID from the results above and use it below
-- Replace 'YOUR-EVENT-ID-HERE' with the actual UUID

-- ========================================================================
-- STEP 3: DATA QUALITY CHECK
-- ========================================================================
-- This tells you if you have enough data for gate discovery

SELECT * FROM gate_discovery_quality_report('YOUR-EVENT-ID-HERE');

-- Expected output includes:
-- - total_checkins
-- - checkins_with_gps (and percentage)
-- - avg_gps_accuracy_meters
-- - physical_gates_found
-- - virtual_gates_found
-- - recommended_strategy ('physical' or 'virtual')
-- - can_enforce_gates (true/false)
-- - recommendations array

-- ========================================================================
-- STEP 4: TEST GATE DISCOVERY (PREVIEW)
-- ========================================================================
-- This shows what gates WOULD be created without actually creating them

SELECT * FROM test_gate_discovery_v2('YOUR-EVENT-ID-HERE');

-- Expected output:
-- - event_id
-- - quality_report (nested JSON)
-- - v2_gates_preview (array of gates that would be created)
-- - version_comparison (v1 vs v2 comparison)
-- - safe_to_deploy (true/false)

-- ========================================================================
-- STEP 5: PREVIEW PHYSICAL GATES
-- ========================================================================
-- See what physical gates would be discovered

SELECT
  cluster_id,
  gate_name,
  latitude,
  longitude,
  checkin_count,
  dominant_category,
  ROUND(confidence_score::NUMERIC, 3) as confidence,
  ROUND(purity_score::NUMERIC, 3) as purity,
  avg_accuracy as gps_accuracy,
  derivation_method
FROM discover_physical_gates_v2('YOUR-EVENT-ID-HERE')
ORDER BY confidence_score DESC;

-- Expected: List of gates with GPS coordinates and statistics
-- If empty: Either no distinct locations OR not enough quality GPS data

-- ========================================================================
-- STEP 6: PREVIEW VIRTUAL GATES
-- ========================================================================
-- See what virtual gates would be discovered

SELECT
  virtual_gate_id,
  gate_name,
  category,
  checkin_count,
  unique_attendees,
  ROUND(confidence_score::NUMERIC, 3) as confidence,
  ROUND(purity_score::NUMERIC, 3) as purity,
  derivation_method
FROM discover_virtual_gates_v2('YOUR-EVENT-ID-HERE')
ORDER BY confidence_score DESC;

-- Expected: List of category-based gates
-- If empty: Location variance is high enough for physical gates

-- ========================================================================
-- STEP 7: SEE FINAL GATE DECISION
-- ========================================================================
-- This shows which strategy (physical or virtual) will be used

SELECT
  gate_id,
  gate_name,
  gate_type,
  latitude,
  longitude,
  dominant_category,
  checkin_count,
  ROUND(confidence_score::NUMERIC, 3) as confidence,
  should_enforce,
  enforcement_strength,
  metadata->>'gate_selection_reason' as selection_reason
FROM derive_all_gates_v2('YOUR-EVENT-ID-HERE')
ORDER BY confidence_score DESC;

-- Expected: Either physical gates OR virtual gates (not both)
-- Check 'gate_selection_reason' to understand why this strategy was chosen

-- ========================================================================
-- STEP 8: EXECUTE THE FULL PIPELINE 🚀
-- ========================================================================
-- ⚠️ WARNING: This WILL create gates in your database!
-- Only run this when you're ready to go live

SELECT * FROM execute_complete_gate_pipeline_v2('YOUR-EVENT-ID-HERE');

-- Expected output (JSONB):
-- {
--   "success": true,
--   "version": "v2.0_production",
--   "execution_time_ms": <milliseconds>,
--   "gates_created": <number>,
--   "gates_updated": <number>,
--   "checkins_assigned": <number>,
--   "quality_report": {...},
--   "summary": {
--     "total_gates": <number>,
--     "physical_gates": <number>,
--     "virtual_gates": <number>,
--     "total_checkins": <number>,
--     "avg_health_score": <number>
--   },
--   "next_steps": [...]
-- }

-- ========================================================================
-- STEP 9: VIEW CREATED GATES
-- ========================================================================
-- See the gates that were created in the database

SELECT
  gate_name,
  gate_type,
  latitude,
  longitude,
  total_checkins,
  health_score,
  dominant_category,
  checkins_last_hour,
  checkins_last_24h,
  category_bindings,
  derivation_reason
FROM v_gate_overview_v2
WHERE event_id = 'YOUR-EVENT-ID-HERE'
ORDER BY total_checkins DESC;

-- Expected: List of gates with full statistics
-- Should match the preview from step 7

-- ========================================================================
-- STEP 10: CHECK SYSTEM SUMMARY
-- ========================================================================
-- Get overall system health

SELECT * FROM v_gate_discovery_summary_v2
WHERE event_id = 'YOUR-EVENT-ID-HERE';

-- Expected:
-- - total_gates, physical_gates, virtual_gates
-- - total_checkins_via_gates
-- - orphaned_checkins (should be 0 or low)
-- - avg_gate_health
-- - system_status ('healthy', 'needs_orphan_assignment', etc.)

-- ========================================================================
-- STEP 11: CHECK FOR ORPHANED CHECK-INS
-- ========================================================================
-- Find check-ins without assigned gates

SELECT
  COUNT(*) as orphaned_count,
  COUNT(DISTINCT wristband_id) as unique_wristbands
FROM checkin_logs
WHERE event_id = 'YOUR-EVENT-ID-HERE'
  AND gate_id IS NULL
  AND status = 'success';

-- If orphaned_count > 0, run orphan assignment:
-- SELECT * FROM apply_gate_assignments_v2('YOUR-EVENT-ID-HERE');

-- ========================================================================
-- STEP 12: CHECK FOR DUPLICATE GATES
-- ========================================================================
-- See if any gates should be merged

SELECT
  g1.name as gate1,
  g2.name as gate2,
  ROUND(distance_meters::NUMERIC, 1) as distance_m,
  ROUND(confidence_score::NUMERIC, 3) as merge_confidence,
  reasoning,
  status
FROM gate_merge_suggestions gms
JOIN gates g1 ON gms.primary_gate_id = g1.id
JOIN gates g2 ON gms.secondary_gate_id = g2.id
WHERE gms.event_id = 'YOUR-EVENT-ID-HERE'
  AND gms.status = 'pending'
ORDER BY distance_meters;

-- If any duplicates found, review them manually
-- Very close gates (<15m) are likely duplicates

-- ========================================================================
-- STEP 13: COMPARE V1 VS V2 PERFORMANCE
-- ========================================================================
-- See how v2 improves over v1

SELECT * FROM compare_gate_discovery_versions('YOUR-EVENT-ID-HERE');

-- Expected:
-- Shows gates found, avg confidence, and avg checkins for v1 vs v2
-- V2 should have higher confidence scores

-- ========================================================================
-- STEP 14: TEST HAVERSINE DISTANCE
-- ========================================================================
-- Verify meter-perfect distance calculation is working

SELECT
  haversine_distance(40.7128, -74.0060, 40.7614, -73.9776) as nyc_times_square_to_central_park_meters,
  haversine_distance(51.5074, -0.1278, 48.8566, 2.3522) as london_to_paris_meters;

-- Expected:
-- - NYC to Times Square to Central Park: ~6,800 meters
-- - London to Paris: ~344,000 meters

-- ========================================================================
-- STEP 15: TEST GPS VALIDATION
-- ========================================================================
-- Verify GPS quality checks are working

SELECT
  is_valid_gps(40.7128, -74.0060, 10) as good_gps,        -- Should be true
  is_valid_gps(40.7128, -74.0060, 150) as poor_accuracy,  -- Should be false
  is_valid_gps(0, 0, 10) as null_island,                  -- Should be false
  is_valid_gps(NULL, -74.0060, 10) as missing_lat,        -- Should be false
  is_valid_gps(91, -74.0060, 10) as invalid_lat;          -- Should be false

-- Expected: Only good_gps should be true

-- ========================================================================
-- STEP 16: VIEW REAL-TIME PERFORMANCE
-- ========================================================================
-- Check gate performance cache

SELECT
  g.name,
  gpc.total_scans,
  gpc.successful_scans,
  gpc.failed_scans,
  ROUND(gpc.avg_scan_time_ms, 2) as avg_time_ms,
  ROUND(gpc.health_score, 2) as health,
  gpc.peak_hour,
  gpc.last_scan_at
FROM gate_performance_cache gpc
JOIN gates g ON gpc.gate_id = g.id
WHERE gpc.event_id = 'YOUR-EVENT-ID-HERE'
ORDER BY total_scans DESC;

-- Expected: Real-time metrics for each gate

-- ========================================================================
-- STEP 17: CHECK AUTOMATED TRIGGERS
-- ========================================================================
-- Verify triggers are installed

SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%gate%'
ORDER BY trigger_name;

-- Expected triggers:
-- - auto_discover_gates_v2 (on checkin_logs)
-- - update_gate_cache_on_checkin_v2 (on checkin_logs)

-- ========================================================================
-- STEP 18: SIMULATE CHECK-IN AND WATCH AUTO-DISCOVERY
-- ========================================================================
-- (Optional) Insert a test check-in to see triggers in action
-- ⚠️ Only do this in a test environment!

-- Uncomment to test (replace with real IDs):
/*
INSERT INTO checkin_logs (
  event_id,
  wristband_id,
  staff_id,
  app_lat,
  app_lon,
  app_accuracy,
  status,
  timestamp
) VALUES (
  'YOUR-EVENT-ID-HERE',
  'YOUR-WRISTBAND-ID',
  'YOUR-STAFF-ID',
  40.7128,  -- Test latitude
  -74.0060, -- Test longitude
  15,       -- Good accuracy
  'success',
  NOW()
);
*/

-- After 50 checkins, gates should auto-discover!
-- After 100 checkins, gates should refresh!

-- ========================================================================
-- 🎉 TESTING COMPLETE
-- ========================================================================
-- If all steps passed, your Gate Discovery System v2.0 is ready!
--
-- Summary of what you verified:
-- ✅ All functions installed correctly
-- ✅ Data quality is sufficient
-- ✅ Gate discovery logic works
-- ✅ Gates can be created successfully
-- ✅ Orphan assignment works
-- ✅ Distance calculations are accurate
-- ✅ GPS validation works
-- ✅ Triggers are active
-- ✅ Performance tracking works
--
-- 🚀 You're ready for launch!
-- ========================================================================
