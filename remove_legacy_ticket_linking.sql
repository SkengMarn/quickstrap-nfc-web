-- ============================================================================
-- REMOVE LEGACY TICKET LINKING COLUMN
-- Safe migration to eliminate conflicting columns
-- ============================================================================

BEGIN;

-- Step 1: Migrate any existing data from legacy column to new column
-- (In case some events were created with the old column)
UPDATE events 
SET ticket_linking_mode = CASE 
  WHEN requires_ticket_linking = true THEN 'required'
  WHEN requires_ticket_linking = false THEN 'disabled'
  ELSE ticket_linking_mode  -- Keep existing value if already set
END
WHERE requires_ticket_linking IS NOT NULL
  AND ticket_linking_mode = 'disabled';  -- Only update if still default

-- Step 2: Drop trigger/function that might reference the column
-- This prevents errors when dropping the column
DROP TRIGGER IF EXISTS update_updated_at_column ON events;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;

-- Step 3: Drop the legacy column
ALTER TABLE events DROP COLUMN IF EXISTS requires_ticket_linking;

-- Step 4: Recreate the updated_at trigger if the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE TRIGGER update_updated_at_column
      BEFORE UPDATE ON events
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Recreated update_updated_at_column trigger on events table';
  END IF;
END $$;

-- Step 5: Verify the remaining columns
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('ticket_linking_mode', 'allow_unlinked_entry', 'requires_ticket_linking')
ORDER BY column_name;

COMMIT;

-- ============================================================================
-- RESULT: Clean schema with only the new ticket linking system
-- ============================================================================
-- ticket_linking_mode: 'disabled' | 'optional' | 'required'
-- allow_unlinked_entry: true | false (only relevant for 'optional' mode)
-- ============================================================================
