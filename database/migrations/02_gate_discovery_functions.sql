-- Gate Discovery Functions - Core Logic
-- Run this after 01_gate_discovery_tables.sql

-- Function 1: Discover Physical Gates from GPS Clusters
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
  RETURN QUERY
  WITH gps_clusters AS (
    -- Round GPS to 4 decimal places (~11 meter precision)
    SELECT 
      ROUND(CAST(app_lat AS NUMERIC), 4) as lat_cluster,
      ROUND(CAST(app_lon AS NUMERIC), 4) as lon_cluster,
      CONCAT(
        ROUND(CAST(app_lat AS NUMERIC), 4), 
        ',', 
        ROUND(CAST(app_lon AS NUMERIC), 4)
      ) as cluster_key,
      COUNT(*) as checkin_count,
      AVG(app_lat) as avg_lat,
      AVG(app_lon) as avg_lon,
      AVG(COALESCE(app_accuracy, 50)) as avg_accuracy,
      MIN(timestamp) as first_seen,
      MAX(timestamp) as last_seen,
      -- Category analysis
      MODE() WITHIN GROUP (ORDER BY COALESCE(w.category, 'General')) as dominant_category,
      -- Calculate confidence based on sample size and consistency
      CASE 
        WHEN COUNT(*) >= 100 THEN 0.95
        WHEN COUNT(*) >= 50 THEN 0.85
        WHEN COUNT(*) >= 20 THEN 0.75
        WHEN COUNT(*) >= 10 THEN 0.65
        ELSE 0.50
      END as confidence_score,
      -- Collect metadata
      JSONB_BUILD_OBJECT(
        'unique_wristbands', COUNT(DISTINCT cl.wristband_id),
        'unique_staff', COUNT(DISTINCT cl.staff_id),
        'avg_processing_time_ms', AVG(COALESCE(cl.processing_time_ms, 0)),
        'success_rate', 
          ROUND(
            (COUNT(*) FILTER (WHERE cl.status = 'success')::NUMERIC / COUNT(*)) * 100, 
            2
          ),
        'peak_hour', (
          SELECT EXTRACT(HOUR FROM timestamp)
          FROM checkin_logs
          WHERE event_id = p_event_id
            AND ROUND(CAST(app_lat AS NUMERIC), 4) = ROUND(CAST(cl.app_lat AS NUMERIC), 4)
            AND ROUND(CAST(app_lon AS NUMERIC), 4) = ROUND(CAST(cl.app_lon AS NUMERIC), 4)
          GROUP BY EXTRACT(HOUR FROM timestamp)
          ORDER BY COUNT(*) DESC
          LIMIT 1
        )
      ) as metadata
    FROM checkin_logs cl
    LEFT JOIN wristbands w ON cl.wristband_id = w.id
    WHERE cl.event_id = p_event_id
      AND cl.app_lat IS NOT NULL
      AND cl.app_lon IS NOT NULL
      AND COALESCE(cl.app_accuracy, 50) <= 50 -- Only use accurate GPS readings
      AND cl.status = 'success'
    GROUP BY lat_cluster, lon_cluster, cluster_key
    -- Only keep clusters with temporal consistency
    HAVING (
      -- Physical gates need temporal consistency
      EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/3600 >= 0.5 -- 30+ minutes of activity
      OR COUNT(*) >= 10 -- Or high volume
    )
  ),
  category_breakdown AS (
    SELECT 
      gc.cluster_key,
      gc.lat_cluster,
      gc.lon_cluster,
      COALESCE(w.category, 'General') as category,
      COUNT(*) as category_count
    FROM checkin_logs cl
    LEFT JOIN wristbands w ON cl.wristband_id = w.id,
    gps_clusters gc
    WHERE cl.event_id = p_event_id
      AND ROUND(CAST(cl.app_lat AS NUMERIC), 4) = gc.lat_cluster
      AND ROUND(CAST(cl.app_lon AS NUMERIC), 4) = gc.lon_cluster
      AND cl.status = 'success'
    GROUP BY gc.cluster_key, gc.lat_cluster, gc.lon_cluster, w.category
  )
  SELECT 
    gc.cluster_key as cluster_id,
    CASE 
      WHEN gc.checkin_count >= 100 THEN 'Main ' || gc.dominant_category || ' Gate'
      WHEN gc.checkin_count >= 50 THEN gc.dominant_category || ' Entrance'
      ELSE gc.dominant_category || ' Access Point'
    END as gate_name,
    gc.avg_lat as latitude,
    gc.avg_lon as longitude,
    gc.checkin_count,
    gc.dominant_category,
    COALESCE(
      (
        SELECT JSONB_OBJECT_AGG(cb.category, cb.category_count)
        FROM category_breakdown cb
        WHERE cb.cluster_key = gc.cluster_key
      ),
      '{}'::JSONB
    ) as category_distribution,
    gc.first_seen,
    gc.last_seen,
    gc.avg_accuracy,
    gc.confidence_score,
    'gps_clustering' as derivation_method,
    gc.metadata || JSONB_BUILD_OBJECT(
      'cluster_precision', '11_meters',
      'gps_accuracy_threshold', 50,
      'temporal_span_hours', 
        EXTRACT(EPOCH FROM (gc.last_seen - gc.first_seen))/3600,
      'category_entropy', COALESCE(
        (
          -- Calculate category distribution entropy
          SELECT -SUM(
            (cb.category_count::NUMERIC / gc.checkin_count) * 
            LOG(cb.category_count::NUMERIC / gc.checkin_count)
          )
          FROM category_breakdown cb
          WHERE cb.cluster_key = gc.cluster_key
        ),
        0
      )
    ) as metadata
  FROM gps_clusters gc
  WHERE gc.checkin_count >= (
    SELECT min_checkins_for_gate 
    FROM adaptive_thresholds 
    WHERE event_id = p_event_id 
    LIMIT 1
  )
  ORDER BY gc.checkin_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Discover Virtual Gates (Category-based)
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
  RETURN QUERY
  WITH location_similarity AS (
    -- Check if all check-ins happen at similar locations
    SELECT 
      STDDEV(app_lat) as lat_stddev,
      STDDEV(app_lon) as lon_stddev,
      AVG(app_lat) as avg_lat,
      AVG(app_lon) as avg_lon,
      COUNT(*) as total_checkins,
      COUNT(DISTINCT wristband_id) as unique_wristbands
    FROM checkin_logs
    WHERE event_id = p_event_id
      AND app_lat IS NOT NULL
      AND app_lon IS NOT NULL
      AND status = 'success'
  ),
  needs_virtual_gates AS (
    -- Determine if location clustering is ineffective
    SELECT 
      CASE 
        WHEN COALESCE(lat_stddev, 0) < (
          SELECT max_location_variance 
          FROM adaptive_thresholds 
          WHERE event_id = p_event_id 
          LIMIT 1
        ) AND COALESCE(lon_stddev, 0) < (
          SELECT max_location_variance 
          FROM adaptive_thresholds 
          WHERE event_id = p_event_id 
          LIMIT 1
        ) THEN true -- Low variance
        WHEN total_checkins < 50 THEN true -- Small events
        ELSE false
      END as use_virtual_gates,
      total_checkins,
      unique_wristbands,
      avg_lat,
      avg_lon
    FROM location_similarity
  ),
  category_based_gates AS (
    -- Create virtual gates based on category dominance
    SELECT 
      COALESCE(w.category, 'General') as category,
      'virtual_' || LOWER(REPLACE(COALESCE(w.category, 'general'), ' ', '_')) as virtual_gate_id,
      COALESCE(w.category, 'General') || ' Virtual Gate' as gate_name,
      COUNT(*) as checkin_count,
      COUNT(DISTINCT cl.wristband_id) as unique_attendees,
      MIN(cl.timestamp) as first_seen,
      MAX(cl.timestamp) as last_seen,
      -- Confidence based on category purity and volume
      CASE 
        WHEN COUNT(*) >= (SELECT total_checkins * 0.5 FROM needs_virtual_gates) THEN 0.95
        WHEN COUNT(*) >= (SELECT total_checkins * 0.3 FROM needs_virtual_gates) THEN 0.85
        WHEN COUNT(*) >= (SELECT total_checkins * 0.15 FROM needs_virtual_gates) THEN 0.75
        ELSE 0.60
      END as confidence_score,
      JSONB_BUILD_OBJECT(
        'avg_processing_time_ms', AVG(COALESCE(cl.processing_time_ms, 0)),
        'success_rate', 
          ROUND(
            (COUNT(*) FILTER (WHERE cl.status = 'success')::NUMERIC / COUNT(*)) * 100, 
            2
          ),
        'peak_hour', (
          SELECT EXTRACT(HOUR FROM timestamp)
          FROM checkin_logs cl2
          LEFT JOIN wristbands w2 ON cl2.wristband_id = w2.id
          WHERE cl2.event_id = p_event_id
            AND COALESCE(w2.category, 'General') = COALESCE(w.category, 'General')
          GROUP BY EXTRACT(HOUR FROM timestamp)
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ),
        'unique_staff', COUNT(DISTINCT cl.staff_id),
        'temporal_distribution', (
          SELECT JSONB_OBJECT_AGG(
            hour_slot,
            checkin_count
          )
          FROM (
            SELECT 
              EXTRACT(HOUR FROM timestamp) as hour_slot,
              COUNT(*) as checkin_count
            FROM checkin_logs cl3
            LEFT JOIN wristbands w3 ON cl3.wristband_id = w3.id
            WHERE cl3.event_id = p_event_id
              AND COALESCE(w3.category, 'General') = COALESCE(w.category, 'General')
            GROUP BY hour_slot
            ORDER BY hour_slot
          ) hourly
        ),
        'location_variance', (
          SELECT JSONB_BUILD_OBJECT(
            'lat_stddev', STDDEV(cl.app_lat),
            'lon_stddev', STDDEV(cl.app_lon),
            'avg_lat', AVG(cl.app_lat),
            'avg_lon', AVG(cl.app_lon)
          )
          FROM checkin_logs cl
          LEFT JOIN wristbands w5 ON cl.wristband_id = w5.id
          WHERE cl.event_id = p_event_id
            AND COALESCE(w5.category, 'General') = COALESCE(w.category, 'General')
            AND cl.app_lat IS NOT NULL
        )
      ) as metadata
    FROM checkin_logs cl
    LEFT JOIN wristbands w ON cl.wristband_id = w.id
    CROSS JOIN needs_virtual_gates nvg
    WHERE cl.event_id = p_event_id
      AND cl.status = 'success'
      AND nvg.use_virtual_gates = true
    GROUP BY w.category
    HAVING COUNT(*) >= 5 -- Minimum checkins to qualify as virtual gate
  )
  SELECT 
    cbg.virtual_gate_id,
    cbg.gate_name,
    cbg.category,
    cbg.checkin_count,
    cbg.unique_attendees,
    cbg.first_seen,
    cbg.last_seen,
    cbg.confidence_score,
    'virtual_category_based' as derivation_method,
    cbg.metadata || JSONB_BUILD_OBJECT(
      'reason', 'low_location_variance',
      'gate_type', 'virtual',
      'enforcement_mode', 'category_dominant',
      'checkin_percentage', 
        ROUND(
          (cbg.checkin_count::NUMERIC / (SELECT total_checkins FROM needs_virtual_gates)) * 100,
          2
        )
    ) as metadata
  FROM category_based_gates cbg
  ORDER BY cbg.checkin_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Unified Gate Derivation (Physical + Virtual)
