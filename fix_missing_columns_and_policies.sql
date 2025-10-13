-- Fix missing columns and RLS policies using EXISTING schema

-- ==============================================
-- FIX 1: Add missing is_active column to event_access
-- ==============================================

-- Looking at your schema, event_access table exists but missing is_active column
ALTER TABLE public.event_access 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- ==============================================
-- FIX 2: Add RLS policies for event_category_limits
-- ==============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view category limits" ON public.event_category_limits;
DROP POLICY IF EXISTS "Users can manage category limits" ON public.event_category_limits;

-- Create simple RLS policies for event_category_limits
CREATE POLICY "Users can view category limits" ON public.event_category_limits
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage category limits" ON public.event_category_limits
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

-- Enable RLS if not already enabled
ALTER TABLE public.event_category_limits ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- FIX 3: Add RLS policies for other existing tables
-- ==============================================

-- Enable RLS on tables that might not have it enabled
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_wristband_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_logs ENABLE ROW LEVEL SECURITY;

-- Fix tickets table policies if missing
DROP POLICY IF EXISTS "Users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can manage tickets" ON public.tickets;

CREATE POLICY "Users can view tickets" ON public.tickets
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage tickets" ON public.tickets
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

-- Fix ticket_wristband_links policies if missing
DROP POLICY IF EXISTS "Users can view ticket links" ON public.ticket_wristband_links;
DROP POLICY IF EXISTS "Users can manage ticket links" ON public.ticket_wristband_links;

CREATE POLICY "Users can view ticket links" ON public.ticket_wristband_links
    FOR SELECT USING (
        ticket_id IN (
            SELECT t.id FROM public.tickets t
            INNER JOIN public.events e ON e.id = t.event_id
            WHERE e.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage ticket links" ON public.ticket_wristband_links
    FOR ALL USING (
        ticket_id IN (
            SELECT t.id FROM public.tickets t
            INNER JOIN public.events e ON e.id = t.event_id
            WHERE e.created_by = auth.uid()
        )
    );

-- Fix checkin_logs policies if missing
DROP POLICY IF EXISTS "Users can view checkin logs" ON public.checkin_logs;
DROP POLICY IF EXISTS "Users can manage checkin logs" ON public.checkin_logs;

CREATE POLICY "Users can view checkin logs" ON public.checkin_logs
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage checkin logs" ON public.checkin_logs
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );
