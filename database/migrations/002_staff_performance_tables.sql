-- Staff Performance and Shift Management Tables
-- Run this in your Supabase SQL editor

-- Create staff_gate_assignments table for shift management
CREATE TABLE IF NOT EXISTS staff_gate_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gate_id UUID REFERENCES gates(id) ON DELETE CASCADE,
    shift_start TIMESTAMP WITH TIME ZONE NOT NULL,
    shift_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('scheduled', 'active', 'completed', 'no_show', 'cancelled')) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, shift_start, shift_end)
);

-- Create staff_performance_cache table for optimized queries
CREATE TABLE IF NOT EXISTS staff_performance_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_scans INTEGER DEFAULT 0,
    successful_scans INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0,
    scans_per_hour DECIMAL(8,2) DEFAULT 0,
    efficiency_score INTEGER DEFAULT 0,
    hours_worked DECIMAL(8,2) DEFAULT 0,
    break_time INTEGER DEFAULT 0, -- minutes
    first_scan_time TIMESTAMP WITH TIME ZONE,
    last_scan_time TIMESTAMP WITH TIME ZONE,
    gates_worked TEXT[], -- array of gate names
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, user_id, date)
);

-- Create staff_messages table for communication
CREATE TABLE IF NOT EXISTS staff_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type TEXT CHECK (message_type IN ('direct', 'broadcast', 'alert', 'assignment')) DEFAULT 'direct',
    subject TEXT,
    message TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create staff_breaks table for break tracking
