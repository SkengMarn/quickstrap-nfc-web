-- Create event_series table for managing sub-events within a main event
CREATE TABLE IF NOT EXISTS public.event_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    sequence_number INTEGER,
    series_type TEXT NOT NULL DEFAULT 'standard' CHECK (series_type IN ('standard', 'knockout', 'group_stage', 'custom')),
    checkin_window_start_offset TEXT DEFAULT '2 hours',
    checkin_window_end_offset TEXT DEFAULT '1 hour',
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_series_main_event ON public.event_series(main_event_id);
CREATE INDEX IF NOT EXISTS idx_event_series_organization ON public.event_series(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_series_dates ON public.event_series(start_date, end_date);

-- Add RLS policies
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view series for events they have access to
CREATE POLICY "Users can view event series" ON public.event_series
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_series.main_event_id
            AND (
                e.is_public = true
                OR EXISTS (
                    SELECT 1 FROM public.event_access ea
                    WHERE ea.event_id = e.id
                    AND ea.user_id = auth.uid()
                    AND ea.is_active = true
                )
            )
        )
    );

-- Policy: Users with event access can create series
CREATE POLICY "Users can create event series" ON public.event_series
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.event_access ea
            JOIN public.events e ON e.id = ea.event_id
            WHERE ea.event_id = event_series.main_event_id
            AND ea.user_id = auth.uid()
            AND ea.is_active = true
            AND ea.access_level IN ('owner', 'admin')
        )
    );

-- Policy: Users with event access can update series
CREATE POLICY "Users can update event series" ON public.event_series
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.event_access ea
            WHERE ea.event_id = event_series.main_event_id
            AND ea.user_id = auth.uid()
            AND ea.is_active = true
            AND ea.access_level IN ('owner', 'admin')
        )
    );

-- Policy: Users with event access can delete series
CREATE POLICY "Users can delete event series" ON public.event_series
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.event_access ea
            WHERE ea.event_id = event_series.main_event_id
            AND ea.user_id = auth.uid()
            AND ea.is_active = true
            AND ea.access_level IN ('owner', 'admin')
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_event_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_series_updated_at
    BEFORE UPDATE ON public.event_series
    FOR EACH ROW
    EXECUTE FUNCTION update_event_series_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_series TO authenticated;

COMMENT ON TABLE public.event_series IS 'Sub-events within a main event (e.g., Day 1, Day 2, VIP Session)';
