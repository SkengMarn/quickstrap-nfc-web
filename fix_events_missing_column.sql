-- Fix missing is_active column in events table

-- ==============================================
-- STEP 1: Add missing is_active column to events table
-- ==============================================

-- Add the missing column that some components are trying to query
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- ==============================================
-- STEP 2: Update existing events to have proper is_active values
-- ==============================================

-- Set is_active based on lifecycle_status and dates
-- Run for all rows to ensure lifecycle-based values are correct
UPDATE public.events
SET is_active = CASE
    WHEN lifecycle_status = 'active' THEN true
    WHEN lifecycle_status = 'completed' OR lifecycle_status = 'archived' THEN false
    WHEN end_date < NOW() THEN false
    ELSE true
END;

-- ==============================================
-- STEP 3: Create index for performance
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_events_is_active ON public.events(is_active);

-- ==============================================
-- STEP 4: Update RLS policies to include is_active checks if needed
-- ==============================================

-- The existing policies should work fine with the new column
-- No changes needed to RLS policies
