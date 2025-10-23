-- Add config column to events table for EventCreationWizard
-- This fixes the error: "Could not find the 'config' column of 'events' in the schema cache"

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Create index for better performance on config queries
CREATE INDEX IF NOT EXISTS idx_events_config ON events USING gin(config);

-- Add comment for documentation
COMMENT ON COLUMN events.config IS 'JSONB config containing: security_mode, gate_settings, capacity_settings, checkin_window, etc.';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'config';
