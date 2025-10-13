-- Fraud Detection Tables
-- Run this in your Supabase SQL editor

-- Create fraud_detections table
CREATE TABLE IF NOT EXISTS fraud_detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    wristband_id TEXT NOT NULL,
    detection_type TEXT NOT NULL CHECK (detection_type IN ('multiple_checkins', 'impossible_location', 'blocked_attempt', 'suspicious_pattern')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB DEFAULT '{}',
    investigated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create wristband_blocks table
CREATE TABLE IF NOT EXISTS wristband_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wristband_id TEXT NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_by UUID REFERENCES auth.users(id),
    unblocked_at TIMESTAMP WITH TIME ZONE,
    unblocked_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_fraud_detections_event_id ON fraud_detections(event_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_wristband_id ON fraud_detections(wristband_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_type ON fraud_detections(detection_type);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_severity ON fraud_detections(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_created_at ON fraud_detections(created_at);

CREATE INDEX IF NOT EXISTS idx_wristband_blocks_wristband_id ON wristband_blocks(wristband_id);
CREATE INDEX IF NOT EXISTS idx_wristband_blocks_event_id ON wristband_blocks(event_id);

-- Enable RLS
ALTER TABLE fraud_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wristband_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fraud_detections
CREATE POLICY "Event staff can view fraud detections" ON fraud_detections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = fraud_detections.event_id 
            AND ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Event admins can manage fraud detections" ON fraud_detections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = fraud_detections.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level IN ('admin')
        )
    );

-- RLS Policies for wristband_blocks
CREATE POLICY "Event staff can view wristband blocks" ON wristband_blocks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = wristband_blocks.event_id 
            AND ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Event admins can manage wristband blocks" ON wristband_blocks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = wristband_blocks.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level IN ('admin')
        )
    );

-- Function to automatically create fraud detection alerts
CREATE OR REPLACE FUNCTION detect_fraud_patterns()
RETURNS TRIGGER AS $$
DECLARE
    recent_checkins_count INTEGER;
    time_window INTERVAL := '5 minutes';
BEGIN
    -- Check for multiple check-ins in short time window
    SELECT COUNT(*) INTO recent_checkins_count
    FROM checkin_logs 
    WHERE wristband_id = NEW.wristband_id 
    AND event_id = NEW.event_id
    AND timestamp >= (NEW.timestamp - time_window)
    AND status = 'success';

    -- Create fraud alert if suspicious pattern detected
    IF recent_checkins_count > 3 THEN
        INSERT INTO fraud_detections (
            event_id,
            wristband_id,
            detection_type,
            severity,
            details
        ) VALUES (
            NEW.event_id,
            NEW.wristband_id,
            'multiple_checkins',
            CASE 
                WHEN recent_checkins_count > 5 THEN 'critical'
                WHEN recent_checkins_count > 4 THEN 'high'
                ELSE 'medium'
            END,
            jsonb_build_object(
                'description', format('%s check-ins detected in %s minutes', recent_checkins_count, EXTRACT(EPOCH FROM time_window)/60),
                'checkin_count', recent_checkins_count,
                'time_window_minutes', EXTRACT(EPOCH FROM time_window)/60,
                'latest_location', NEW.location
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic fraud detection
DROP TRIGGER IF EXISTS trigger_detect_fraud_patterns ON checkin_logs;
CREATE TRIGGER trigger_detect_fraud_patterns
    AFTER INSERT ON checkin_logs
    FOR EACH ROW
    WHEN (NEW.status = 'success')
    EXECUTE FUNCTION detect_fraud_patterns();
