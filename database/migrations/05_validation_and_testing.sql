-- ========================================================================
-- 🧪 VALIDATION & TESTING SUITE
-- Production-Ready Testing and Validation Tools
-- ========================================================================

-- ========================================================================
-- PART 1: PRE-DEPLOYMENT VALIDATION
-- ========================================================================

-- 1.1 Comprehensive System Health Check
CREATE OR REPLACE FUNCTION validate_gate_system_health()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_issues JSONB := '[]'::JSONB;
  v_warnings JSONB := '[]'::JSONB;
BEGIN
  -- Check 1: Required functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'haversine_distance'
  ) THEN
    v_issues := v_issues || JSONB_BUILD_OBJECT(
      'type', 'missing_function',
      'severity', 'critical',
      'message', 'haversine_distance function not found'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'discover_physical_gates_v2'
  ) THEN
    v_issues := v_issues || JSONB_BUILD_OBJECT(
      'type', 'missing_function',
      'severity', 'critical',
      'message', 'discover_physical_gates_v2 function not found'
    );
  END IF;

  -- Check 2: Required tables exist with correct columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gates' AND column_name = 'location_lat'
  ) THEN
    v_issues := v_issues || JSONB_BUILD_OBJECT(
      'type', 'schema_issue',
      'severity', 'critical',
      'message', 'gates table missing location_lat column'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checkin_logs' AND column_name = 'app_lat'
  ) THEN
    v_issues := v_issues || JSONB_BUILD_OBJECT(
      'type', 'schema_issue',
      'severity', 'critical',
      'message', 'checkin_logs table missing GPS columns'
    );
  END IF;

  -- Check 3: Indexes exist for performance
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'checkin_logs' AND indexname LIKE '%lat%'
  ) THEN
    v_warnings := v_warnings || JSONB_BUILD_OBJECT(
      'type', 'missing_index',
      'severity', 'warning',
      'message', 'GPS indexes missing on checkin_logs - performance may be slow'
    );
  END IF;

  -- Check 4: Required enum types exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'gate_binding_status'
  ) THEN
    v_issues := v_issues || JSONB_BUILD_OBJECT(
      'type', 'missing_type',
      'severity', 'critical',
      'message', 'gate_binding_status enum type not found'
    );
  END IF;

  -- Check 5: Test haversine function
  BEGIN
    PERFORM haversine_distance(37.7749, -122.4194, 37.7849, -122.4094);
  EXCEPTION WHEN OTHERS THEN
    v_issues := v_issues || JSONB_BUILD_OBJECT(
      'type', 'function_error',
      'severity', 'critical',
      'message', 'haversine_distance function failed test execution'
    );
  END;

  -- Build result
  v_result := JSONB_BUILD_OBJECT(
    'healthy', JSONB_ARRAY_LENGTH(v_issues) = 0,
    'issues', v_issues,
    'warnings', v_warnings,
    'checks_passed', 5 - JSONB_ARRAY_LENGTH(v_issues),
    'total_checks', 5,
    'timestamp', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 1.2 Event-Specific Readiness Check
CREATE OR REPLACE FUNCTION validate_event_readiness(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_checkins INTEGER;
  v_checkins_with_gps INTEGER;
  v_categories INTEGER;
  v_readiness_score NUMERIC;
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_ready BOOLEAN;
BEGIN
  -- Get event statistics
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_valid_gps(app_lat, app_lon, app_accuracy)),
    COUNT(DISTINCT w.category)
  INTO v_total_checkins, v_checkins_with_gps, v_categories
  FROM checkin_logs cl
  LEFT JOIN wristbands w ON cl.wristband_id = w.id
  WHERE cl.event_id = p_event_id AND cl.status = 'success';

  -- Check readiness criteria
  IF v_total_checkins < 10 THEN
    v_issues := array_append(v_issues, 'Insufficient check-ins (need at least 10, have ' || v_total_checkins || ')');
  END IF;

  IF v_checkins_with_gps < 5 THEN
    v_issues := array_append(v_issues, 'Insufficient GPS data (need at least 5 with valid GPS, have ' || v_checkins_with_gps || ')');
  END IF;

  IF v_categories = 0 THEN
    v_issues := array_append(v_issues, 'No wristband categories found');
  END IF;

  -- Calculate readiness score
  v_readiness_score := LEAST(
    (v_total_checkins::NUMERIC / 50) * 40 +  -- 40% weight on volume
    (v_checkins_with_gps::NUMERIC / v_total_checkins) * 40 +  -- 40% weight on GPS quality
    (LEAST(v_categories, 3)::NUMERIC / 3) * 20,  -- 20% weight on categories
    100
  );

  v_ready := array_length(v_issues, 1) IS NULL AND v_readiness_score >= 60;

  v_result := JSONB_BUILD_OBJECT(
    'event_id', p_event_id,
    'ready', v_ready,
    'readiness_score', ROUND(v_readiness_score, 1),
    'statistics', JSONB_BUILD_OBJECT(
      'total_checkins', v_total_checkins,
      'checkins_with_valid_gps', v_checkins_with_gps,
      'gps_data_percentage', ROUND((v_checkins_with_gps::NUMERIC / NULLIF(v_total_checkins, 0)) * 100, 1),
      'unique_categories', v_categories
    ),
    'issues', v_issues,
    'recommendations', CASE
      WHEN NOT v_ready THEN ARRAY[
        'Wait for more check-in data before running gate discovery',
        'Ensure GPS permissions are enabled in the scanning app',
        'Verify wristbands are assigned to categories'
      ]
      ELSE ARRAY['Event is ready for gate discovery']
    END,
    'timestamp', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PART 2: COMPARISON AND REGRESSION TESTING
-- ========================================================================

-- 2.1 Compare V1 vs V2 Results Side-by-Side
CREATE OR REPLACE FUNCTION compare_discovery_results(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v1_results JSONB;
  v2_results JSONB;
  v_comparison JSONB;
BEGIN
  -- Get V1 results
  v1_results := (
    SELECT JSONB_BUILD_OBJECT(
      'gates_found', COUNT(*),
      'avg_confidence', ROUND(AVG(confidence_score), 3),
      'total_checkins', SUM(checkin_count),
      'avg_checkins_per_gate', ROUND(AVG(checkin_count), 1),
      'method', 'gps_clustering'
    )
    FROM discover_physical_gates(p_event_id)
  );

  -- Get V2 results
  v2_results := (
    SELECT JSONB_BUILD_OBJECT(
      'gates_found', COUNT(*),
      'avg_confidence', ROUND(AVG(confidence_score), 3),
      'total_checkins', SUM(checkin_count),
      'avg_checkins_per_gate', ROUND(AVG(checkin_count), 1),
      'avg_purity', ROUND(AVG(purity_score), 3),
      'method', 'gps_dbscan_clustering'
    )
    FROM discover_physical_gates_v2(p_event_id)
  );

  -- Build comparison
  v_comparison := JSONB_BUILD_OBJECT(
    'event_id', p_event_id,
    'v1_original', v1_results,
    'v2_enhanced', v2_results,
    'improvements', JSONB_BUILD_OBJECT(
      'confidence_increase', ROUND(
        (v2_results->>'avg_confidence')::NUMERIC - (v1_results->>'avg_confidence')::NUMERIC,
        3
      ),
      'gates_difference',
        (v2_results->>'gates_found')::INTEGER - (v1_results->>'gates_found')::INTEGER,
      'purity_score_added', v2_results->>'avg_purity',
      'better_version', CASE
        WHEN (v2_results->>'avg_confidence')::NUMERIC > (v1_results->>'avg_confidence')::NUMERIC
          THEN 'v2'
        ELSE 'v1'
      END
    ),
    'recommendation', CASE
      WHEN (v2_results->>'gates_found')::INTEGER = 0 THEN
        'Both versions failed to find gates - check data quality'
      WHEN (v2_results->>'avg_confidence')::NUMERIC > (v1_results->>'avg_confidence')::NUMERIC THEN
        'V2 shows improved confidence - recommended for production'
      WHEN (v2_results->>'gates_found')::INTEGER > (v1_results->>'gates_found')::INTEGER THEN
        'V2 found more gates - validate quality before using'
      ELSE
        'V1 and V2 results similar - V2 provides additional metrics'
    END,
    'timestamp', NOW()
  );

  RETURN v_comparison;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Test Gate Assignment Accuracy
CREATE OR REPLACE FUNCTION test_gate_assignment_accuracy(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_total_assignments INTEGER;
  v_high_confidence INTEGER;
  v_medium_confidence INTEGER;
  v_low_confidence INTEGER;
  v_avg_distance NUMERIC;
BEGIN
  -- Analyze assignment quality
  WITH assignments AS (
    SELECT * FROM assign_gates_to_orphaned_checkins_v2(p_event_id)
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE confidence >= 0.85),
    COUNT(*) FILTER (WHERE confidence >= 0.65 AND confidence < 0.85),
    COUNT(*) FILTER (WHERE confidence < 0.65),
    AVG(distance_meters)
  INTO
    v_total_assignments,
    v_high_confidence,
    v_medium_confidence,
    v_low_confidence,
    v_avg_distance
  FROM assignments;

  v_result := JSONB_BUILD_OBJECT(
    'event_id', p_event_id,
    'total_orphans_assignable', v_total_assignments,
    'assignment_quality', JSONB_BUILD_OBJECT(
      'high_confidence_count', v_high_confidence,
      'high_confidence_pct', ROUND((v_high_confidence::NUMERIC / NULLIF(v_total_assignments, 0)) * 100, 1),
      'medium_confidence_count', v_medium_confidence,
      'medium_confidence_pct', ROUND((v_medium_confidence::NUMERIC / NULLIF(v_total_assignments, 0)) * 100, 1),
      'low_confidence_count', v_low_confidence,
      'low_confidence_pct', ROUND((v_low_confidence::NUMERIC / NULLIF(v_total_assignments, 0)) * 100, 1)
    ),
    'spatial_accuracy', JSONB_BUILD_OBJECT(
      'avg_distance_meters', ROUND(v_avg_distance, 2),
      'distance_quality', CASE
        WHEN v_avg_distance IS NULL THEN 'no_gps_data'
        WHEN v_avg_distance <= 15 THEN 'excellent'
        WHEN v_avg_distance <= 30 THEN 'good'
        WHEN v_avg_distance <= 50 THEN 'acceptable'
        ELSE 'poor'
      END
    ),
    'recommendation', CASE
      WHEN v_total_assignments = 0 THEN 'No orphaned check-ins to assign'
      WHEN v_high_confidence::NUMERIC / NULLIF(v_total_assignments, 0) >= 0.7 THEN
        'Assignment quality is good - safe to apply'
      WHEN v_high_confidence::NUMERIC / NULLIF(v_total_assignments, 0) >= 0.5 THEN
        'Assignment quality is acceptable - monitor results'
      ELSE
        'Assignment quality is low - review gate configuration'
    END,
    'timestamp', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PART 3: PERFORMANCE TESTING
-- ========================================================================

-- 3.1 Performance Benchmark
CREATE OR REPLACE FUNCTION benchmark_gate_discovery(p_event_id UUID, p_iterations INTEGER DEFAULT 3)
RETURNS JSONB AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_durations NUMERIC[] := ARRAY[]::NUMERIC[];
  v_avg_duration NUMERIC;
  v_min_duration NUMERIC;
  v_max_duration NUMERIC;
  i INTEGER;
BEGIN
  -- Run multiple iterations
  FOR i IN 1..p_iterations LOOP
    v_start_time := CLOCK_TIMESTAMP();

    -- Execute gate discovery
    PERFORM * FROM derive_all_gates_v2(p_event_id);

    v_end_time := CLOCK_TIMESTAMP();
    v_durations := array_append(v_durations, EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time)));
  END LOOP;

  -- Calculate statistics
  SELECT AVG(d), MIN(d), MAX(d)
  INTO v_avg_duration, v_min_duration, v_max_duration
  FROM UNNEST(v_durations) d;

  RETURN JSONB_BUILD_OBJECT(
    'event_id', p_event_id,
    'iterations', p_iterations,
    'avg_duration_ms', ROUND(v_avg_duration, 2),
    'min_duration_ms', ROUND(v_min_duration, 2),
    'max_duration_ms', ROUND(v_max_duration, 2),
    'performance_rating', CASE
      WHEN v_avg_duration < 500 THEN 'excellent'
      WHEN v_avg_duration < 2000 THEN 'good'
      WHEN v_avg_duration < 5000 THEN 'acceptable'
      ELSE 'needs_optimization'
    END,
    'all_durations_ms', v_durations,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PART 4: DATA QUALITY REPORTS
-- ========================================================================

-- 4.1 Detailed GPS Data Quality Report
CREATE OR REPLACE FUNCTION analyze_gps_data_quality(p_event_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    WITH gps_stats AS (
      SELECT
        COUNT(*) as total_checkins,
        COUNT(*) FILTER (WHERE app_lat IS NOT NULL AND app_lon IS NOT NULL) as with_gps,
        COUNT(*) FILTER (WHERE is_valid_gps(app_lat, app_lon, app_accuracy)) as with_valid_gps,
        AVG(app_accuracy) as avg_accuracy,
        STDDEV(app_accuracy) as stddev_accuracy,
        MIN(app_accuracy) as min_accuracy,
        MAX(app_accuracy) as max_accuracy,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY app_accuracy) as median_accuracy,
        COUNT(*) FILTER (WHERE app_accuracy <= 10) as excellent_gps,
        COUNT(*) FILTER (WHERE app_accuracy > 10 AND app_accuracy <= 20) as good_gps,
        COUNT(*) FILTER (WHERE app_accuracy > 20 AND app_accuracy <= 50) as fair_gps,
        COUNT(*) FILTER (WHERE app_accuracy > 50) as poor_gps,
        STDDEV(app_lat) as lat_variance,
        STDDEV(app_lon) as lon_variance,
        COUNT(DISTINCT ROUND(CAST(app_lat AS NUMERIC), 4) || ',' || ROUND(CAST(app_lon AS NUMERIC), 4)) as unique_locations
      FROM checkin_logs
      WHERE event_id = p_event_id
        AND status = 'success'
    )
    SELECT JSONB_BUILD_OBJECT(
      'event_id', p_event_id,
      'summary', JSONB_BUILD_OBJECT(
        'total_checkins', total_checkins,
        'with_gps_data', with_gps,
        'with_valid_gps', with_valid_gps,
        'gps_availability_pct', ROUND((with_gps::NUMERIC / NULLIF(total_checkins, 0)) * 100, 1),
        'gps_quality_pct', ROUND((with_valid_gps::NUMERIC / NULLIF(total_checkins, 0)) * 100, 1)
      ),
      'accuracy_distribution', JSONB_BUILD_OBJECT(
        'avg_accuracy_meters', ROUND(avg_accuracy, 2),
        'median_accuracy_meters', ROUND(median_accuracy, 2),
        'stddev_accuracy', ROUND(stddev_accuracy, 2),
        'min_accuracy', ROUND(min_accuracy, 2),
        'max_accuracy', ROUND(max_accuracy, 2),
        'excellent_count', excellent_gps,
        'excellent_pct', ROUND((excellent_gps::NUMERIC / NULLIF(total_checkins, 0)) * 100, 1),
        'good_count', good_gps,
        'good_pct', ROUND((good_gps::NUMERIC / NULLIF(total_checkins, 0)) * 100, 1),
        'fair_count', fair_gps,
        'fair_pct', ROUND((fair_gps::NUMERIC / NULLIF(total_checkins, 0)) * 100, 1),
        'poor_count', poor_gps,
        'poor_pct', ROUND((poor_gps::NUMERIC / NULLIF(total_checkins, 0)) * 100, 1)
      ),
      'spatial_distribution', JSONB_BUILD_OBJECT(
        'lat_variance', ROUND(lat_variance, 6),
        'lon_variance', ROUND(lon_variance, 6),
        'unique_locations', unique_locations,
        'clustering_potential', CASE
          WHEN lat_variance < 0.0001 AND lon_variance < 0.0001 THEN 'low_use_virtual_gates'
          WHEN lat_variance < 0.001 AND lon_variance < 0.001 THEN 'medium_single_venue'
          ELSE 'high_multi_location'
        END
      ),
      'recommendations', (
        SELECT JSONB_AGG(rec)
        FROM (
          SELECT
            CASE
              WHEN (with_gps::NUMERIC / NULLIF(total_checkins, 0)) < 0.3 THEN
                'GPS data availability is low - ensure location permissions are granted'
              WHEN avg_accuracy > 50 THEN
                'GPS accuracy is poor - consider using virtual gates'
              WHEN unique_locations < 2 THEN
                'All check-ins at same location - virtual gates recommended'
              WHEN unique_locations >= 3 AND lat_variance > 0.0001 THEN
                'Multiple distinct locations detected - physical gates recommended'
              ELSE
                'GPS data quality is sufficient for gate discovery'
            END as rec
          FROM gps_stats
        ) recs
      ),
      'timestamp', NOW()
    )
    FROM gps_stats
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PART 5: ROLLBACK AND SAFETY
-- ========================================================================

-- 5.1 Backup Current Gates Before Migration
CREATE OR REPLACE FUNCTION backup_gates(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_backup_id UUID;
  v_gate_count INTEGER;
BEGIN
  v_backup_id := gen_random_uuid();

  -- Create backup table if not exists
  CREATE TABLE IF NOT EXISTS gates_backup (
    backup_id UUID,
    backup_timestamp TIMESTAMP WITH TIME ZONE,
    gate_data JSONB
  );

  -- Backup gates
  INSERT INTO gates_backup (backup_id, backup_timestamp, gate_data)
  SELECT
    v_backup_id,
    NOW(),
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', g.id,
        'event_id', g.event_id,
        'name', g.name,
        'location_lat', g.location_lat,
        'location_lng', g.location_lng,
        'location_description', g.location_description,
        'status', g.status,
        'config', g.config,
        'metadata', g.metadata,
        'created_at', g.created_at,
        'bindings', (
          SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
              'category', gb.category,
              'status', gb.status,
              'confidence', gb.confidence
            )
          )
          FROM gate_bindings gb
          WHERE gb.gate_id = g.id
        )
      )
    )
  FROM gates g
  WHERE g.event_id = p_event_id;

  SELECT COUNT(*) INTO v_gate_count
  FROM gates
  WHERE event_id = p_event_id;

  RETURN JSONB_BUILD_OBJECT(
    'success', true,
    'backup_id', v_backup_id,
    'gates_backed_up', v_gate_count,
    'timestamp', NOW(),
    'restore_command', 'SELECT restore_gates(''' || v_backup_id || '''::UUID);'
  );
END;
$$ LANGUAGE plpgsql;

-- 5.2 Restore Gates from Backup
CREATE OR REPLACE FUNCTION restore_gates(p_backup_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_backup_data JSONB;
  v_gate JSONB;
  v_restored_count INTEGER := 0;
BEGIN
  -- Get backup data
  SELECT gate_data INTO v_backup_data
  FROM gates_backup
  WHERE backup_id = p_backup_id;

  IF v_backup_data IS NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', false,
      'error', 'backup_not_found',
      'message', 'No backup found with ID: ' || p_backup_id
    );
  END IF;

  -- Restore each gate
  FOR v_gate IN SELECT * FROM JSONB_ARRAY_ELEMENTS(v_backup_data)
  LOOP
    -- Note: This is a simple restore that overwrites
    -- In production, you might want more sophisticated merge logic
    INSERT INTO gates (
      id, event_id, name, location_lat, location_lng,
      location_description, status, config, metadata, created_at
    )
    VALUES (
      (v_gate->>'id')::UUID,
      (v_gate->>'event_id')::UUID,
      v_gate->>'name',
      (v_gate->>'location_lat')::DECIMAL,
      (v_gate->>'location_lng')::DECIMAL,
      v_gate->>'location_description',
      v_gate->>'status',
      v_gate->'config',
      v_gate->'metadata',
      (v_gate->>'created_at')::TIMESTAMP WITH TIME ZONE
    )
    ON CONFLICT (id) DO UPDATE
    SET
      name = EXCLUDED.name,
      location_lat = EXCLUDED.location_lat,
      location_lng = EXCLUDED.location_lng,
      status = EXCLUDED.status;

    v_restored_count := v_restored_count + 1;
  END LOOP;

  RETURN JSONB_BUILD_OBJECT(
    'success', true,
    'backup_id', p_backup_id,
    'gates_restored', v_restored_count,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- DEPLOYMENT VERIFICATION
-- ========================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Validation & Testing Suite deployed!';
  RAISE NOTICE '🧪 Available test functions:';
  RAISE NOTICE '  - validate_gate_system_health()';
  RAISE NOTICE '  - validate_event_readiness(event_id)';
  RAISE NOTICE '  - compare_discovery_results(event_id)';
  RAISE NOTICE '  - test_gate_assignment_accuracy(event_id)';
  RAISE NOTICE '  - benchmark_gate_discovery(event_id, iterations)';
  RAISE NOTICE '  - analyze_gps_data_quality(event_id)';
  RAISE NOTICE '  - backup_gates(event_id)';
  RAISE NOTICE '  - restore_gates(backup_id)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ System ready for validation!';
END $$;
