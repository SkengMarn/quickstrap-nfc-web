-- Fix multiple schema errors found in console logs
-- Run this AFTER fixing the organization infinite recursion

BEGIN;

-- ============================================================================
-- FIX 1: Add missing columns to gates table
-- ============================================================================

-- Add health_score column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gates' AND column_name = 'health_score'
  ) THEN
    ALTER TABLE gates ADD COLUMN health_score DECIMAL(5,2) DEFAULT 100.0;
    RAISE NOTICE 'Added health_score column to gates table';
  END IF;
END $$;

-- Fix location column names if they're wrong
DO $$ 
BEGIN
  -- Check if the typo column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gates' AND column_name = 'location_lataslatitude'
  ) THEN
    -- Rename the typo column
    ALTER TABLE gates RENAME COLUMN location_lataslatitude TO location_lat;
    RAISE NOTICE 'Fixed location_lataslatitude typo to location_lat';
  END IF;
  
  -- Add location_lng if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gates' AND column_name = 'location_lng'
  ) THEN
    ALTER TABLE gates ADD COLUMN location_lng DECIMAL(10,7);
    RAISE NOTICE 'Added location_lng column to gates table';
  END IF;
END $$;

-- ============================================================================
-- FIX 2: Create system_alerts table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info', -- info, warning, error, critical
  title VARCHAR(255) NOT NULL,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, acknowledged, resolved
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for system_alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_event_id ON system_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at DESC);

-- Enable RLS on system_alerts
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_alerts
DROP POLICY IF EXISTS "system_alerts_select" ON system_alerts;
CREATE POLICY "system_alerts_select"
ON system_alerts
FOR SELECT
TO authenticated
USING (
  -- Users can see alerts for events they have access to
  event_id IN (
    SELECT event_id 
    FROM event_access 
    WHERE user_id = auth.uid()
  )
  OR
  -- Or global alerts (no event_id)
  event_id IS NULL
);

DROP POLICY IF EXISTS "system_alerts_insert" ON system_alerts;
CREATE POLICY "system_alerts_insert"
ON system_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only admins can create alerts
  EXISTS (
    SELECT 1 
    FROM event_access 
    WHERE event_id = system_alerts.event_id 
      AND user_id = auth.uid() 
      AND access_level IN ('admin', 'owner')
  )
);

DROP POLICY IF EXISTS "system_alerts_update" ON system_alerts;
CREATE POLICY "system_alerts_update"
ON system_alerts
FOR UPDATE
TO authenticated
USING (
  -- Admins can update, or users can acknowledge
  EXISTS (
    SELECT 1 
    FROM event_access 
    WHERE event_id = system_alerts.event_id 
      AND user_id = auth.uid()
  )
);

-- ============================================================================
-- FIX 3: Verify checkin_logs has created_at (not timestamp)
-- ============================================================================

DO $$ 
BEGIN
  -- Check if timestamp column exists (wrong name)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkin_logs' AND column_name = 'timestamp'
  ) THEN
    -- Rename to created_at
    ALTER TABLE checkin_logs RENAME COLUMN timestamp TO created_at;
    RAISE NOTICE 'Renamed checkin_logs.timestamp to created_at';
  END IF;
  
  -- Ensure created_at exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'checkin_logs' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE checkin_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to checkin_logs table';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check gates columns
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'gates' 
  AND column_name IN ('health_score', 'location_lat', 'location_lng')
ORDER BY column_name;

-- Check system_alerts table exists
SELECT 
  table_name,
  (SELECT COUNT(*) FROM system_alerts) as row_count
FROM information_schema.tables 
WHERE table_name = 'system_alerts';

-- Check checkin_logs has created_at
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'checkin_logs' 
  AND column_name = 'created_at';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SCHEMA FIXES COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Gates table: health_score, location_lat, location_lng';
  RAISE NOTICE '✅ System alerts table created with RLS policies';
  RAISE NOTICE '✅ Checkin logs: created_at column verified';
  RAISE NOTICE '========================================';
END $$;
