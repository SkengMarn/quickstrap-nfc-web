-- ========================================================================
-- 🚀 GATE MATERIALIZATION & PIPELINE v2.0
-- Production-Ready Gate Creation and Assignment System
-- ========================================================================

-- ========================================================================
-- PART 1: ENHANCED GATE MATERIALIZATION
-- ========================================================================

-- 1.1 Materialize V2 Derived Gates into Database
CREATE OR REPLACE FUNCTION materialize_derived_gates_v2(p_event_id UUID)
RETURNS TABLE (
  gate_id UUID,
  gate_name TEXT,
  status TEXT,
  confidence_score NUMERIC,
  message TEXT
) AS $$
DECLARE
  derived_gate RECORD;
  new_gate_id UUID;
  existing_gate_id UUID;
  gates_created INTEGER := 0;
  gates_updated INTEGER := 0;
  gates_skipped INTEGER := 0;
BEGIN
  -- Loop through derived gates
  FOR derived_gate IN
    SELECT * FROM derive_all_gates_v2(p_event_id)
  LOOP
    -- Check if gate already exists
    IF derived_gate.gate_type = 'physical' THEN
      -- Match by location (within 20 meters)
      SELECT g.id INTO existing_gate_id
      FROM gates g
      WHERE g.event_id = p_event_id
        AND g.location_lat IS NOT NULL
        AND g.location_lng IS NOT NULL
        AND haversine_distance(
          g.location_lat, g.location_lng,
          derived_gate.latitude, derived_gate.longitude
        ) <= 20
      ORDER BY haversine_distance(
        g.location_lat, g.location_lng,
        derived_gate.latitude, derived_gate.longitude
      )
      LIMIT 1;
    ELSE
      -- Match virtual gate by name pattern
      SELECT g.id INTO existing_gate_id
      FROM gates g
      WHERE g.event_id = p_event_id
        AND g.location_lat IS NULL
        AND g.location_lng IS NULL
        AND (
          g.name = derived_gate.gate_name OR
          g.name LIKE '%' || derived_gate.dominant_category || '%'
        )
      LIMIT 1;
    END IF;

    IF existing_gate_id IS NOT NULL THEN
      -- Update existing gate with new data
      UPDATE gates
      SET
        name = derived_gate.gate_name,
        location_lat = derived_gate.latitude,
        location_lng = derived_gate.longitude,
        location_description = derived_gate.metadata->>'gate_selection_reason',
        status = CASE
          WHEN derived_gate.confidence_score >= 0.95 THEN 'active'
          WHEN derived_gate.confidence_score >= 0.80 THEN 'active'
          WHEN derived_gate.confidence_score >= 0.70 THEN 'probation'
          ELSE 'probation'
        END,
        metadata = derived_gate.metadata || JSONB_BUILD_OBJECT(
          'last_updated_by', 'auto_discovery_v2',
          'last_update_timestamp', NOW(),
          'confidence_score', derived_gate.confidence_score,
          'purity_score', derived_gate.purity_score,
          'enforcement_strength', derived_gate.enforcement_strength
        ),
        updated_at = NOW()
      WHERE id = existing_gate_id;

      gates_updated := gates_updated + 1;

      -- Update or create performance cache
      INSERT INTO gate_performance_cache (
        gate_id,
        event_id,
        total_scans,
        successful_scans,
        avg_scan_time_ms,
        scans_per_hour,
        uptime_percentage,
        peak_hour,
        last_scan_at,
        last_computed_at
      )
      VALUES (
        existing_gate_id,
        p_event_id,
        derived_gate.checkin_count,
        derived_gate.checkin_count,
        (derived_gate.metadata->>'avg_processing_time_ms')::NUMERIC,
        derived_gate.checkin_count::NUMERIC / GREATEST(
          (derived_gate.metadata->>'temporal_span_hours')::NUMERIC,
          1
        ),
        100.0,
        (derived_gate.metadata->>'peak_hour')::INTEGER,
        (derived_gate.metadata->>'last_seen')::TIMESTAMP WITH TIME ZONE,
        NOW()
      )
      ON CONFLICT (gate_id, event_id)
      DO UPDATE SET
        total_scans = EXCLUDED.total_scans,
        successful_scans = EXCLUDED.successful_scans,
        avg_scan_time_ms = EXCLUDED.avg_scan_time_ms,
        scans_per_hour = EXCLUDED.scans_per_hour,
        last_scan_at = EXCLUDED.last_scan_at,
        last_computed_at = NOW();

      -- Handle category bindings
      IF derived_gate.should_enforce THEN
        INSERT INTO gate_bindings (
          gate_id,
          event_id,
          category,
          status,
          confidence,
          sample_count,
          bound_at
        )
        VALUES (
          existing_gate_id,
          p_event_id,
          derived_gate.dominant_category,
          CASE
            WHEN derived_gate.confidence_score >= 0.90 THEN 'enforced'::gate_binding_status
            WHEN derived_gate.confidence_score >= 0.75 THEN 'probation'::gate_binding_status
            ELSE 'unbound'::gate_binding_status
          END,
          derived_gate.confidence_score,
          derived_gate.checkin_count,
          NOW()
        )
        ON CONFLICT (gate_id, category)
        DO UPDATE SET
          status = CASE
            WHEN derived_gate.confidence_score >= 0.90 THEN 'enforced'::gate_binding_status
            WHEN derived_gate.confidence_score >= 0.75 THEN 'probation'::gate_binding_status
            ELSE gate_bindings.status
          END,
          confidence = GREATEST(gate_bindings.confidence, derived_gate.confidence_score),
          sample_count = gate_bindings.sample_count + derived_gate.checkin_count,
          updated_at = NOW();
      END IF;

      RETURN QUERY SELECT
        existing_gate_id,
        derived_gate.gate_name,
        'updated'::TEXT,
        derived_gate.confidence_score,
        'Gate updated with enhanced v2 data (confidence: ' ||
          ROUND(derived_gate.confidence_score * 100, 1) || '%)'::TEXT;

    ELSE
      -- Create new gate
      INSERT INTO gates (
        event_id,
        name,
        location_lat,
        location_lng,
        location_description,
        status,
        auto_created,
        config,
        metadata
      )
      VALUES (
        p_event_id,
        derived_gate.gate_name,
        derived_gate.latitude,
        derived_gate.longitude,
        derived_gate.metadata->>'gate_selection_reason',
        CASE
          WHEN derived_gate.confidence_score >= 0.80 THEN 'active'
          ELSE 'probation'
        END,
        true,
        JSONB_BUILD_OBJECT(
          'security_mode', CASE
            WHEN derived_gate.enforcement_strength = 'strict' THEN 'enforced'
            WHEN derived_gate.enforcement_strength = 'moderate' THEN 'optional'
            ELSE 'disabled'
          END,
          'enforcement_strength', derived_gate.enforcement_strength,
          'auto_discovery_version', 'v2'
        ),
        derived_gate.metadata || JSONB_BUILD_OBJECT(
          'created_by', 'auto_discovery_v2',
          'creation_timestamp', NOW(),
          'confidence_score', derived_gate.confidence_score,
          'purity_score', derived_gate.purity_score,
          'gate_type', derived_gate.gate_type,
          'derivation_method', derived_gate.derivation_method
        )
      )
      RETURNING id INTO new_gate_id;

      gates_created := gates_created + 1;

      -- Create performance cache for new gate
      INSERT INTO gate_performance_cache (
        gate_id,
        event_id,
        total_scans,
        successful_scans,
        avg_scan_time_ms,
        scans_per_hour,
        uptime_percentage,
        last_scan_at,
        last_computed_at
      )
      VALUES (
        new_gate_id,
        p_event_id,
        derived_gate.checkin_count,
        derived_gate.checkin_count,
        COALESCE((derived_gate.metadata->>'avg_processing_time_ms')::NUMERIC, 0),
        derived_gate.checkin_count::NUMERIC / GREATEST(
          (derived_gate.metadata->>'temporal_span_hours')::NUMERIC,
          1
        ),
        100.0,
        (derived_gate.metadata->>'last_seen')::TIMESTAMP WITH TIME ZONE,
        NOW()
      );

      -- Create category bindings if should enforce
      IF derived_gate.should_enforce THEN
        INSERT INTO gate_bindings (
          gate_id,
          event_id,
          category,
          status,
          confidence,
          sample_count,
          bound_at
        )
        VALUES (
          new_gate_id,
          p_event_id,
          derived_gate.dominant_category,
          CASE
            WHEN derived_gate.confidence_score >= 0.90 THEN 'enforced'::gate_binding_status
            WHEN derived_gate.confidence_score >= 0.75 THEN 'probation'::gate_binding_status
            ELSE 'unbound'::gate_binding_status
          END,
          derived_gate.confidence_score,
          derived_gate.checkin_count,
          NOW()
        );
      END IF;

      -- Assign existing checkins to this new gate
      IF derived_gate.gate_type = 'physical' THEN
        -- Assign by GPS proximity (within 25 meters)
        UPDATE checkin_logs cl
        SET gate_id = new_gate_id
        WHERE cl.event_id = p_event_id
          AND cl.gate_id IS NULL
          AND cl.app_lat IS NOT NULL
          AND cl.app_lon IS NOT NULL
          AND haversine_distance(
            cl.app_lat, cl.app_lon,
            derived_gate.latitude, derived_gate.longitude
          ) <= 25;
      ELSE
        -- Assign virtual gate by category match
        UPDATE checkin_logs cl
        SET gate_id = new_gate_id
        FROM wristbands w
        WHERE cl.wristband_id = w.id
          AND cl.event_id = p_event_id
          AND cl.gate_id IS NULL
          AND COALESCE(w.category, 'General') = derived_gate.dominant_category;
      END IF;

      RETURN QUERY SELECT
        new_gate_id,
        derived_gate.gate_name,
        'created'::TEXT,
        derived_gate.confidence_score,
        ('New ' || derived_gate.gate_type || ' gate created (confidence: ' ||
          ROUND(derived_gate.confidence_score * 100, 1) || '%)')::TEXT;
    END IF;
  END LOOP;

  -- Summary log
  RAISE NOTICE 'Gate materialization complete: % created, % updated', gates_created, gates_updated;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PART 2: ENHANCED ORPHAN ASSIGNMENT
