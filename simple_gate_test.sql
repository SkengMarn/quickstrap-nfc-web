-- SIMPLE GATE DISCOVERY TEST
-- Let's start with basic data analysis for event: ba2e26f7-0713-4448-9cac-cd1eb76a320e

-- 1. EVENT OVERVIEW
SELECT 
  'EVENT DATA' as section,
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

-- 2. GPS DATA QUALITY CHECK
SELECT 
  'GPS QUALITY' as section,
  COUNT(*) as total_checkins_with_gps,
  COUNT(*) FILTER (WHERE app_accuracy <= 10) as excellent_gps,
  COUNT(*) FILTER (WHERE app_accuracy <= 30) as good_gps,
  COUNT(*) FILTER (WHERE app_accuracy <= 50) as fair_gps,
  COUNT(*) FILTER (WHERE app_accuracy > 50) as poor_gps,
  ROUND(AVG(app_accuracy), 2) as avg_accuracy,
  ROUND(STDDEV(app_lat), 6) as lat_variance,
  ROUND(STDDEV(app_lon), 6) as lon_variance
FROM checkin_logs 
WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
  AND app_lat IS NOT NULL 
  AND app_lon IS NOT NULL
  AND status = 'success';

-- 3. CATEGORY DISTRIBUTION
SELECT 
  'CATEGORIES' as section,
  COALESCE(w.category, 'General') as category,
  COUNT(*) as checkin_count,
  COUNT(DISTINCT cl.wristband_id) as unique_wristbands,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM checkin_logs WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e' AND status = 'success') * 100, 2) as percentage
FROM checkin_logs cl
LEFT JOIN wristbands w ON cl.wristband_id = w.id
WHERE cl.event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
  AND cl.status = 'success'
GROUP BY w.category
ORDER BY checkin_count DESC;

-- 4. SIMPLE GPS CLUSTERING (Fixed version)
WITH gps_clusters AS (
  SELECT 
    ROUND(CAST(app_lat AS NUMERIC), 4) as lat_cluster,
    ROUND(CAST(app_lon AS NUMERIC), 4) as lon_cluster,
    COUNT(*) as checkin_count,
    AVG(app_lat) as avg_lat,
    AVG(app_lon) as avg_lon,
    AVG(app_accuracy) as avg_accuracy,
    MIN(timestamp) as first_seen,
    MAX(timestamp) as last_seen,
    COUNT(DISTINCT wristband_id) as unique_wristbands
  FROM checkin_logs cl
  WHERE cl.event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
    AND cl.app_lat IS NOT NULL
    AND cl.app_lon IS NOT NULL
    AND cl.app_accuracy <= 50
    AND cl.status = 'success'
  GROUP BY 
    ROUND(CAST(app_lat AS NUMERIC), 4),
    ROUND(CAST(app_lon AS NUMERIC), 4)
  HAVING COUNT(*) >= 3  -- Minimum 3 checkins per cluster
)
SELECT 
  'GPS CLUSTERS' as section,
  lat_cluster || ',' || lon_cluster as cluster_id,
  CASE 
    WHEN checkin_count >= 100 THEN 'Main Gate'
    WHEN checkin_count >= 50 THEN 'Secondary Gate'
    ELSE 'Access Point'
  END as gate_name,
  avg_lat as latitude,
  avg_lon as longitude,
  checkin_count,
  unique_wristbands,
  ROUND(avg_accuracy, 2) as avg_accuracy,
  CASE 
    WHEN checkin_count >= 100 THEN 0.95
    WHEN checkin_count >= 50 THEN 0.85
    WHEN checkin_count >= 20 THEN 0.75
    WHEN checkin_count >= 10 THEN 0.65
    ELSE 0.50
  END as confidence_score,
  ROUND(EXTRACT(EPOCH FROM (last_seen - first_seen))/3600, 2) as active_hours
FROM gps_clusters
ORDER BY checkin_count DESC;

-- 5. VIRTUAL GATE ANALYSIS (if GPS clustering fails)
SELECT 
  'VIRTUAL GATES' as section,
  COALESCE(w.category, 'General') as category,
  COUNT(*) as checkin_count,
  COUNT(DISTINCT cl.wristband_id) as unique_attendees,
  MIN(cl.timestamp) as first_seen,
  MAX(cl.timestamp) as last_seen,
  CASE 
    WHEN COUNT(*) >= 200 THEN 0.95
    WHEN COUNT(*) >= 100 THEN 0.90
    WHEN COUNT(*) >= 50 THEN 0.85
    ELSE 0.75
  END as confidence_score,
  'virtual_category_based' as derivation_method
FROM checkin_logs cl
LEFT JOIN wristbands w ON cl.wristband_id = w.id
WHERE cl.event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
  AND cl.status = 'success'
GROUP BY w.category
HAVING COUNT(*) >= 10  -- Minimum 10 checkins per virtual gate
ORDER BY checkin_count DESC;

-- 6. RECOMMENDATION
SELECT 
  'RECOMMENDATION' as section,
  CASE 
    WHEN (SELECT COUNT(*) FROM checkin_logs WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e' AND app_lat IS NOT NULL AND status = 'success') = 0 
      THEN 'Use Virtual Gates - No GPS data available'
    WHEN (SELECT STDDEV(app_lat) + STDDEV(app_lon) FROM checkin_logs WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e' AND app_lat IS NOT NULL) < 0.0001
      THEN 'Use Virtual Gates - All checkins at same location'
    WHEN (SELECT COUNT(DISTINCT ROUND(CAST(app_lat AS NUMERIC), 4) || ',' || ROUND(CAST(app_lon AS NUMERIC), 4)) 
          FROM checkin_logs 
          WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e' AND app_lat IS NOT NULL AND status = 'success'
          GROUP BY ROUND(CAST(app_lat AS NUMERIC), 4), ROUND(CAST(app_lon AS NUMERIC), 4)
          HAVING COUNT(*) >= 3) >= 2
      THEN 'Use Physical Gates - Multiple distinct locations detected'
    ELSE 'Use Virtual Gates - Insufficient physical clustering'
  END as strategy,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e' AND status = 'success') as total_checkins,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e' AND app_lat IS NOT NULL AND status = 'success') as gps_checkins,
  CASE 
    WHEN (SELECT COUNT(*) FROM checkin_logs WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e' AND status = 'success') >= 50 
      THEN 'Ready for gate discovery'
    ELSE 'Need more checkins (minimum 50)'
  END as readiness;
