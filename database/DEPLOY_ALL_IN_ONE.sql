-- ========================================================================
-- 🚀 COMPLETE GATE DISCOVERY SYSTEM v2.0 - ALL-IN-ONE DEPLOYMENT
-- ========================================================================
-- Copy this ENTIRE file and paste into Supabase SQL Editor
-- Then click "Run" - that's it!
-- ========================================================================

-- ========================================================================
-- MIGRATION 1: TABLES AND TYPES
-- ========================================================================

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

-- Insert default adaptive thresholds for existing events
INSERT INTO adaptive_thresholds (event_id)
SELECT id FROM events
WHERE id NOT IN (SELECT event_id FROM adaptive_thresholds)
ON CONFLICT (event_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_event_id ON gate_performance_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_gate_id ON gate_performance_cache(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_event_id ON gate_bindings(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_gate_id ON gate_bindings(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_category ON gate_bindings(category);
CREATE INDEX IF NOT EXISTS idx_gate_merge_suggestions_event_id ON gate_merge_suggestions(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_merge_suggestions_status ON gate_merge_suggestions(status);

RAISE NOTICE '✅ Step 1/3: Tables created successfully';
