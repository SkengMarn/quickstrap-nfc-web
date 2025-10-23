-- CREATE GATES FOR CHOSEN BLOOD TRIAL
-- Based on GPS clustering analysis - creating physical gates

-- 1. CREATE MAIN GATE
INSERT INTO gates (
  event_id, 
  name, 
  latitude, 
  longitude, 
  location_description,
  status,
  health_score,
  gate_type
) VALUES (
  'ba2e26f7-0713-4448-9cac-cd1eb76a320e',
  'Main Gate',
  0.354198361299476,
  32.5999402139757,
  'Primary entrance - 325 checkins, 95% confidence',
  'active',
  95,
  'entry'
) RETURNING id, name;

-- 2. CREATE SECONDARY GATE
INSERT INTO gates (
  event_id, 
  name, 
  latitude, 
  longitude, 
  location_description,
  status,
  health_score,
  gate_type
) VALUES (
  'ba2e26f7-0713-4448-9cac-cd1eb76a320e',
  'Secondary Access Point',
  0.354179846402819,
  32.5999647580336,
  'Secondary entrance - 46 checkins, 75% confidence',
  'active',
  75,
  'entry'
) RETURNING id, name;

-- 3. CREATE THIRD GATE
INSERT INTO gates (
  event_id, 
  name, 
  latitude, 
  longitude, 
  location_description,
  status,
  health_score,
  gate_type
) VALUES (
  'ba2e26f7-0713-4448-9cac-cd1eb76a320e',
  'North Access Point',
  0.354101440419498,
  32.5999277117935,
  'North entrance - 36 checkins, 75% confidence',
  'active',
  75,
  'entry'
) RETURNING id, name;

-- 4. VIEW CREATED GATES
SELECT 
  id,
  name,
  latitude,
  longitude,
  location_description,
  status,
  health_score,
  created_at
FROM gates 
WHERE event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
ORDER BY health_score DESC;

-- 5. ASSIGN CHECK-INS TO GATES (using Haversine distance)
WITH gate_assignments AS (
  SELECT 
    cl.id as checkin_id,
    g.id as gate_id,
    g.name as gate_name,
    haversine_distance(g.latitude, g.longitude, cl.app_lat, cl.app_lon) as distance_meters
  FROM checkin_logs cl
  CROSS JOIN gates g
  WHERE cl.event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
    AND g.event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
    AND cl.gate_id IS NULL
    AND cl.app_lat IS NOT NULL
    AND cl.app_lon IS NOT NULL
    AND haversine_distance(g.latitude, g.longitude, cl.app_lat, cl.app_lon) <= 50 -- Within 50 meters
),
best_assignments AS (
  SELECT DISTINCT ON (checkin_id)
    checkin_id,
    gate_id,
    gate_name,
    distance_meters
  FROM gate_assignments
  ORDER BY checkin_id, distance_meters ASC
)
UPDATE checkin_logs 
SET gate_id = ba.gate_id,
    notes = COALESCE(notes || ' | ', '') || 'Auto-assigned to ' || ba.gate_name || ' (' || ROUND(ba.distance_meters::NUMERIC, 1) || 'm)'
FROM best_assignments ba
WHERE checkin_logs.id = ba.checkin_id;

-- 6. VIEW ASSIGNMENT RESULTS
SELECT 
  g.name as gate_name,
  COUNT(*) as assigned_checkins,
  COUNT(DISTINCT cl.wristband_id) as unique_wristbands,
  ROUND(AVG(haversine_distance(g.latitude, g.longitude, cl.app_lat, cl.app_lon))::NUMERIC, 2) as avg_distance_meters
FROM checkin_logs cl
JOIN gates g ON cl.gate_id = g.id
WHERE cl.event_id = 'ba2e26f7-0713-4448-9cac-cd1eb76a320e'
GROUP BY g.id, g.name
ORDER BY assigned_checkins DESC;
