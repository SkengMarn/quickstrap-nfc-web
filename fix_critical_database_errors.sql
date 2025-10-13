-- CRITICAL DATABASE FIXES - Run this immediately to resolve console errors

-- ==============================================
-- FIX 1: Infinite recursion in event_access table
-- ==============================================

-- Drop ALL existing event_access policies that cause recursion
DROP POLICY IF EXISTS "Users can view event access" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage event access" ON public.event_access;
DROP POLICY IF EXISTS "Event owners can manage access" ON public.event_access;
DROP POLICY IF EXISTS "Users can view their own access" ON public.event_access;
DROP POLICY IF EXISTS "Users can view their event access" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage their event access" ON public.event_access;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own access" ON public.event_access
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Event owners can view access" ON public.event_access
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Event owners can manage access" ON public.event_access
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events
            WHERE created_by = auth.uid()
        )
    )
    WITH CHECK (
        event_id IN (
            SELECT id FROM public.events
            WHERE created_by = auth.uid()
        )
    );

ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- FIX 2: Missing is_active column in events table
-- ==============================================

-- Add the missing column that components are trying to query
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Set proper values based on lifecycle_status and dates
-- Events are only active if they have started and not yet ended
UPDATE public.events
SET is_active = CASE
    WHEN start_date <= NOW() AND end_date >= NOW() THEN true
    ELSE false
END
WHERE is_active IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_events_is_active ON public.events(is_active);

-- ==============================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ==============================================

-- Uncomment these to verify the fixes worked:
-- SELECT COUNT(*) as total_events, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_events FROM public.events;
-- SELECT policy_name FROM information_schema.table_privileges WHERE table_name = 'event_access';
