-- LAUNCH DAY MONITORING DASHBOARD
-- Real-time queries for monitoring gate system during launch

-- 1. LIVE EVENT STATUS DASHBOARD
CREATE OR REPLACE VIEW v_live_event_dashboard AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.start_time,
  e.end_time,
  
  -- Real-time metrics
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND status = 'success') as total_checkins,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND timestamp >= NOW() - INTERVAL '1 hour') as checkins_last_hour,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND timestamp >= NOW() - INTERVAL '5 minutes') as checkins_last_5min,
  
  -- Gate system health
  (SELECT COUNT(*) FROM gates WHERE event_id = e.id) as total_gates,
  (SELECT COUNT(*) FROM gates WHERE event_id = e.id AND status = 'active') as active_gates,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND gate_id IS NULL AND status = 'success') as orphaned_checkins,
  (SELECT ROUND(AVG(health_score), 1) FROM gates WHERE event_id = e.id) as avg_gate_health,
  
  -- System automation
  (SELECT COUNT(*) FROM system_logs WHERE event_id = e.id AND created_at >= NOW() - INTERVAL '1 hour') as system_activities_last_hour,
  (SELECT MAX(created_at) FROM system_logs WHERE event_id = e.id) as last_system_activity,
  
  -- Performance indicators
  CASE 
    WHEN (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND gate_id IS NULL AND status = 'success') > 200 
      THEN '🔴 CRITICAL: High orphan count'
    WHEN (SELECT COUNT(*) FROM gates WHERE event_id = e.id AND health_score < 70) > 0
      THEN '🟡 WARNING: Unhealthy gates detected'
    WHEN (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND timestamp >= NOW() - INTERVAL '5 minutes') = 0
      THEN '🟡 INFO: No recent activity'
    ELSE '🟢 HEALTHY: All systems normal'
  END as system_status,
  
  -- Next recommended action
  CASE 
    WHEN (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND gate_id IS NULL AND status = 'success') > 100 
      THEN 'Run: SELECT apply_gate_assignments(''' || e.id || ''')'
    WHEN (SELECT COUNT(*) FROM gates WHERE event_id = e.id) = 0 AND 
         (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND status = 'success') > 25
      THEN 'Run: SELECT emergency_gate_discovery(''' || e.id || ''')'
    ELSE 'No action needed'
  END as recommended_action

FROM events e
WHERE e.start_time >= CURRENT_DATE - INTERVAL '1 day'
  AND e.start_time <= CURRENT_DATE + INTERVAL '1 day'
ORDER BY e.start_time;

-- 2. GATE PERFORMANCE REAL-TIME
CREATE OR REPLACE VIEW v_gate_performance_live AS
SELECT 
  g.id as gate_id,
  g.name as gate_name,
  g.event_id,
  g.status,
  g.health_score,
  
  -- Real-time activity
  (SELECT COUNT(*) FROM checkin_logs WHERE gate_id = g.id AND timestamp >= NOW() - INTERVAL '1 hour') as checkins_last_hour,
  (SELECT COUNT(*) FROM checkin_logs WHERE gate_id = g.id AND timestamp >= NOW() - INTERVAL '5 minutes') as checkins_last_5min,
  (SELECT MAX(timestamp) FROM checkin_logs WHERE gate_id = g.id) as last_checkin,
  
  -- Performance metrics
  gpc.total_scans,
  gpc.successful_scans,
  gpc.failed_scans,
  ROUND(gpc.avg_scan_time_ms, 1) as avg_scan_time_ms,
  ROUND(gpc.scans_per_hour, 1) as scans_per_hour,
  
  -- Category enforcement
  (SELECT COUNT(*) FROM gate_bindings WHERE gate_id = g.id AND status = 'enforced') as enforced_categories,
  (SELECT COUNT(*) FROM gate_bindings WHERE gate_id = g.id AND status = 'probation') as probation_categories,
  
  -- Health indicators
  CASE 
    WHEN g.health_score < 50 THEN '🔴 CRITICAL'
    WHEN g.health_score < 70 THEN '🟡 WARNING'
    WHEN (SELECT MAX(timestamp) FROM checkin_logs WHERE gate_id = g.id) < NOW() - INTERVAL '30 minutes' THEN '🟡 INACTIVE'
    ELSE '🟢 HEALTHY'
  END as health_status

FROM gates g
LEFT JOIN gate_performance_cache gpc ON g.id = gpc.gate_id
WHERE EXISTS (SELECT 1 FROM events WHERE id = g.event_id AND start_time >= CURRENT_DATE - INTERVAL '1 day')
ORDER BY gpc.scans_per_hour DESC NULLS LAST;

-- 3. SYSTEM ACTIVITY LOG (Last 24 hours)
CREATE OR REPLACE VIEW v_system_activity_24h AS
SELECT 
  sl.created_at,
  e.name as event_name,
  sl.log_type,
  sl.message,
  sl.metadata,
  
  -- Time since activity
  EXTRACT(EPOCH FROM (NOW() - sl.created_at))/60 as minutes_ago,
  
  -- Activity classification
  CASE 
    WHEN sl.log_type = 'auto_gate_discovery' THEN '🤖 AUTO DISCOVERY'
    WHEN sl.log_type = 'manual_gate_discovery' THEN '👤 MANUAL DISCOVERY'
    WHEN sl.log_type = 'orphan_assignment' THEN '🔗 ORPHAN ASSIGNMENT'
    WHEN sl.log_type = 'auto_gate_refresh' THEN '🔄 AUTO REFRESH'
    ELSE '📝 ' || UPPER(sl.log_type)
  END as activity_type

FROM system_logs sl
JOIN events e ON sl.event_id = e.id
WHERE sl.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY sl.created_at DESC;

-- 4. CRITICAL ALERTS QUERY
CREATE OR REPLACE FUNCTION get_critical_alerts()
RETURNS TABLE (
  alert_type TEXT,
  event_name TEXT,
  event_id UUID,
  severity TEXT,
  message TEXT,
  count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  
  -- High orphan count alerts
  SELECT 
    'HIGH_ORPHAN_COUNT'::TEXT,
    e.name,
    e.id,
    'CRITICAL'::TEXT,
    'Event has ' || COUNT(cl.id) || ' orphaned check-ins'::TEXT,
    COUNT(cl.id)::INTEGER
  FROM events e
  JOIN checkin_logs cl ON e.id = cl.event_id
  WHERE cl.gate_id IS NULL 
    AND cl.status = 'success'
    AND e.start_time >= CURRENT_DATE - INTERVAL '1 day'
  GROUP BY e.id, e.name
  HAVING COUNT(cl.id) > 100
  
  UNION ALL
  
  -- Unhealthy gates
  SELECT 
    'UNHEALTHY_GATES'::TEXT,
    e.name,
    e.id,
    CASE WHEN MIN(g.health_score) < 50 THEN 'CRITICAL' ELSE 'WARNING' END::TEXT,
    'Event has gates with health scores below 70'::TEXT,
    COUNT(g.id)::INTEGER
  FROM events e
  JOIN gates g ON e.id = g.event_id
  WHERE g.health_score < 70
    AND e.start_time >= CURRENT_DATE - INTERVAL '1 day'
  GROUP BY e.id, e.name
  
  UNION ALL
  
  -- No gates discovered
  SELECT 
    'NO_GATES_DISCOVERED'::TEXT,
    e.name,
    e.id,
    'WARNING'::TEXT,
    'Event has ' || COUNT(cl.id) || ' check-ins but no gates'::TEXT,
    COUNT(cl.id)::INTEGER
  FROM events e
  JOIN checkin_logs cl ON e.id = cl.event_id
  WHERE NOT EXISTS (SELECT 1 FROM gates WHERE event_id = e.id)
    AND cl.status = 'success'
    AND e.start_time >= CURRENT_DATE - INTERVAL '1 day'
  GROUP BY e.id, e.name
  HAVING COUNT(cl.id) > 25;
  
END;
$$ LANGUAGE plpgsql;

-- 5. QUICK HEALTH CHECK (Run every 5 minutes)
CREATE OR REPLACE FUNCTION quick_health_check()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT JSONB_BUILD_OBJECT(
    'timestamp', NOW(),
    'active_events', (
      SELECT COUNT(*) FROM events 
      WHERE start_time <= NOW() AND end_time >= NOW()
    ),
    'total_checkins_last_hour', (
      SELECT COUNT(*) FROM checkin_logs 
      WHERE timestamp >= NOW() - INTERVAL '1 hour' AND status = 'success'
    ),
    'orphaned_checkins', (
      SELECT COUNT(*) FROM checkin_logs 
      WHERE gate_id IS NULL AND status = 'success'
        AND timestamp >= NOW() - INTERVAL '1 hour'
    ),
    'unhealthy_gates', (
      SELECT COUNT(*) FROM gates 
      WHERE health_score < 70
    ),
    'system_activities_last_hour', (
      SELECT COUNT(*) FROM system_logs 
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    ),
    'critical_alerts', (
      SELECT COUNT(*) FROM get_critical_alerts()
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
