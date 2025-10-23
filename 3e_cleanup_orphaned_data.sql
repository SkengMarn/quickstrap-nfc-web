-- ============================================
-- PRE-MIGRATION DATA CLEANUP (OPTIONAL)
-- Purpose: Clean up orphaned ticket references before adding constraint
-- Run this ONLY if the migration script reports orphaned records
-- ============================================

BEGIN;

-- Option 1: Find and review orphaned records
-- (Don't delete yet - just investigate)
SELECT 
  tla.id,
  tla.ticket_id,
  tla.wristband_id,
  tla.action,
  tla.timestamp,
  tla.performed_by
FROM public.ticket_link_audit tla
WHERE tla.ticket_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = tla.ticket_id
  )
ORDER BY tla.timestamp DESC;

-- Option 2: Set orphaned ticket_ids to NULL
-- (Keeps the audit entry but removes the broken reference)
/*
UPDATE public.ticket_link_audit
SET ticket_id = NULL
WHERE ticket_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
  );
*/

-- Option 3: Delete orphaned audit entries entirely
-- (Use with caution - you'll lose audit history)
/*
DELETE FROM public.ticket_link_audit
WHERE ticket_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = ticket_id
  );
*/

ROLLBACK; -- Prevent accidental execution

-- ============================================
-- INSTRUCTIONS:
-- 1. Run Option 1 first to see what orphaned records exist
-- 2. Decide if you want to keep them (set to NULL) or delete them
-- 3. Uncomment your chosen option (2 or 3)
-- 4. Change ROLLBACK to COMMIT
-- 5. Then run the main migration script (3e_missing_tables_constraints.sql)
-- ============================================