CREATE OR REPLACE FUNCTION derive_all_gates(p_event_id UUID)
RETURNS TABLE (
  gate_id TEXT,
  gate_name TEXT,
  gate_type TEXT, -- 'physical' or 'virtual'
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
DECLARE
  physical_gate_count INTEGER;
  total_checkins INTEGER;
  location_variance NUMERIC;
BEGIN
  -- Analyze event characteristics
  SELECT 
    COUNT(*) INTO total_checkins
  FROM checkin_logs
  WHERE event_id = p_event_id AND status = 'success';

  -- Calculate location variance
  SELECT 
    COALESCE((STDDEV(app_lat) + STDDEV(app_lon)) / 2, 0) INTO location_variance
  FROM checkin_logs
  WHERE event_id = p_event_id 
    AND app_lat IS NOT NULL 
    AND app_lon IS NOT NULL;

  -- Count potential physical gates
  SELECT COUNT(*) INTO physical_gate_count
  FROM discover_physical_gates(p_event_id);

  -- Decide strategy: physical gates or virtual gates
  IF physical_gate_count >= 2 AND location_variance > (
    SELECT max_location_variance 
    FROM adaptive_thresholds 
    WHERE event_id = p_event_id 
    LIMIT 1
  ) THEN
    -- Use physical gates (distinct locations detected)
    RETURN QUERY
    SELECT 
      pg.cluster_id as gate_id,
      pg.gate_name,
      'physical'::TEXT as gate_type,
      pg.latitude,
      pg.longitude,
      pg.dominant_category,
      pg.checkin_count,
      (pg.metadata->>'unique_wristbands')::INTEGER as unique_attendees,
      pg.confidence_score,
      pg.derivation_method,
      pg.confidence_score >= (
        SELECT confidence_threshold 
        FROM adaptive_thresholds 
        WHERE event_id = p_event_id 
        LIMIT 1
      ) as should_enforce,
      pg.metadata || JSONB_BUILD_OBJECT(
        'category_distribution', pg.category_distribution,
        'first_seen', pg.first_seen,
        'last_seen', pg.last_seen,
        'avg_gps_accuracy', pg.avg_accuracy,
        'gate_selection_reason', 'distinct_physical_locations'
      ) as metadata,
      NOW() as created_at
    FROM discover_physical_gates(p_event_id) pg;

  ELSE
    -- Use virtual gates (same location, differentiate by category)
    RETURN QUERY
    SELECT 
      vg.virtual_gate_id as gate_id,
      vg.gate_name,
      'virtual'::TEXT as gate_type,
      NULL::DOUBLE PRECISION as latitude,
      NULL::DOUBLE PRECISION as longitude,
      vg.category as dominant_category,
      vg.checkin_count,
      vg.unique_attendees,
      vg.confidence_score,
      vg.derivation_method,
      true as should_enforce, -- Always enforce virtual gates
      vg.metadata || JSONB_BUILD_OBJECT(
        'first_seen', vg.first_seen,
        'last_seen', vg.last_seen,
        'gate_selection_reason', 'low_location_variance_or_insufficient_physical_gates',
        'physical_gates_found', physical_gate_count,
        'location_variance', location_variance
      ) as metadata,
      NOW() as created_at
    FROM discover_virtual_gates(p_event_id) vg;

  END IF;
END;
$$ LANGUAGE plpgsql;