-- ========================================================================

-- 2.1 Intelligent Orphan Check-in Assignment
CREATE OR REPLACE FUNCTION assign_gates_to_orphaned_checkins_v2(p_event_id UUID)
RETURNS TABLE (
  checkin_id UUID,
  assigned_gate_id UUID,
  assignment_method TEXT,
  confidence NUMERIC,
  distance_meters NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH orphaned_checkins AS (
    SELECT
      cl.id as checkin_id,
      cl.app_lat,
      cl.app_lon,
      cl.app_accuracy,
      cl.timestamp,
      COALESCE(w.category, 'General') as category,
      cl.wristband_id
    FROM checkin_logs cl
    LEFT JOIN wristbands w ON cl.wristband_id = w.id
    WHERE cl.event_id = p_event_id
      AND cl.gate_id IS NULL
      AND cl.status = 'success'
  ),
  physical_gate_candidates AS (
    -- Match by GPS proximity with accuracy weighting
    SELECT
      oc.checkin_id,
      g.id as gate_id,
      'gps_proximity_weighted' as method,
      haversine_distance(oc.app_lat, oc.app_lon, g.location_lat, g.location_lng) as distance,
      -- Confidence based on distance and GPS accuracy
      GREATEST(0,
        1.0 - (
          haversine_distance(oc.app_lat, oc.app_lon, g.location_lat, g.location_lng) /
          (COALESCE(oc.app_accuracy, 50) * 3)  -- Within 3x GPS accuracy radius
        )
      ) *
      -- Boost confidence if category matches
      CASE
        WHEN EXISTS (
          SELECT 1 FROM gate_bindings gb
          WHERE gb.gate_id = g.id
            AND gb.category = oc.category
            AND gb.status IN ('enforced', 'probation')
        ) THEN 1.2
        ELSE 1.0
      END as confidence_score
    FROM orphaned_checkins oc
    CROSS JOIN gates g
    WHERE g.event_id = p_event_id
      AND g.location_lat IS NOT NULL
      AND g.location_lng IS NOT NULL
      AND oc.app_lat IS NOT NULL
      AND oc.app_lon IS NOT NULL
      AND is_valid_gps(oc.app_lat, oc.app_lon, oc.app_accuracy)
      -- Within reasonable distance (100m or 5x accuracy, whichever is larger)
      AND haversine_distance(
        oc.app_lat, oc.app_lon,
        g.location_lat, g.location_lng
      ) <= GREATEST(100, COALESCE(oc.app_accuracy, 50) * 5)
  ),
  virtual_gate_candidates AS (
    -- Match by category for virtual gates
    SELECT
      oc.checkin_id,
      g.id as gate_id,
      'category_match_strict' as method,
      0 as distance,  -- No physical distance for virtual gates
      gb.confidence as confidence_score
    FROM orphaned_checkins oc
    CROSS JOIN gates g
    JOIN gate_bindings gb ON g.id = gb.gate_id AND gb.category = oc.category
    WHERE g.event_id = p_event_id
      AND g.location_lat IS NULL  -- Virtual gates only
      AND g.location_lng IS NULL
      AND gb.status IN ('enforced', 'probation')
  ),
  time_based_candidates AS (
    -- Match by similar check-in times (same hour, nearby existing assignments)
    SELECT DISTINCT ON (oc.checkin_id)
      oc.checkin_id,
      cl_similar.gate_id,
      'temporal_pattern_match' as method,
      0 as distance,
      0.70 as confidence_score  -- Lower confidence for time-based matching
    FROM orphaned_checkins oc
    JOIN checkin_logs cl_similar ON
      cl_similar.event_id = p_event_id AND
      cl_similar.gate_id IS NOT NULL AND
      cl_similar.wristband_id != oc.wristband_id AND  -- Different attendee
      DATE_TRUNC('hour', cl_similar.timestamp) = DATE_TRUNC('hour', oc.timestamp) AND
      ABS(EXTRACT(EPOCH FROM (cl_similar.timestamp - oc.timestamp))) < 300  -- Within 5 minutes
    LEFT JOIN wristbands w_similar ON cl_similar.wristband_id = w_similar.id
    WHERE COALESCE(w_similar.category, 'General') = oc.category
    ORDER BY oc.checkin_id, ABS(EXTRACT(EPOCH FROM (cl_similar.timestamp - oc.timestamp)))
  ),
  all_candidates AS (
    -- Combine all assignment strategies
    SELECT * FROM physical_gate_candidates
    WHERE confidence_score >= 0.50
    UNION ALL
    SELECT * FROM virtual_gate_candidates
    WHERE confidence_score >= 0.70
    UNION ALL
    SELECT * FROM time_based_candidates
  ),
  best_assignments AS (
    -- Select best match for each orphan
    SELECT DISTINCT ON (checkin_id)
      checkin_id,
      gate_id,
      method,
      LEAST(confidence_score, 1.0) as confidence,
      distance
    FROM all_candidates
    ORDER BY checkin_id, confidence_score DESC, distance ASC
  )
  SELECT
    ba.checkin_id::UUID,
    ba.gate_id::UUID,
    ba.method,
    ROUND(ba.confidence, 3) as confidence,
    ROUND(ba.distance, 2) as distance_meters
  FROM best_assignments ba
  WHERE ba.confidence >= 0.50;  -- Minimum confidence threshold
END;
$$ LANGUAGE plpgsql;

-- 2.2 Apply Orphan Assignments
CREATE OR REPLACE FUNCTION apply_gate_assignments_v2(p_event_id UUID)
RETURNS TABLE (
  checkins_updated INTEGER,
  gates_affected INTEGER,
  avg_confidence NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_updated_count INTEGER;
  v_gates_count INTEGER;
  v_avg_confidence NUMERIC;
BEGIN
  -- Update checkin_logs with assigned gates
  WITH assignments AS (
    SELECT * FROM assign_gates_to_orphaned_checkins_v2(p_event_id)
  )
  UPDATE checkin_logs cl
  SET
    gate_id = a.assigned_gate_id,
    metadata = COALESCE(cl.metadata, '{}'::JSONB) || JSONB_BUILD_OBJECT(
      'auto_assigned_v2', true,
      'assignment_method', a.assignment_method,
      'assignment_confidence', a.confidence,
      'assignment_distance_meters', a.distance_meters,
      'assigned_at', NOW()
    )
  FROM assignments a
  WHERE cl.id = a.checkin_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Calculate stats
  SELECT
    COUNT(DISTINCT assigned_gate_id),
    AVG(confidence)
  INTO v_gates_count, v_avg_confidence
  FROM assign_gates_to_orphaned_checkins_v2(p_event_id);

  -- Update gate performance caches
  UPDATE gate_performance_cache gpc
  SET
    total_scans = (
      SELECT COUNT(*)
      FROM checkin_logs
      WHERE gate_id = gpc.gate_id AND event_id = gpc.event_id
    ),
    successful_scans = (
      SELECT COUNT(*)
      FROM checkin_logs
      WHERE gate_id = gpc.gate_id AND event_id = gpc.event_id AND status = 'success'
    ),
    last_computed_at = NOW()
  WHERE gpc.event_id = p_event_id;

  RETURN QUERY
  SELECT
    v_updated_count as checkins_updated,
    v_gates_count as gates_affected,
    ROUND(v_avg_confidence, 3) as avg_confidence,
    ('Successfully assigned ' || v_updated_count || ' check-ins to ' ||
     v_gates_count || ' gates (avg confidence: ' ||
     ROUND(v_avg_confidence * 100, 1) || '%)')::TEXT as message;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PART 3: COMPLETE PIPELINE ORCHESTRATION
-- ========================================================================

-- 3.1 Master Pipeline with Comprehensive Logging
CREATE OR REPLACE FUNCTION execute_complete_gate_pipeline_v2(
  p_event_id UUID,
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_quality_report JSONB;
  v_gates_created INTEGER := 0;
  v_gates_updated INTEGER := 0;
  v_checkins_assigned INTEGER := 0;
  v_gates_affected INTEGER := 0;
  v_avg_confidence NUMERIC := 0;
  v_result JSONB;
  v_error_message TEXT;
BEGIN
  v_start_time := CLOCK_TIMESTAMP();

  BEGIN
    -- Step 1: Quality Assessment
    RAISE NOTICE 'Step 1/4: Assessing data quality...';
    v_quality_report := gate_discovery_quality_report(p_event_id);

    -- Check if we have enough data
    IF (v_quality_report->'data_quality'->>'checkins_with_good_gps_pct')::NUMERIC < 20 AND
       (v_quality_report->>'total_checkins')::INTEGER < 50 THEN
      RETURN JSONB_BUILD_OBJECT(
        'success', false,
        'error', 'insufficient_data',
        'message', 'Need at least 50 checkins or 20% with good GPS data',
        'quality_report', v_quality_report
      );
    END IF;

    IF NOT p_dry_run THEN
      -- Step 2: Derive and Materialize Gates
      RAISE NOTICE 'Step 2/4: Deriving and materializing gates...';
      WITH materialization_results AS (
        SELECT * FROM materialize_derived_gates_v2(p_event_id)
      )
      SELECT
        COUNT(*) FILTER (WHERE status = 'created'),
        COUNT(*) FILTER (WHERE status = 'updated')
      INTO v_gates_created, v_gates_updated
      FROM materialization_results;

      -- Step 3: Assign Orphaned Check-ins
      RAISE NOTICE 'Step 3/4: Assigning orphaned check-ins...';
      SELECT
        checkins_updated,
        gates_affected,
        avg_confidence
      INTO v_checkins_assigned, v_gates_affected, v_avg_confidence
      FROM apply_gate_assignments_v2(p_event_id);

      -- Step 4: Check for Merge Suggestions
      RAISE NOTICE 'Step 4/4: Analyzing gate merge opportunities...';
      INSERT INTO gate_merge_suggestions (
        event_id,
        primary_gate_id,
        secondary_gate_id,
        confidence_score,
        reasoning,
        distance_meters,
        status
      )
      SELECT
        p_event_id,
        g1.id,
        g2.id,
        CASE
          WHEN distance_meters < 10 THEN 0.98
          WHEN distance_meters < 15 THEN 0.92
          WHEN distance_meters < 20 THEN 0.85
          ELSE 0.75
        END as confidence_score,
        'Gates detected within ' || ROUND(distance_meters, 1) ||
        ' meters with similar categories - consider merging' as reasoning,
        distance_meters,
        'pending' as status
      FROM (
        SELECT
          g1.id as g1_id,
          g2.id as g2_id,
          haversine_distance(
            g1.location_lat, g1.location_lng,
            g2.location_lat, g2.location_lng
          ) as distance_meters,
          g1.name as g1_name,
          g2.name as g2_name
        FROM gates g1
        CROSS JOIN gates g2
        WHERE g1.event_id = p_event_id
          AND g2.event_id = p_event_id
          AND g1.id < g2.id
          AND g1.location_lat IS NOT NULL
          AND g2.location_lat IS NOT NULL
      ) distances
      JOIN gates g1 ON distances.g1_id = g1.id
      JOIN gates g2 ON distances.g2_id = g2.id
      WHERE distance_meters < 25
      ON CONFLICT (event_id, primary_gate_id, secondary_gate_id)
      DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        reasoning = EXCLUDED.reasoning,
        distance_meters = EXCLUDED.distance_meters;
    END IF;

    -- Build success result
    v_result := JSONB_BUILD_OBJECT(
      'success', true,
      'dry_run', p_dry_run,
      'execution_time_ms', EXTRACT(MILLISECONDS FROM (CLOCK_TIMESTAMP() - v_start_time)),
      'quality_report', v_quality_report,
      'gates_created', v_gates_created,
      'gates_updated', v_gates_updated,
      'checkins_assigned', v_checkins_assigned,
      'gates_affected', v_gates_affected,
      'avg_assignment_confidence', ROUND(v_avg_confidence, 3),
      'summary', (
        SELECT JSONB_BUILD_OBJECT(
          'total_gates', COUNT(*),
          'active_gates', COUNT(*) FILTER (WHERE status = 'active'),
          'physical_gates', COUNT(*) FILTER (WHERE location_lat IS NOT NULL),
          'virtual_gates', COUNT(*) FILTER (WHERE location_lat IS NULL),
          'total_checkins', (
            SELECT COUNT(*)
            FROM checkin_logs
            WHERE event_id = p_event_id AND gate_id IS NOT NULL
          ),
          'orphaned_checkins', (
            SELECT COUNT(*)
            FROM checkin_logs
            WHERE event_id = p_event_id AND gate_id IS NULL AND status = 'success'
          ),
          'avg_checkins_per_gate', (
            SELECT ROUND(AVG(total_scans), 0)
            FROM gate_performance_cache
            WHERE event_id = p_event_id
          )
        )
        FROM gates
        WHERE event_id = p_event_id
      ),
      'recommendations', (
        SELECT JSONB_AGG(rec)
        FROM (
          SELECT
            CASE
              WHEN EXISTS(
                SELECT 1 FROM checkin_logs
                WHERE event_id = p_event_id AND gate_id IS NULL AND status = 'success'
                LIMIT 100
              ) THEN 'Consider running apply_gate_assignments_v2() again for remaining orphans'
              WHEN EXISTS(
                SELECT 1 FROM gate_merge_suggestions
                WHERE event_id = p_event_id AND status = 'pending'
              ) THEN 'Review pending gate merge suggestions to optimize gate structure'
              WHEN (v_quality_report->'data_quality'->>'gps_quality_score')::TEXT = 'poor'
                THEN 'GPS data quality is poor - monitor and consider manual gate creation'
              WHEN v_gates_created + v_gates_updated = 0
                THEN 'No gates were created - check if event has sufficient check-in data'
              ELSE 'Gate discovery completed successfully - monitor performance'
            END as rec
        ) recommendations
      ),
      'timestamp', NOW()
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
      RETURN JSONB_BUILD_OBJECT(
        'success', false,
        'error', 'pipeline_execution_failed',
        'message', v_error_message,
        'timestamp', NOW()
      );
  END;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- DEPLOYMENT VERIFICATION
-- ========================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Gate Materialization & Pipeline v2.0 deployed!';
  RAISE NOTICE '📊 Available functions:';
  RAISE NOTICE '  - materialize_derived_gates_v2(event_id)';
  RAISE NOTICE '  - assign_gates_to_orphaned_checkins_v2(event_id)';
  RAISE NOTICE '  - apply_gate_assignments_v2(event_id)';
  RAISE NOTICE '  - execute_complete_gate_pipeline_v2(event_id, dry_run)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready for production!';
END $$;
