-- =====================================================
-- SERIES-AWARE SYSTEM MIGRATION
-- =====================================================
-- This migration adds series_id columns to tickets, wristbands, and checkin_logs
-- to enable full series-aware functionality across the system.
--
-- IMPORTANT: Run this migration in your Supabase SQL Editor
-- =====================================================

-- 1. Add series_id to tickets table
-- =====================================================
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES event_series(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tickets_series_id ON tickets(series_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_series ON tickets(event_id, series_id);

COMMENT ON COLUMN tickets.series_id IS 'References event_series.id - if set, ticket belongs to specific series; if NULL, belongs to parent event';


-- 2. Add series_id to wristbands table (if not exists)
-- =====================================================
ALTER TABLE wristbands
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES event_series(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_wristbands_series_id ON wristbands(series_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_event_series ON wristbands(event_id, series_id);

COMMENT ON COLUMN wristbands.series_id IS 'References event_series.id - if set, wristband belongs to specific series; if NULL, belongs to parent event';


-- 3. Add series_id to checkin_logs table (if not exists)
-- =====================================================
ALTER TABLE checkin_logs
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES event_series(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_checkin_logs_series_id ON checkin_logs(series_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_event_series ON checkin_logs(event_id, series_id);

COMMENT ON COLUMN checkin_logs.series_id IS 'References event_series.id - if set, check-in belongs to specific series; if NULL, belongs to parent event';


-- 4. Add series_id to gates table (if not exists)
-- =====================================================
ALTER TABLE gates
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES event_series(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_gates_series_id ON gates(series_id);
CREATE INDEX IF NOT EXISTS idx_gates_event_series ON gates(event_id, series_id);

COMMENT ON COLUMN gates.series_id IS 'References event_series.id - if set, gate is specific to series; if NULL, gate is shared across all series';


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration was successful:

-- Check tickets table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tickets'
  AND column_name = 'series_id';

-- Check wristbands table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'wristbands'
  AND column_name = 'series_id';

-- Check checkin_logs table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'checkin_logs'
  AND column_name = 'series_id';

-- Check gates table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'gates'
  AND column_name = 'series_id';


-- =====================================================
-- OPTIONAL: Update RLS Policies
-- =====================================================
-- Uncomment and adjust these if you need to update RLS policies
-- to account for series_id access control

/*
-- Example: Update tickets RLS policy
DROP POLICY IF EXISTS tickets_select_policy ON tickets;
CREATE POLICY tickets_select_policy ON tickets
  FOR SELECT
  USING (
    -- Can access if user has access to the parent event
    event_id IN (
      SELECT event_id FROM event_access WHERE user_id = auth.uid()
    )
    OR
    -- Can access if user has access to the series' parent event
    series_id IN (
      SELECT id FROM event_series WHERE main_event_id IN (
        SELECT event_id FROM event_access WHERE user_id = auth.uid()
      )
    )
  );

-- Similar policies for wristbands, checkin_logs, and gates
-- Adjust based on your security requirements
*/
