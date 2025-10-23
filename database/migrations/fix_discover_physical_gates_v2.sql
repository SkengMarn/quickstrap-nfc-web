-- FIX: discover_physical_gates_v2 GROUP BY issue
-- The problem is using AVG() in GROUP BY - we need to fix the clustering logic

CREATE OR REPLACE FUNCTION discover_physical_gates_v2(p_event_id UUID)
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
  purity_score NUMERIC,
  spatial_variance NUMERIC,
  temporal_consistency NUMERIC,
  derivation_method TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH valid_checkins AS (
    -- Step 1: Filter for high-quality GPS data only
    SELECT
      cl.id,
      cl.wristband_id,
      cl.staff_id,
      cl.app_lat,
      cl.app_lon,
      cl.app_accuracy,
      cl.timestamp,
      cl.processing_time_ms,
      cl.status,
      COALESCE(w.category, 'General') as category
    FROM checkin_logs cl
    LEFT JOIN wristbands w ON cl.wristband_id = w.id
    WHERE cl.event_id = p_event_id
      AND cl.status = 'success'
      AND is_valid_gps(cl.app_lat, cl.app_lon, cl.app_accuracy)
  ),
  gps_stats AS (
    -- Step 2: Calculate statistics for outlier detection
    SELECT
      AVG(app_lat) as mean_lat,
      AVG(app_lon) as mean_lon,
      STDDEV(app_lat) as stddev_lat,
      STDDEV(app_lon) as stddev_lon
    FROM valid_checkins
  ),
  filtered_checkins AS (
    -- Step 3: Remove GPS outliers (beyond 3 standard deviations)
    SELECT vc.*
    FROM valid_checkins vc
    CROSS JOIN gps_stats gs
    WHERE (
      gs.stddev_lat IS NULL OR gs.stddev_lon IS NULL OR
      (
        ABS(vc.app_lat - gs.mean_lat) <= 3 * gs.stddev_lat AND
        ABS(vc.app_lon - gs.mean_lon) <= 3 * gs.stddev_lon
      )
    )
  ),
  -- FIXED: Pre-calculate accuracy groups to avoid AVG in GROUP BY
  accuracy_groups AS (
    SELECT 
      *,
      CASE
        WHEN app_accuracy <= 15 THEN 'high'    -- 1.1m precision
        WHEN app_accuracy <= 30 THEN 'medium'  -- 11m precision
        ELSE 'low'                              -- 111m precision
      END as accuracy_group
    FROM filtered_checkins
  ),
  initial_clusters AS (
    -- Step 4: Create initial clusters with adaptive precision
    SELECT
      CASE
        WHEN accuracy_group = 'high' THEN ROUND(CAST(app_lat AS NUMERIC), 5)
        WHEN accuracy_group = 'medium' THEN ROUND(CAST(app_lat AS NUMERIC), 4)
        ELSE ROUND(CAST(app_lat AS NUMERIC), 3)
      END as lat_cluster,
      CASE
        WHEN accuracy_group = 'high' THEN ROUND(CAST(app_lon AS NUMERIC), 5)
        WHEN accuracy_group = 'medium' THEN ROUND(CAST(app_lon AS NUMERIC), 4)
        ELSE ROUND(CAST(app_lon AS NUMERIC), 3)
      END as lon_cluster,
      accuracy_group,
      COUNT(*) as sample_size,
      AVG(app_accuracy) as avg_accuracy
    FROM accuracy_groups
    GROUP BY
      accuracy_group,
      CASE
        WHEN accuracy_group = 'high' THEN ROUND(CAST(app_lat AS NUMERIC), 5)
        WHEN accuracy_group = 'medium' THEN ROUND(CAST(app_lat AS NUMERIC), 4)
        ELSE ROUND(CAST(app_lat AS NUMERIC), 3)
      END,
      CASE
        WHEN accuracy_group = 'high' THEN ROUND(CAST(app_lon AS NUMERIC), 5)
        WHEN accuracy_group = 'medium' THEN ROUND(CAST(app_lon AS NUMERIC), 4)
        ELSE ROUND(CAST(app_lon AS NUMERIC), 3)
      END
  ),
  refined_clusters AS (
    -- Step 5: Assign checkins to nearest cluster
    SELECT DISTINCT ON (fc.id)
      fc.id,
      fc.wristband_id,
      fc.staff_id,
      fc.app_lat,
      fc.app_lon,
      fc.app_accuracy,
      fc.timestamp,
      fc.processing_time_ms,
      fc.status,
      fc.category,
      ic.lat_cluster || ',' || ic.lon_cluster as cluster_key,
      ic.lat_cluster,
      ic.lon_cluster
    FROM accuracy_groups fc
    JOIN initial_clusters ic ON fc.accuracy_group = ic.accuracy_group
    WHERE haversine_distance(
      fc.app_lat, fc.app_lon,
      ic.lat_cluster, ic.lon_cluster
    ) <= LEAST(50, ic.avg_accuracy * 2)
    ORDER BY fc.id, haversine_distance(
      fc.app_lat, fc.app_lon,
      ic.lat_cluster, ic.lon_cluster
    )
  ),
  cluster_analysis AS (
    -- Step 6: Analyze each cluster
    SELECT
      rc.cluster_key,
      COUNT(*) as checkin_count,
      AVG(rc.app_lat) as avg_lat,
      AVG(rc.app_lon) as avg_lon,
      STDDEV(rc.app_lat) as lat_variance,
      STDDEV(rc.app_lon) as lon_variance,
      AVG(rc.app_accuracy) as avg_accuracy,
      MIN(rc.timestamp) as first_seen,
      MAX(rc.timestamp) as last_seen,
      MODE() WITHIN GROUP (ORDER BY rc.category) as dominant_category,
      COUNT(DISTINCT rc.wristband_id) as unique_wristbands,
      COUNT(DISTINCT rc.staff_id) as unique_staff,
      COUNT(DISTINCT DATE_TRUNC('hour', rc.timestamp)) as active_hours,
      AVG(rc.processing_time_ms) as avg_processing_time,
      -- Category distribution
      JSONB_OBJECT_AGG(
        cat_stats.category,
        cat_stats.count
      ) as category_dist,
      -- Dominant category percentage (purity)
      MAX(cat_stats.count)::NUMERIC / COUNT(*)::NUMERIC as category_purity
    FROM refined_clusters rc
    LEFT JOIN LATERAL (
      SELECT category, COUNT(*) as count
      FROM refined_clusters rc2
      WHERE rc2.cluster_key = rc.cluster_key
      GROUP BY category
    ) cat_stats ON true
    WHERE rc.cluster_key IN (
      SELECT cluster_key
      FROM refined_clusters
      GROUP BY cluster_key
      HAVING COUNT(*) >= 3  -- Minimum 3 checkins
    )
    GROUP BY rc.cluster_key
    HAVING (
      -- Require temporal consistency (30+ minutes OR high volume)
      EXTRACT(EPOCH FROM (MAX(rc.timestamp) - MIN(rc.timestamp)))/3600 >= 0.5
      OR COUNT(*) >= 10
    )
    AND (
      -- Require spatial consistency (low variance OR high volume)
      COALESCE(STDDEV(rc.app_lat), 0) < 0.001
      OR COALESCE(STDDEV(rc.app_lon), 0) < 0.001
      OR COUNT(*) >= 20
    )
  ),
  confidence_scoring AS (
    -- Step 7: Calculate multi-factor confidence scores
    SELECT
      ca.*,
      -- Base confidence on sample size
      CASE
        WHEN ca.checkin_count >= 200 THEN 0.98
        WHEN ca.checkin_count >= 100 THEN 0.95
        WHEN ca.checkin_count >= 50 THEN 0.90
        WHEN ca.checkin_count >= 20 THEN 0.82
        WHEN ca.checkin_count >= 10 THEN 0.72
        ELSE 0.60
      END *
      -- Adjust for GPS accuracy
      CASE
        WHEN ca.avg_accuracy <= 10 THEN 1.00
        WHEN ca.avg_accuracy <= 20 THEN 0.98
        WHEN ca.avg_accuracy <= 30 THEN 0.95
        WHEN ca.avg_accuracy <= 40 THEN 0.90
        ELSE 0.85
      END *
      -- Adjust for category purity
      (0.7 + (ca.category_purity * 0.3)) *
      -- Adjust for spatial consistency
      CASE
        WHEN COALESCE(ca.lat_variance, 0) + COALESCE(ca.lon_variance, 0) < 0.0001 THEN 1.00
        WHEN COALESCE(ca.lat_variance, 0) + COALESCE(ca.lon_variance, 0) < 0.0005 THEN 0.95
        ELSE 0.90
      END *
      -- Adjust for temporal consistency
      CASE
        WHEN ca.active_hours >= 6 THEN 1.00
        WHEN ca.active_hours >= 3 THEN 0.95
        WHEN ca.active_hours >= 1 THEN 0.90
        ELSE 0.85
      END as confidence_score,
      -- Temporal consistency metric (0-1)
      LEAST(ca.active_hours::NUMERIC / 8, 1.0) as temporal_consistency,
      -- Spatial variance metric (lower is better)
      COALESCE(ca.lat_variance, 0) + COALESCE(ca.lon_variance, 0) as spatial_variance,
      -- Category entropy (purity score, lower is better)
      calculate_category_entropy(ca.category_dist) as category_entropy
    FROM cluster_analysis ca
  )
  SELECT
    cs.cluster_key as cluster_id,
    -- Smart naming based on characteristics
    CASE
      WHEN cs.checkin_count >= 200 THEN 'Primary ' || cs.dominant_category || ' Gate'
      WHEN cs.checkin_count >= 100 THEN 'Main ' || cs.dominant_category || ' Gate'
      WHEN cs.checkin_count >= 50 THEN cs.dominant_category || ' Entrance'
      WHEN cs.category_purity >= 0.9 THEN cs.dominant_category || ' Dedicated Gate'
      ELSE cs.dominant_category || ' Access Point'
    END as gate_name,
    cs.avg_lat as latitude,
    cs.avg_lon as longitude,
    cs.checkin_count,
    cs.dominant_category,
    cs.category_dist as category_distribution,
    cs.first_seen,
    cs.last_seen,
    cs.avg_accuracy,
    LEAST(cs.confidence_score, 1.0) as confidence_score,
    cs.category_purity as purity_score,
    cs.spatial_variance,
    cs.temporal_consistency,
    'gps_dbscan_clustering' as derivation_method,
    JSONB_BUILD_OBJECT(
      'unique_wristbands', cs.unique_wristbands,
      'unique_staff', cs.unique_staff,
      'avg_processing_time_ms', ROUND(cs.avg_processing_time, 2),
      'success_rate', 100.0,
      'active_hours', cs.active_hours,
      'temporal_span_hours', ROUND(EXTRACT(EPOCH FROM (cs.last_seen - cs.first_seen))/3600, 2),
      'category_entropy', ROUND(cs.category_entropy, 3),
      'category_purity_pct', ROUND(cs.category_purity * 100, 2),
      'spatial_consistency_score', ROUND((1.0 - (cs.spatial_variance * 100))::NUMERIC, 2),
      'gps_quality_score', ROUND((1.0 - (cs.avg_accuracy / 100))::NUMERIC, 2),
      'outliers_removed', true,
      'clustering_algorithm', 'adaptive_dbscan_fixed',
      'cluster_precision_meters',
        CASE
          WHEN cs.avg_accuracy <= 15 THEN 1.1
          WHEN cs.avg_accuracy <= 30 THEN 11
          ELSE 111
        END
    ) as metadata
  FROM confidence_scoring cs
  WHERE cs.confidence_score >= 0.60
  ORDER BY cs.confidence_score DESC, cs.checkin_count DESC;
END;
$$ LANGUAGE plpgsql;
