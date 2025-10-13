-- Quick fix for infinite recursion in event_access RLS policies
-- Run this in Supabase SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view event access" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage event access" ON public.event_access;
DROP POLICY IF EXISTS "Event owners can manage access" ON public.event_access;

-- Create simple, non-recursive policies for event_access
CREATE POLICY "Users can view their own access" ON public.event_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Event creators can manage access" ON public.event_access
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Event admins can view access" ON public.event_access
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM public.events e
            WHERE e.created_by = auth.uid()
        )
        OR user_id = auth.uid()
    );
