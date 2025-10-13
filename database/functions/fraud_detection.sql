-- Fraud Detection SQL Functions
-- Run these in your Supabase SQL editor

-- Function to detect multiple check-ins in short time window
CREATE OR REPLACE FUNCTION detect_multiple_checkins(
    p_event_id UUID,
    p_time_window_minutes INTEGER DEFAULT 5,
    p_min_checkins INTEGER DEFAULT 3
)
RETURNS TABLE (
    wristband_id TEXT,
    checkin_count BIGINT,
    locations TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.wristband_id,
        COUNT(*) as checkin_count,
        ARRAY_AGG(DISTINCT cl.location) as locations
    FROM checkin_logs cl
    WHERE cl.event_id = p_event_id
        AND cl.timestamp >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
        AND cl.status = 'success'
    GROUP BY cl.wristband_id
    HAVING COUNT(*) >= p_min_checkins;
END;
$$ LANGUAGE plpgsql;

-- Function to detect impossible location jumps
CREATE OR REPLACE FUNCTION detect_impossible_locations(
    p_event_id UUID,
    p_max_speed_kmh NUMERIC DEFAULT 30
)
RETURNS TABLE (
    wristband_id TEXT,
    distance NUMERIC,
    time_diff NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH location_pairs AS (
        SELECT 
            cl1.wristband_id,
            cl1.timestamp as time1,
            cl2.timestamp as time2,
            g1.location_lat as lat1,
            g1.location_lng as lng1,
            g2.location_lat as lat2,
            g2.location_lng as lng2,
            EXTRACT(EPOCH FROM (cl2.timestamp - cl1.timestamp)) as time_diff_seconds
        FROM checkin_logs cl1
        JOIN checkin_logs cl2 ON cl1.wristband_id = cl2.wristband_id 
            AND cl2.timestamp > cl1.timestamp
        LEFT JOIN gates g1 ON cl1.location = g1.name AND g1.event_id = p_event_id
        LEFT JOIN gates g2 ON cl2.location = g2.name AND g2.event_id = p_event_id
        WHERE cl1.event_id = p_event_id
            AND cl2.event_id = p_event_id
            AND g1.location_lat IS NOT NULL 
            AND g1.location_lng IS NOT NULL
            AND g2.location_lat IS NOT NULL 
            AND g2.location_lng IS NOT NULL
            AND cl1.timestamp >= NOW() - INTERVAL '1 day'
    ),
    distances AS (
        SELECT 
            wristband_id,
            time_diff_seconds,
            -- Haversine formula for distance calculation
            (6371000 * acos(
                cos(radians(lat1)) * cos(radians(lat2)) * 
                cos(radians(lng2) - radians(lng1)) + 
                sin(radians(lat1)) * sin(radians(lat2))
            )) as distance_meters
        FROM location_pairs
        WHERE time_diff_seconds > 0
    )
    SELECT 
        d.wristband_id,
        d.distance_meters,
        d.time_diff_seconds
    FROM distances d
    WHERE (d.distance_meters / d.time_diff_seconds) > (p_max_speed_kmh * 1000 / 3600) -- Convert km/h to m/s
        AND d.distance_meters > 50; -- Ignore very short distances
END;
$$ LANGUAGE plpgsql;

-- Function to get wristband fraud score
CREATE OR REPLACE FUNCTION calculate_fraud_score(
    p_wristband_id TEXT,
    p_event_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
    fraud_score NUMERIC := 0;
    checkin_count INTEGER;
    rapid_checkins INTEGER;
    location_jumps INTEGER;
    blocked_attempts INTEGER;
BEGIN
    -- Count total check-ins
    SELECT COUNT(*) INTO checkin_count
    FROM checkin_logs
    WHERE wristband_id = p_wristband_id AND event_id = p_event_id;
    
    -- Count rapid check-ins (more than 3 in 5 minutes)
    SELECT COUNT(*) INTO rapid_checkins
    FROM (
        SELECT wristband_id, 
               COUNT(*) OVER (
                   PARTITION BY wristband_id 
                   ORDER BY timestamp 
                   RANGE BETWEEN INTERVAL '5 minutes' PRECEDING AND CURRENT ROW
               ) as rolling_count
        FROM checkin_logs
        WHERE wristband_id = p_wristband_id AND event_id = p_event_id
    ) t
    WHERE rolling_count > 3;
    
    -- Count blocked attempts
    SELECT COUNT(*) INTO blocked_attempts
    FROM checkin_logs
    WHERE wristband_id = p_wristband_id 
        AND event_id = p_event_id 
        AND status = 'blocked';
    
    -- Calculate score (0-100, higher = more suspicious)
    fraud_score := LEAST(100, 
        (rapid_checkins * 25) + 
        (blocked_attempts * 15) + 
        (CASE WHEN checkin_count > 10 THEN 10 ELSE 0 END)
    );
    
    RETURN fraud_score;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-block suspicious wristbands
CREATE OR REPLACE FUNCTION auto_block_suspicious_wristbands(
    p_event_id UUID,
    p_fraud_threshold NUMERIC DEFAULT 75
)
RETURNS TABLE (
    wristband_id TEXT,
    fraud_score NUMERIC,
    blocked BOOLEAN
) AS $$
DECLARE
    wristband_record RECORD;
    score NUMERIC;
BEGIN
    FOR wristband_record IN 
        SELECT DISTINCT cl.wristband_id
        FROM checkin_logs cl
        WHERE cl.event_id = p_event_id
            AND cl.timestamp >= NOW() - INTERVAL '1 hour'
    LOOP
        score := calculate_fraud_score(wristband_record.wristband_id, p_event_id);
        
        IF score >= p_fraud_threshold THEN
            -- Block the wristband
            UPDATE wristbands 
            SET status = 'blocked',
                notes = COALESCE(notes, '[]'::jsonb) || jsonb_build_object(
                    'timestamp', NOW(),
                    'action', 'auto_blocked',
                    'reason', 'High fraud score: ' || score,
                    'system', 'fraud_detection'
                )
            WHERE nfc_id = wristband_record.wristband_id;
            
            -- Log the action
            INSERT INTO audit_log (
                event_id, action, table_name, record_id, new_values
            ) VALUES (
                p_event_id, 'auto_block_fraud', 'wristbands', 
                wristband_record.wristband_id,
                jsonb_build_object('fraud_score', score, 'threshold', p_fraud_threshold)
            );
            
            RETURN QUERY SELECT wristband_record.wristband_id, score, true;
        ELSE
            RETURN QUERY SELECT wristband_record.wristband_id, score, false;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to detect fraud on new check-ins
CREATE OR REPLACE FUNCTION trigger_fraud_detection()
RETURNS TRIGGER AS $$
DECLARE
    recent_checkins INTEGER;
    fraud_score NUMERIC;
BEGIN
    -- Only process successful check-ins
    IF NEW.status != 'success' THEN
        RETURN NEW;
    END IF;
    
    -- Count recent check-ins for this wristband
    SELECT COUNT(*) INTO recent_checkins
    FROM checkin_logs
    WHERE wristband_id = NEW.wristband_id
        AND event_id = NEW.event_id
        AND timestamp >= NOW() - INTERVAL '5 minutes'
        AND status = 'success';
    
    -- If too many recent check-ins, create alert
    IF recent_checkins > 3 THEN
        INSERT INTO system_alerts (
            event_id, alert_type, severity, message, data
        ) VALUES (
            NEW.event_id,
            'fraud_detection',
            CASE WHEN recent_checkins > 5 THEN 'critical' ELSE 'high' END,
            'Multiple check-ins detected for wristband ' || NEW.wristband_id,
            jsonb_build_object(
                'wristband_id', NEW.wristband_id,
                'checkin_count', recent_checkins,
                'time_window', '5 minutes'
            )
        );
    END IF;
    
    -- Calculate and store fraud score
    fraud_score := calculate_fraud_score(NEW.wristband_id, NEW.event_id);
    
    -- Auto-block if score is very high
    IF fraud_score >= 90 THEN
        UPDATE wristbands 
        SET status = 'blocked'
        WHERE nfc_id = NEW.wristband_id;
        
        -- Update the check-in status to blocked
        NEW.status := 'blocked';
        NEW.notes := jsonb_build_object(
            'auto_blocked', true,
            'fraud_score', fraud_score,
            'reason', 'Automatic fraud detection'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS fraud_detection_trigger ON checkin_logs;
CREATE TRIGGER fraud_detection_trigger
    BEFORE INSERT ON checkin_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_fraud_detection();

-- Create system_alerts table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_alerts_event_id ON system_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_wristband_timestamp ON checkin_logs(wristband_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_event_timestamp ON checkin_logs(event_id, timestamp);
