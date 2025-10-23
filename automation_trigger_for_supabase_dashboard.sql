-- AUTOMATIC GATE DISCOVERY TRIGGER
-- Paste this into Supabase Dashboard SQL Editor

-- 1. Simple gate assignment function
CREATE OR REPLACE FUNCTION auto_assign_checkins_to_gates()
RETURNS TRIGGER AS $$
DECLARE
  v_checkin_count INTEGER;
  v_gate_count INTEGER;
BEGIN
  -- Count successful check-ins for this event
  SELECT COUNT(*) INTO v_checkin_count
  FROM checkin_logs
  WHERE event_id = NEW.event_id AND status = 'success';
  
  -- Count existing gates
  SELECT COUNT(*) INTO v_gate_count
  FROM gates WHERE event_id = NEW.event_id;
  
  -- If we have gates but this checkin has no gate, assign it
  IF v_gate_count > 0 AND NEW.gate_id IS NULL AND NEW.app_lat IS NOT NULL THEN
    UPDATE checkin_logs 
    SET gate_id = (
      SELECT g.id 
      FROM gates g
      WHERE g.event_id = NEW.event_id
        AND haversine_distance(g.latitude, g.longitude, NEW.app_lat, NEW.app_lon) <= 50
      ORDER BY haversine_distance(g.latitude, g.longitude, NEW.app_lat, NEW.app_lon)
      LIMIT 1
    )
    WHERE id = NEW.id;
  END IF;
  
  -- Auto-discover gates at 50 check-ins
  IF v_checkin_count = 50 AND v_gate_count = 0 THEN
    -- Create gates automatically
    INSERT INTO gates (event_id, name, latitude, longitude, status, health_score)
    SELECT 
      NEW.event_id,
      CASE 
        WHEN COUNT(*) >= 100 THEN 'Main Gate'
        WHEN COUNT(*) >= 50 THEN 'Secondary Gate'
        ELSE 'Access Point'
      END,
      AVG(app_lat),
      AVG(app_lon),
      'active',
      CASE WHEN COUNT(*) >= 100 THEN 95 ELSE 85 END
    FROM checkin_logs cl
    WHERE cl.event_id = NEW.event_id
      AND cl.app_lat IS NOT NULL
      AND cl.app_lon IS NOT NULL
      AND cl.status = 'success'
    GROUP BY 
      ROUND(CAST(app_lat AS NUMERIC), 4),
      ROUND(CAST(app_lon AS NUMERIC), 4)
    HAVING COUNT(*) >= 10;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS auto_gate_discovery ON checkin_logs;
CREATE TRIGGER auto_gate_discovery
  AFTER INSERT ON checkin_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_checkins_to_gates();

-- 3. Test the automation with your existing event
-- This will assign all existing orphaned check-ins to gates
WITH gate_assignments AS (
  SELECT DISTINCT ON (cl.id)
    cl.id as checkin_id,
    g.id as gate_id
  FROM checkin_logs cl
  CROSS JOIN gates g
  WHERE cl.event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
    AND g.event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
    AND cl.gate_id IS NULL
    AND cl.app_lat IS NOT NULL
    AND haversine_distance(g.latitude, g.longitude, cl.app_lat, cl.app_lon) <= 50
  ORDER BY cl.id, haversine_distance(g.latitude, g.longitude, cl.app_lat, cl.app_lon)
)
UPDATE checkin_logs 
SET gate_id = ga.gate_id
FROM gate_assignments ga
WHERE checkin_logs.id = ga.checkin_id;

-- 4. Verify automation is working
SELECT 
  'AUTOMATION STATUS' as status,
  COUNT(*) as total_checkins,
  COUNT(*) FILTER (WHERE gate_id IS NOT NULL) as assigned_checkins,
  COUNT(DISTINCT gate_id) as total_gates
FROM checkin_logs 
WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
  AND status = 'success';
