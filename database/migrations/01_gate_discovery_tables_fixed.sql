-- Gate Discovery and Enforcement System - Tables and Types
-- Fixed version - Run this first to create the required tables and types

-- Ensure gates table exists first
CREATE TABLE IF NOT EXISTS public.gates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    gate_type VARCHAR(50) DEFAULT 'entry' CHECK (gate_type IN ('entry', 'exit', 'vip', 'staff')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scan_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    is_auto_discovered BOOLEAN DEFAULT false,
    approval_status VARCHAR(50) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create enum types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gate_binding_status') THEN
        CREATE TYPE gate_binding_status AS ENUM ('unbound', 'probation', 'enforced', 'rejected');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gate_merge_status') THEN
        CREATE TYPE gate_merge_status AS ENUM ('pending', 'approved', 'rejected', 'merged');
    END IF;
END $$;

-- Gate performance cache table
CREATE TABLE IF NOT EXISTS gate_performance_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    total_scans INTEGER DEFAULT 0,
    successful_scans INTEGER DEFAULT 0,
    failed_scans INTEGER DEFAULT 0,
    avg_scan_time_ms NUMERIC DEFAULT 0,
    scans_per_hour NUMERIC DEFAULT 0,
    uptime_percentage NUMERIC DEFAULT 100,
    peak_hour INTEGER, -- 0-23
    peak_hour_scans INTEGER DEFAULT 0,
    last_scan_at TIMESTAMP WITH TIME ZONE,
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(gate_id, event_id)
);

-- Gate bindings table (category enforcement)
CREATE TABLE IF NOT EXISTS gate_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    status gate_binding_status DEFAULT 'unbound',
    confidence NUMERIC DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
    sample_count INTEGER DEFAULT 0,
    bound_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_violation_at TIMESTAMP WITH TIME ZONE,
    violation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(gate_id, category)
);

-- Gate merge suggestions table
CREATE TABLE IF NOT EXISTS gate_merge_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    primary_gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    secondary_gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    confidence_score NUMERIC DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    reasoning TEXT,
    distance_meters NUMERIC,
    status gate_merge_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(event_id, primary_gate_id, secondary_gate_id)
);

-- Adaptive thresholds per event
CREATE TABLE IF NOT EXISTS adaptive_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    duplicate_distance_meters NUMERIC DEFAULT 25,
    promotion_sample_size INTEGER DEFAULT 100,
    confidence_threshold NUMERIC DEFAULT 0.75,
    min_checkins_for_gate INTEGER DEFAULT 3,
    max_location_variance NUMERIC DEFAULT 0.0001,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(event_id)
);

-- Gate WiFi networks (for fingerprinting)
CREATE TABLE IF NOT EXISTS gate_wifi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    ssid TEXT NOT NULL,
    signal_strength INTEGER,
    frequency INTEGER,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sample_count INTEGER DEFAULT 1,
    
    UNIQUE(gate_id, ssid)
);

-- BLE beacons for gates
CREATE TABLE IF NOT EXISTS beacons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    beacon_key TEXT NOT NULL, -- UUID or identifier
    beacon_type TEXT DEFAULT 'ibeacon',
    major INTEGER,
    minor INTEGER,
    rssi INTEGER,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sample_count INTEGER DEFAULT 1,
    
    UNIQUE(gate_id, beacon_key)
);

-- Gate geofences (polygon boundaries)
CREATE TABLE IF NOT EXISTS gate_geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    geojson JSONB NOT NULL, -- GeoJSON polygon
    radius_meters NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(gate_id)
);

-- Autonomous gates (AI-managed gates)
CREATE TABLE IF NOT EXISTS autonomous_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'learning', -- learning, active, paused
    confidence_score NUMERIC DEFAULT 0,
    decisions_count INTEGER DEFAULT 0,
    accuracy_rate NUMERIC DEFAULT 0,
    last_decision_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(gate_id)
);

-- Insert default adaptive thresholds for existing events (with safety check)
DO $$
BEGIN
    -- Only insert if events table exists and has records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        INSERT INTO adaptive_thresholds (event_id)
        SELECT id FROM events
        WHERE id NOT IN (SELECT event_id FROM adaptive_thresholds WHERE event_id IS NOT NULL)
        ON CONFLICT (event_id) DO NOTHING;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_event_id ON gate_performance_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_gate_id ON gate_performance_cache(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_event_id ON gate_bindings(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_gate_id ON gate_bindings(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_category ON gate_bindings(category);
CREATE INDEX IF NOT EXISTS idx_gate_merge_suggestions_event_id ON gate_merge_suggestions(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_merge_suggestions_status ON gate_merge_suggestions(status);

-- Enable RLS
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_performance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_merge_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_wifi ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gates table
CREATE POLICY "Users can view gates for their events" ON gates
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage gates for their events" ON gates
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

-- RLS Policies for other tables
CREATE POLICY "Users can view gate performance for their events" ON gate_performance_cache
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage gate bindings for their events" ON gate_bindings
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view merge suggestions for their events" ON gate_merge_suggestions
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage adaptive thresholds for their events" ON adaptive_thresholds
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view gate wifi for their events" ON gate_wifi
    FOR SELECT USING (
        gate_id IN (
            SELECT g.id FROM gates g
            JOIN events e ON g.event_id = e.id
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view beacons for their events" ON beacons
    FOR SELECT USING (
        gate_id IN (
            SELECT g.id FROM gates g
            JOIN events e ON g.event_id = e.id
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage geofences for their events" ON gate_geofences
    FOR ALL USING (
        gate_id IN (
            SELECT g.id FROM gates g
            JOIN events e ON g.event_id = e.id
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view autonomous gates for their events" ON autonomous_gates
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e
            LEFT JOIN event_access ea ON e.id = ea.event_id
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

-- Verification
SELECT 'Gate discovery tables created successfully' as status;
