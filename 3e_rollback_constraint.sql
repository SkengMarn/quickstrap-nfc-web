-- ============================================
-- ROLLBACK SCRIPT (Use only if you need to revert)
-- Purpose: Remove the foreign key constraint to return to previous state
-- ============================================

BEGIN;

-- Remove the foreign key constraint
ALTER TABLE public.ticket_link_audit
  DROP CONSTRAINT IF EXISTS ticket_link_audit_ticket_id_fkey;

-- Verify removal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_link_audit_ticket_id_fkey'
      AND table_name = 'ticket_link_audit'
  ) THEN
    RAISE NOTICE '✓ Rollback complete. Constraint removed successfully.';
  ELSE
    RAISE EXCEPTION 'Failed to remove constraint.';
  END IF;
END $$;

COMMIT;

-- WARNING: After rollback, tickets can be deleted even if audit entries reference them
-- This weakens referential integrity but may be needed for troubleshooting
