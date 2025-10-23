-- Fix get_events_with_activation function to remove references to non-existent columns
-- This fixes the error: column e.public does not exist

-- Drop and recreate the function with correct columns only
DROP FUNCTION IF EXISTS get_events_with_activation();

CREATE OR REPLACE FUNCTION get_events_with_activation()
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    location TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    capacity INTEGER,
    organization_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_active BOOLEAN,
    lifecycle_status TEXT,
    config JSONB,
    ticket_linking_mode TEXT,
    allow_unlinked_entry BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First, refresh activations if the function exists
    BEGIN
        PERFORM refresh_event_activations();
    EXCEPTION WHEN undefined_function THEN
        -- Function doesn't exist, skip
        NULL;
    END;
    
    -- Return all events with only columns that actually exist
    RETURN QUERY 
    SELECT 
        e.id,
        e.name,
        e.description,
        e.location,
        e.start_date,
        e.end_date,
        e.capacity,
        e.organization_id,
        e.created_by,
        e.created_at,
        e.updated_at,
        e.is_active,
        e.lifecycle_status::TEXT,
        e.config,
        COALESCE(e.ticket_linking_mode, 'disabled') as ticket_linking_mode,
        COALESCE(e.allow_unlinked_entry, true) as allow_unlinked_entry
    FROM public.events e
    ORDER BY e.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_events_with_activation() TO authenticated;

-- Also fix the events_with_status view if it exists
DROP VIEW IF EXISTS events_with_status CASCADE;

CREATE OR REPLACE VIEW events_with_status AS
SELECT 
    e.id,
    e.name,
    e.description,
    e.location,
    e.start_date,
    e.end_date,
    e.capacity,
    e.organization_id,
    e.created_by,
    e.created_at,
    e.updated_at,
    e.is_active,
    e.lifecycle_status,
    e.config,
    e.ticket_linking_mode,
    e.allow_unlinked_entry,
    CASE 
        WHEN e.is_active = true THEN 'active'
        WHEN e.config ? 'activation' AND (e.config->'activation'->>'status') = 'scheduled' THEN 'scheduled'
        ELSE 'draft'
    END as status_label,
    CASE 
        WHEN e.config ? 'activation' AND (e.config->'activation'->>'scheduled_time') IS NOT NULL 
        THEN (e.config->'activation'->>'scheduled_time')::TIMESTAMPTZ
        ELSE NULL
    END as scheduled_activation_time
FROM public.events e;

-- Grant access to the view
GRANT SELECT ON events_with_status TO authenticated;

COMMENT ON FUNCTION get_events_with_activation() IS 'Returns all events with automatic activation refresh. Only includes columns that exist in the events table.';
COMMENT ON VIEW events_with_status IS 'View showing events with computed status labels and scheduled activation times.';
