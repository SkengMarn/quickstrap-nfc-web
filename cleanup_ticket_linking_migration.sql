-- ============================================================================
-- CLEANUP AFTER RUNNING BOTH MIGRATIONS
-- This fixes any issues from running both conflicting migrations
-- ============================================================================

BEGIN;

-- Step 1: Drop the trigger and function that expect the removed column
DROP TRIGGER IF EXISTS sync_ticket_linking ON events;
DROP FUNCTION IF EXISTS sync_ticket_linking_columns();

-- Step 2: Verify the current schema state
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND column_name IN ('ticket_linking_mode', 'allow_unlinked_entry', 'requires_ticket_linking')
ORDER BY column_name;

-- Step 3: Ensure we have the correct columns and constraints
-- (This should show only ticket_linking_mode and allow_unlinked_entry)

COMMIT;

-- ============================================================================
-- RESULT: Clean state with only the new ticket linking system
-- ============================================================================
-- ✅ ticket_linking_mode: 'disabled' | 'optional' | 'required'
-- ✅ allow_unlinked_entry: true | false
-- ❌ requires_ticket_linking: REMOVED (no longer exists)
-- ❌ sync trigger: REMOVED (no longer needed)
-- ============================================================================
