-- ============================================================================
-- STEP 3E: MISSING TABLES & CONSTRAINTS
-- ============================================================================
-- Run this AFTER 3d_templates_telegram_final.sql
-- Adds event_clones table and missing foreign key constraint
-- Execution time: ~30 seconds
-- ============================================================================

BEGIN;

-- ============================================================================
-- EVENT CLONES TABLE
-- ============================================================================

CREATE TABLE public.event_clones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_event_id uuid NOT NULL,
  cloned_event_id uuid NOT NULL,
  cloned_by uuid,
  clone_settings jsonb DEFAULT '{}'::jsonb,
  cloned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_clones_pkey PRIMARY KEY (id),
  CONSTRAINT event_clones_original_event_id_fkey FOREIGN KEY (original_event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_clones_cloned_event_id_fkey FOREIGN KEY (cloned_event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_clones_cloned_by_fkey FOREIGN KEY (cloned_by) REFERENCES auth.users(id)
);

COMMIT;

-- ============================================================================
-- MISSING FOREIGN KEY CONSTRAINT
-- Purpose: Add missing ticket_id foreign key to ticket_link_audit
-- This ensures audit trail integrity and prevents orphaned ticket references
-- ============================================================================

BEGIN;

-- Step 1: Check for any existing orphaned records before adding constraint
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM public.ticket_link_audit tla
  WHERE tla.ticket_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.tickets t WHERE t.id = tla.ticket_id
    );
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % orphaned ticket_id references in ticket_link_audit', orphaned_count;
    RAISE NOTICE 'You may want to clean these up before adding the constraint';
  ELSE
    RAISE NOTICE 'Good news! No orphaned ticket references found. Safe to proceed.';
  END IF;
END $$;

-- Step 2: Add the missing foreign key constraint
ALTER TABLE public.ticket_link_audit
  ADD CONSTRAINT ticket_link_audit_ticket_id_fkey 
  FOREIGN KEY (ticket_id) 
  REFERENCES public.tickets(id)
  ON DELETE CASCADE;

-- Step 3: Verify the constraint was added successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'ticket_link_audit_ticket_id_fkey'
      AND table_name = 'ticket_link_audit'
  ) THEN
    RAISE NOTICE '✓ Success! Foreign key constraint added successfully';
  ELSE
    RAISE EXCEPTION 'Failed to add constraint. Please check for data issues.';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Final Verification
-- ============================================================================

-- Count total tables
SELECT 'Total tables: ' || COUNT(*)::text as status
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show 61 tables now (60 + event_clones)

-- Verify ticket_link_audit constraints
SELECT 
  'Constraint verification:' as info,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'ticket_link_audit'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;

-- Expected output should include:
-- ✓ ticket_link_audit_event_id_fkey → events(id)
-- ✓ ticket_link_audit_ticket_id_fkey → tickets(id)  ← NEW
-- ✓ ticket_link_audit_performed_by_fkey → auth.users(id)
-- ✓ ticket_link_audit_wristband_id_fkey → wristbands(id)
