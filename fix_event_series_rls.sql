-- Fix event_series RLS policies to allow event creators to manage series
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create event series" ON public.event_series;
DROP POLICY IF EXISTS "Users can update event series" ON public.event_series;
DROP POLICY IF EXISTS "Users can delete event series" ON public.event_series;

-- Policy: Event creators and users with admin/owner access can create series
CREATE POLICY "Users can create event series" ON public.event_series
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_series.main_event_id
            AND (
                -- Event creator can create series
                e.created_by = auth.uid()
                OR
                -- Users with admin/owner access can create series
                EXISTS (
                    SELECT 1 FROM public.event_access ea
                    WHERE ea.event_id = e.id
                    AND ea.user_id = auth.uid()
                    AND ea.is_active = true
                    AND ea.access_level IN ('owner', 'admin')
                )
            )
        )
    );

-- Policy: Event creators and users with admin/owner access can update series
CREATE POLICY "Users can update event series" ON public.event_series
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_series.main_event_id
            AND (
                -- Event creator can update series
                e.created_by = auth.uid()
                OR
                -- Users with admin/owner access can update series
                EXISTS (
                    SELECT 1 FROM public.event_access ea
                    WHERE ea.event_id = e.id
                    AND ea.user_id = auth.uid()
                    AND ea.is_active = true
                    AND ea.access_level IN ('owner', 'admin')
                )
            )
        )
    );

-- Policy: Event creators and users with admin/owner access can delete series
CREATE POLICY "Users can delete event series" ON public.event_series
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_series.main_event_id
            AND (
                -- Event creator can delete series
                e.created_by = auth.uid()
                OR
                -- Users with admin/owner access can delete series
                EXISTS (
                    SELECT 1 FROM public.event_access ea
                    WHERE ea.event_id = e.id
                    AND ea.user_id = auth.uid()
                    AND ea.is_active = true
                    AND ea.access_level IN ('owner', 'admin')
                )
            )
        )
    );

COMMENT ON POLICY "Users can create event series" ON public.event_series IS 
'Event creators and users with admin/owner access can create series for their events';