CREATE TABLE IF NOT EXISTS staff_breaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    break_start TIMESTAMP WITH TIME ZONE NOT NULL,
    break_end TIMESTAMP WITH TIME ZONE,
    break_type TEXT CHECK (break_type IN ('lunch', 'short', 'emergency', 'shift_change')) DEFAULT 'short',
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN break_end IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (break_end - break_start)) / 60
            ELSE NULL
        END
    ) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_gate_assignments_event_user ON staff_gate_assignments(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_staff_gate_assignments_shift_start ON staff_gate_assignments(shift_start);
CREATE INDEX IF NOT EXISTS idx_staff_performance_cache_event_date ON staff_performance_cache(event_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_messages_to_user ON staff_messages(to_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_staff_breaks_user_date ON staff_breaks(user_id, DATE(break_start));

-- Function to calculate and cache staff performance
CREATE OR REPLACE FUNCTION update_staff_performance_cache(
    p_event_id UUID,
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
    performance_data RECORD;
BEGIN
    -- Calculate performance metrics for the specified date
    SELECT 
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE status = 'success') as successful_scans,
        COALESCE(
            100.0 * (COUNT(*) - COUNT(*) FILTER (WHERE status = 'success')) / NULLIF(COUNT(*), 0),
            0
        ) as error_rate,
        MIN(timestamp) as first_scan,
        MAX(timestamp) as last_scan,
        ARRAY_AGG(DISTINCT location) FILTER (WHERE location IS NOT NULL) as gates_worked
    INTO performance_data
    FROM checkin_logs
    WHERE event_id = p_event_id
        AND staff_id = p_user_id
        AND DATE(timestamp) = p_date;

    -- Calculate hours worked and scans per hour
    DECLARE
        hours_worked DECIMAL(8,2) := 0;
        scans_per_hour DECIMAL(8,2) := 0;
        efficiency_score INTEGER := 0;
    BEGIN
        IF performance_data.first_scan IS NOT NULL AND performance_data.last_scan IS NOT NULL THEN
            hours_worked := EXTRACT(EPOCH FROM (performance_data.last_scan - performance_data.first_scan)) / 3600.0;
            IF hours_worked > 0 THEN
                scans_per_hour := performance_data.total_scans / hours_worked;
            END IF;
        END IF;

        -- Calculate efficiency score (0-100)
        efficiency_score := LEAST(100, GREATEST(0, 
            ROUND(
                (scans_per_hour / 30.0 * 70) + -- 30 scans/hour = 70 points
                (100 - performance_data.error_rate) * 0.3 -- Error rate penalty
            )
        ));

        -- Insert or update cache
        INSERT INTO staff_performance_cache (
            event_id, user_id, date, total_scans, successful_scans, error_rate,
            scans_per_hour, efficiency_score, hours_worked, first_scan_time,
            last_scan_time, gates_worked
        ) VALUES (
            p_event_id, p_user_id, p_date, performance_data.total_scans,
            performance_data.successful_scans, performance_data.error_rate,
            scans_per_hour, efficiency_score, hours_worked,
            performance_data.first_scan, performance_data.last_scan,
            performance_data.gates_worked
        )
        ON CONFLICT (event_id, user_id, date)
        DO UPDATE SET
            total_scans = EXCLUDED.total_scans,
            successful_scans = EXCLUDED.successful_scans,
            error_rate = EXCLUDED.error_rate,
            scans_per_hour = EXCLUDED.scans_per_hour,
            efficiency_score = EXCLUDED.efficiency_score,
            hours_worked = EXCLUDED.hours_worked,
            first_scan_time = EXCLUDED.first_scan_time,
            last_scan_time = EXCLUDED.last_scan_time,
            gates_worked = EXCLUDED.gates_worked,
            updated_at = NOW();
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get staff leaderboard
CREATE OR REPLACE FUNCTION get_staff_leaderboard(
    p_event_id UUID,
    p_date DATE DEFAULT CURRENT_DATE,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    total_scans INTEGER,
    scans_per_hour DECIMAL(8,2),
    efficiency_score INTEGER,
    error_rate DECIMAL(5,2),
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        spc.user_id,
        spc.total_scans,
        spc.scans_per_hour,
        spc.efficiency_score,
        spc.error_rate,
        ROW_NUMBER() OVER (ORDER BY spc.efficiency_score DESC, spc.total_scans DESC)::INTEGER as rank
    FROM staff_performance_cache spc
    WHERE spc.event_id = p_event_id
        AND spc.date = p_date
    ORDER BY spc.efficiency_score DESC, spc.total_scans DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to send message to staff
CREATE OR REPLACE FUNCTION send_staff_message(
    p_event_id UUID,
    p_from_user_id UUID,
    p_to_user_ids UUID[],
    p_message TEXT,
    p_subject TEXT DEFAULT NULL,
    p_message_type TEXT DEFAULT 'direct',
    p_priority TEXT DEFAULT 'normal'
)
RETURNS INTEGER AS $$
DECLARE
    user_id UUID;
    messages_sent INTEGER := 0;
BEGIN
    FOREACH user_id IN ARRAY p_to_user_ids
    LOOP
        INSERT INTO staff_messages (
            event_id, from_user_id, to_user_id, message_type,
            subject, message, priority
        ) VALUES (
            p_event_id, p_from_user_id, user_id, p_message_type,
            p_subject, p_message, p_priority
        );
        messages_sent := messages_sent + 1;
    END LOOP;
    
    RETURN messages_sent;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update performance cache on new check-ins
CREATE OR REPLACE FUNCTION trigger_update_performance_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Update cache for the staff member who performed the scan
    IF NEW.staff_id IS NOT NULL THEN
        PERFORM update_staff_performance_cache(
            NEW.event_id,
            NEW.staff_id::UUID,
            DATE(NEW.timestamp)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS performance_cache_trigger ON checkin_logs;
CREATE TRIGGER performance_cache_trigger
    AFTER INSERT OR UPDATE ON checkin_logs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_performance_cache();

-- Function to start staff break
CREATE OR REPLACE FUNCTION start_staff_break(
    p_event_id UUID,
    p_user_id UUID,
    p_break_type TEXT DEFAULT 'short',
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    break_id UUID;
BEGIN
    -- End any active breaks first
    UPDATE staff_breaks 
    SET break_end = NOW()
    WHERE event_id = p_event_id 
        AND user_id = p_user_id 
        AND break_end IS NULL;
    
    -- Start new break
    INSERT INTO staff_breaks (event_id, user_id, break_start, break_type, notes)
    VALUES (p_event_id, p_user_id, NOW(), p_break_type, p_notes)
    RETURNING id INTO break_id;
    
    RETURN break_id;
END;
$$ LANGUAGE plpgsql;

-- Function to end staff break
CREATE OR REPLACE FUNCTION end_staff_break(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE staff_breaks 
    SET break_end = NOW()
    WHERE event_id = p_event_id 
        AND user_id = p_user_id 
        AND break_end IS NULL;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE staff_gate_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_breaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view their own assignments" ON staff_gate_assignments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Event admins can manage assignments" ON staff_gate_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = staff_gate_assignments.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level IN ('admin')
        )
    );

CREATE POLICY "Staff can view their own performance" ON staff_performance_cache
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Event staff can view team performance" ON staff_performance_cache
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = staff_performance_cache.event_id 
            AND ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view their messages" ON staff_messages
    FOR SELECT USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

CREATE POLICY "Event admins can send messages" ON staff_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = staff_messages.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level IN ('admin')
        )
    );

CREATE POLICY "Staff can manage their breaks" ON staff_breaks
    FOR ALL USING (user_id = auth.uid());
