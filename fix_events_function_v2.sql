-- Fix get_events_with_activation function to match actual schema
-- This fixes the error: column e.public does not exist

-- Drop and recreate the function with correct columns matching the actual schema
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
    lifecycle_status lifecycle_status,
    config JSONB,
    ticket_linking_mode TEXT,
    allow_unlinked_entry BOOLEAN,
    is_public BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return all events with only columns that actually exist in the schema
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
        e.lifecycle_status,
        e.config,
        e.ticket_linking_mode,
        e.allow_unlinked_entry,
        e.is_public
    FROM public.events e
    ORDER BY e.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_events_with_activation() TO authenticated;

COMMENT ON FUNCTION get_events_with_activation() IS 'Returns all events. Only includes columns that exist in the events table.';
