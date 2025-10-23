-- Fix missing columns in gate_bindings table
-- Run this before running 03_enhanced_gate_discovery_v2.sql

-- Add missing columns to gate_bindings table
DO $$
BEGIN
    -- Add violation_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'gate_bindings' AND column_name = 'violation_count') THEN
        ALTER TABLE gate_bindings 
        ADD COLUMN violation_count INTEGER DEFAULT 0;
    END IF;

    -- Add last_violation_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'gate_bindings' AND column_name = 'last_violation_at') THEN
        ALTER TABLE gate_bindings 
        ADD COLUMN last_violation_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add id column if it doesn't exist (for primary key)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'gate_bindings' AND column_name = 'id') THEN
        ALTER TABLE gate_bindings 
        ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'gate_bindings' AND column_name = 'created_at') THEN
        ALTER TABLE gate_bindings 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'gate_bindings' AND column_name = 'updated_at') THEN
        ALTER TABLE gate_bindings 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add event_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'gate_bindings' AND column_name = 'event_id') THEN
        ALTER TABLE gate_bindings 
        ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update existing records to have proper event_id if missing
UPDATE gate_bindings 
SET event_id = (
    SELECT g.event_id 
    FROM gates g 
    WHERE g.id = gate_bindings.gate_id
)
WHERE event_id IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'gate_bindings'
ORDER BY ordinal_position;
