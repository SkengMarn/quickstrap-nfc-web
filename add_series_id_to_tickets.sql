-- Add series_id column to tickets table for series-aware ticket management
-- This allows tickets to be associated with either a parent event or a specific series

-- Add series_id column to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES event_series(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tickets_series_id ON tickets(series_id);

-- Add comment explaining the column
COMMENT ON COLUMN tickets.series_id IS 'References event_series.id - if set, this ticket belongs to a specific series; if NULL, ticket belongs to parent event only';

-- Update RLS policies if needed (tickets should be accessible based on event_id OR series_id)
-- Note: Adjust these policies based on your existing RLS setup

-- Example: Allow users with event access to see tickets for that event or its series
-- DROP POLICY IF EXISTS tickets_select_policy ON tickets;
-- CREATE POLICY tickets_select_policy ON tickets
--   FOR SELECT
--   USING (
--     event_id IN (
--       SELECT event_id FROM event_access WHERE user_id = auth.uid()
--     )
--     OR
--     series_id IN (
--       SELECT id FROM event_series WHERE main_event_id IN (
--         SELECT event_id FROM event_access WHERE user_id = auth.uid()
--       )
--     )
--   );
