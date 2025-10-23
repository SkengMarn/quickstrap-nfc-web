-- PRODUCTION AUTOMATION SETUP
-- Auto-triggers for gate discovery during live events

-- 1. AUTO-DISCOVERY TRIGGER (Runs when check-ins reach thresholds)
CREATE OR REPLACE FUNCTION auto_gate_discovery_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_checkin_count INTEGER;
  v_gate_count INTEGER;
  v_orphaned_count INTEGER;
  v_result JSONB;
BEGIN
  -- Count total successful check-ins for this event
  SELECT COUNT(*) INTO v_checkin_count
  FROM checkin_logs
  WHERE event_id = NEW.event_id AND status = 'success';
  
  -- Count existing gates
  SELECT COUNT(*) INTO v_gate_count
  FROM gates WHERE event_id = NEW.event_id;
  
  -- Count orphaned check-ins
  SELECT COUNT(*) INTO v_orphaned_count
  FROM checkin_logs
  WHERE event_id = NEW.event_id AND gate_id IS NULL AND status = 'success';
  
  -- TRIGGER 1: Initial gate discovery at 25 check-ins
  IF v_checkin_count = 25 AND v_gate_count = 0 THEN
    SELECT execute_complete_gate_pipeline(NEW.event_id) INTO v_result;
    INSERT INTO system_logs (event_id, log_type, message, metadata)
    VALUES (NEW.event_id, 'auto_gate_discovery', 'Initial gate discovery triggered', v_result);
  END IF;
  
  -- TRIGGER 2: Re-run discovery every 100 check-ins
  IF v_checkin_count % 100 = 0 THEN
    SELECT execute_complete_gate_pipeline(NEW.event_id) INTO v_result;
    INSERT INTO system_logs (event_id, log_type, message, metadata)
    VALUES (NEW.event_id, 'auto_gate_refresh', 'Periodic gate refresh', v_result);
  END IF;
  
  -- TRIGGER 3: Assign orphaned check-ins every 50 orphans
  IF v_orphaned_count % 50 = 0 AND v_orphaned_count > 0 THEN
    PERFORM apply_gate_assignments(NEW.event_id);
    INSERT INTO system_logs (event_id, log_type, message)
    VALUES (NEW.event_id, 'orphan_assignment', 'Assigned ' || v_orphaned_count || ' orphaned check-ins');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_gate_discovery ON checkin_logs;
CREATE TRIGGER auto_gate_discovery
  AFTER INSERT ON checkin_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_gate_discovery_trigger();

-- 2. SYSTEM LOGS TABLE (for monitoring)
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  log_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON system_logs(event_id, log_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);

-- 3. MONITORING QUERIES FOR LAUNCH DAY
CREATE OR REPLACE VIEW v_launch_monitoring AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.start_time,
  
  -- Check-in stats
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND status = 'success') as total_checkins,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND gate_id IS NULL AND status = 'success') as orphaned_checkins,
  
  -- Gate stats
  (SELECT COUNT(*) FROM gates WHERE event_id = e.id) as total_gates,
  (SELECT COUNT(*) FROM gates WHERE event_id = e.id AND status = 'active') as active_gates,
  
  -- System health
  (SELECT COUNT(*) FROM system_logs WHERE event_id = e.id AND log_type = 'auto_gate_discovery') as auto_discoveries,
  (SELECT MAX(created_at) FROM system_logs WHERE event_id = e.id) as last_system_activity,
  
  -- Performance indicators
  CASE 
    WHEN (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND gate_id IS NULL AND status = 'success') > 100 
      THEN '🔴 HIGH ORPHAN COUNT'
    WHEN (SELECT COUNT(*) FROM gates WHERE event_id = e.id) = 0 AND 
         (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id AND status = 'success') > 25
      THEN '🟡 NEEDS GATE DISCOVERY'
    ELSE '🟢 HEALTHY'
  END as status

FROM events e
WHERE e.start_time >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY e.start_time DESC;

-- 4. EMERGENCY MANUAL TRIGGERS
CREATE OR REPLACE FUNCTION emergency_gate_discovery(p_event_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Force immediate gate discovery
  SELECT execute_complete_gate_pipeline(p_event_id) INTO v_result;
  
  -- Log the manual intervention
  INSERT INTO system_logs (event_id, log_type, message, metadata)
  VALUES (p_event_id, 'manual_gate_discovery', 'Emergency manual gate discovery', v_result);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. REAL-TIME GATE HEALTH CHECK
CREATE OR REPLACE FUNCTION check_gate_health(p_event_id UUID)
RETURNS TABLE (
  gate_id UUID,
  gate_name TEXT,
  health_score NUMERIC,
  issue_type TEXT,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.health_score,
    CASE 
      WHEN g.health_score < 50 THEN 'CRITICAL'
      WHEN g.health_score < 70 THEN 'WARNING'
      WHEN gpc.last_scan_at < NOW() - INTERVAL '30 minutes' THEN 'INACTIVE'
      ELSE 'HEALTHY'
    END as issue_type,
    CASE 
      WHEN g.health_score < 50 THEN 'Investigate gate immediately'
      WHEN g.health_score < 70 THEN 'Monitor closely'
      WHEN gpc.last_scan_at < NOW() - INTERVAL '30 minutes' THEN 'Check if gate is still in use'
      ELSE 'No action needed'
    END as recommendation
  FROM gates g
  LEFT JOIN gate_performance_cache gpc ON g.id = gpc.gate_id
  WHERE g.event_id = p_event_id
  ORDER BY g.health_score ASC;
END;
$$ LANGUAGE plpgsql;
