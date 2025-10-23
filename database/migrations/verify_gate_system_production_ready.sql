-- PRODUCTION VERIFICATION & TESTING SCRIPT
-- Run this in Supabase SQL Editor to verify gate discovery system is ready for launch

-- 🔍 QUICK STATUS CHECK - Run this first to see what's implemented
SELECT 
  'TABLES' as check_type,
  string_agg(table_name, ', ') as found_items
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('gates', 'gate_bindings', 'gate_performance_cache', 'gate_merge_suggestions', 'adaptive_thresholds')

UNION ALL

SELECT 
  'FUNCTIONS' as check_type,
  string_agg(routine_name, ', ') as found_items
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('discover_physical_gates', 'derive_all_gates', 'materialize_derived_gates', 'execute_complete_gate_pipeline')

UNION ALL

SELECT 
  'VIEWS' as check_type,
  string_agg(table_name, ', ') as found_items
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'v_gate%';

-- 1. VERIFY ALL TABLES EXIST
DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  table_name TEXT;
BEGIN
  -- Check required tables
  FOR table_name IN 
    SELECT unnest(ARRAY['gates', 'gate_bindings', 'gate_performance_cache', 
                        'gate_merge_suggestions', 'adaptive_thresholds', 
                        'gate_wifi', 'beacons', 'gate_geofences', 'autonomous_gates'])
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All required tables exist';
  END IF;
END $$;

-- 2. VERIFY ALL FUNCTIONS EXIST
DO $$
DECLARE
  missing_functions TEXT[] := ARRAY[]::TEXT[];
  func_name TEXT;
BEGIN
  FOR func_name IN 
    SELECT unnest(ARRAY['discover_physical_gates', 'discover_virtual_gates', 
                        'derive_all_gates', 'materialize_derived_gates',
                        'assign_gates_to_orphaned_checkins', 'apply_gate_assignments',
                        'execute_complete_gate_pipeline'])
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = func_name) THEN
      missing_functions := array_append(missing_functions, func_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE EXCEPTION 'Missing functions: %', array_to_string(missing_functions, ', ');
  ELSE
    RAISE NOTICE '✅ All required functions exist';
  END IF;
END $$;

-- 3. TEST WITH SAMPLE EVENT (if events exist)
DO $$
DECLARE
  test_event_id UUID;
  result JSONB;
BEGIN
  -- Get first event for testing
  SELECT id INTO test_event_id FROM events LIMIT 1;
  
  IF test_event_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing with event: %', test_event_id;
    
    -- Test gate discovery
    SELECT execute_complete_gate_pipeline(test_event_id) INTO result;
    RAISE NOTICE '✅ Gate pipeline test result: %', result;
  ELSE
    RAISE NOTICE '⚠️ No events found for testing';
  END IF;
END $$;

-- 4. PERFORMANCE CHECK
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM v_gate_complete_overview LIMIT 10;

-- 5. VERIFY INDEXES
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('gates', 'gate_bindings', 'checkin_logs', 'gate_performance_cache')
ORDER BY tablename, indexname;
