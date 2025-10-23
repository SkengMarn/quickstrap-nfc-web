-- GATE DISCOVERY v2.0 TESTING WITH REAL EVENT
-- Event ID: ba2e26f7-0713-4448-9cac-cd1eb76a320e

-- 🔍 STEP 1: QUALITY ASSESSMENT
-- Run this first to see what data we have
SELECT 
  'EVENT OVERVIEW' as test_section,
  e.name as event_name,
  e.start_date,
  e.end_date,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id) as total_checkins,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND status = 'success') as successful_checkins,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND app_lat IS NOT NULL) as checkins_with_gps,
  (SELECT COUNT(*) FROM wristbands WHERE event_id = e.id) as total_wristbands,
  (SELECT COUNT(DISTINCT category) FROM wristbands WHERE event_id = e.id) as categories_count
FROM events e 
WHERE e.id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e';

-- 🧪 STEP 2: COMPREHENSIVE QUALITY REPORT
-- This analyzes GPS data quality and gate discovery potential
SELECT gate_discovery_quality_report('ba2e26f7-0713-4448-9cac-cd1eb76a320e') as quality_report;

-- 🔬 STEP 3: TEST GATE DISCOVERY (Safe Preview)
-- This shows what gates would be discovered without creating them
SELECT test_gate_discovery_v2('ba2e26f7-0713-4448-9cac-cd1eb76a320e') as discovery_test;

-- 📊 STEP 4: PREVIEW PHYSICAL GATES
-- See what physical gates would be discovered
SELECT 
  cluster_id,
  gate_name,
  latitude,
  longitude,
  checkin_count,
  dominant_category,
  confidence_score,
  purity_score,
  derivation_method
FROM discover_physical_gates_v2('ba2e26f7-0713-4448-9cac-cd1eb76a320e')
ORDER BY confidence_score DESC;

-- 📊 STEP 5: PREVIEW VIRTUAL GATES  
-- See what virtual gates would be discovered
SELECT 
  virtual_gate_id,
  gate_name,
  category,
  checkin_count,
  unique_attendees,
  confidence_score,
  purity_score,
  derivation_method
FROM discover_virtual_gates_v2('ba2e26f7-0713-4448-9cac-cd1eb76a320e')
ORDER BY confidence_score DESC;

-- 🎯 STEP 6: FINAL GATE SELECTION
-- See which gates the system would actually choose
SELECT 
  gate_id,
  gate_name,
  gate_type,
  latitude,
  longitude,
  dominant_category,
  checkin_count,
  confidence_score,
  should_enforce,
  enforcement_strength,
  derivation_method
FROM derive_all_gates_v2('ba2e26f7-0713-4448-9cac-cd1eb76a320e')
ORDER BY confidence_score DESC;

-- 🚀 STEP 7: EXECUTE FULL PIPELINE (CREATES ACTUAL GATES)
-- Only run this when you're ready to create the gates!
-- SELECT execute_complete_gate_pipeline_v2('ba2e26f7-0713-4448-9cac-cd1eb76a320e') as pipeline_result;

-- 👁️ STEP 8: VIEW CREATED GATES (After running pipeline)
-- SELECT * FROM v_gate_overview_v2 WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e';

-- 📈 STEP 9: CHECK SYSTEM STATUS
-- SELECT * FROM v_gate_discovery_summary_v2 WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e';
