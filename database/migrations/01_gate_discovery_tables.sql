-- Gate Discovery and Enforcement System - Tables and Types
-- Run this first to create the required tables and types

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
    peak_hour TIMESTAMP WITH TIME ZONE,
    peak_hour_scans INTEGER DEFAULT 0,
    scans_per_hour NUMERIC DEFAULT 0,
    health_score NUMERIC DEFAULT 100,
    last_scan_at TIMESTAMP WITH TIME ZONE,
    uptime_percentage NUMERIC DEFAULT 100,
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(gate_id, event_id)
);

-- Gate bindings table (category enforcement)
CREATE TABLE IF NOT EXISTS gate_bindings (
    gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    bound_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status = ANY (ARRAY['probation'::TEXT, 'enforced'::TEXT, 'unbound'::TEXT])),
    sample_count INTEGER DEFAULT 0,
    confidence NUMERIC DEFAULT 0,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,

    PRIMARY KEY (gate_id, category)
);

-- Gate merge suggestions table
CREATE TABLE IF NOT EXISTS gate_merge_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    primary_gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    secondary_gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    confidence_score NUMERIC NOT NULL,
    reasoning TEXT NOT NULL,
    distance_meters NUMERIC,
    traffic_similarity NUMERIC,
    status TEXT DEFAULT 'pending'::TEXT CHECK (status = ANY (ARRAY['pending'::TEXT, 'approved'::TEXT, 'rejected'::TEXT, 'auto_applied'::TEXT])),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    suggested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(event_id, primary_gate_id, secondary_gate_id)
);

-- Adaptive thresholds per event
CREATE TABLE IF NOT EXISTS adaptive_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    duplicate_distance_meters INTEGER DEFAULT 25,
    promotion_sample_size INTEGER DEFAULT 100,
    confidence_threshold NUMERIC DEFAULT 0.85,
    velocity_threshold_ms INTEGER DEFAULT 5000,
    last_optimization_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    optimization_history JSONB DEFAULT '[]'::JSONB,
    performance_improvement NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gate WiFi networks (for fingerprinting)
CREATE TABLE IF NOT EXISTS gate_wifi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    ssid TEXT NOT NULL
);

-- BLE beacons for gates
CREATE TABLE IF NOT EXISTS beacons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID REFERENCES gates(id) ON DELETE CASCADE,
    beacon_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gate geofences (polygon boundaries)
CREATE TABLE IF NOT EXISTS gate_geofences (
    gate_id UUID NOT NULL PRIMARY KEY REFERENCES gates(id) ON DELETE CASCADE,
    geojson JSONB
);

-- Autonomous gates (AI-managed gates)
CREATE TABLE IF NOT EXISTS autonomous_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_id UUID NOT NULL UNIQUE REFERENCES gates(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'learning'::TEXT CHECK (status = ANY (ARRAY['active'::TEXT, 'learning'::TEXT, 'optimizing'::TEXT, 'maintenance'::TEXT, 'paused'::TEXT])),
    confidence_score NUMERIC DEFAULT 0.5,
    confidence_history JSONB DEFAULT '[]'::JSONB,
    decisions_count INTEGER DEFAULT 0,
    decisions_today INTEGER DEFAULT 0,
    accuracy_rate NUMERIC DEFAULT 0,
    last_decision_at TIMESTAMP WITH TIME ZONE,
    last_decision_type TEXT,
    avg_response_time_ms INTEGER DEFAULT 0,
    total_processed INTEGER DEFAULT 0,
    success_rate NUMERIC DEFAULT 1.0,
    learning_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_optimization_at TIMESTAMP WITH TIME ZONE,
    optimization_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default adaptive thresholds for existing events
INSERT INTO adaptive_thresholds (event_id)
SELECT id FROM events
WHERE id NOT IN (SELECT COALESCE(event_id, '00000000-0000-0000-0000-000000000000'::UUID) FROM adaptive_thresholds WHERE event_id IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_event_id ON gate_performance_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_gate_id ON gate_performance_cache(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_event_id ON gate_bindings(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_gate_id ON gate_bindings(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_category ON gate_bindings(category);
CREATE INDEX IF NOT EXISTS idx_gate_merge_suggestions_event_id ON gate_merge_suggestions(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_merge_suggestions_status ON gate_merge_suggestions(status);

-- Enable RLS
ALTER TABLE gate_performance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_merge_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_wifi ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
