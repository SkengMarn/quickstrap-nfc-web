-- Fix Missing Database Functions for Event Activation
-- This creates the functions that the frontend is trying to call

-- Function that the frontend is calling: refresh_event_activations
CREATE OR REPLACE FUNCTION refresh_event_activations()
RETURNS TABLE(
    total_checked INTEGER,
    newly_activated INTEGER,
    active_events INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_events INTEGER;
    activated_count INTEGER := 0;
    active_count INTEGER;
    before_count INTEGER;
    event_record RECORD;
BEGIN
    -- Count active events before
    SELECT COUNT(*) INTO before_count FROM public.events WHERE is_active = true;
    
    -- Count total events
    SELECT COUNT(*) INTO total_events FROM public.events WHERE lifecycle_status != 'cancelled';
    
    -- Find and activate scheduled events that are due
    FOR event_record IN
        SELECT id, name, config
        FROM public.events 
        WHERE 
            is_active = false
            AND config ? 'activation'
            AND (config->'activation'->>'status') = 'scheduled'
            AND (config->'activation'->>'scheduled_time')::timestamptz <= NOW()
            AND lifecycle_status != 'cancelled'
    LOOP
        -- Activate the event
        UPDATE public.events 
        SET 
            is_active = true,
            config = jsonb_set(
                config, 
                '{activation,status}', 
                '"active"'::jsonb
            ),
            updated_at = NOW()
        WHERE id = event_record.id;
        
        activated_count := activated_count + 1;
        
        -- Log the activation
        RAISE NOTICE 'Auto-activated event: % (ID: %)', event_record.name, event_record.id;
    END LOOP;
    
    -- Count active events after
    SELECT COUNT(*) INTO active_count FROM public.events WHERE is_active = true;
    
    -- Return the results
    RETURN QUERY SELECT total_events, activated_count, active_count;
END;
$$;

-- Function to check if a specific event should be activated
CREATE OR REPLACE FUNCTION check_event_activation(event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_config JSONB;
    should_activate BOOLEAN := false;
    scheduled_time TIMESTAMPTZ;
BEGIN
    -- Get event config
    SELECT config INTO event_config
    FROM public.events 
    WHERE id = event_id;
    
    -- Check if event exists
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Check if event should be activated
    IF event_config ? 'activation' 
       AND (event_config->'activation'->>'status') = 'scheduled' THEN
        
        scheduled_time := (event_config->'activation'->>'scheduled_time')::timestamptz;
        
        IF scheduled_time <= NOW() THEN
            -- Activate the event
            UPDATE public.events 
            SET 
                is_active = true,
                config = jsonb_set(
                    config, 
                    '{activation,status}', 
                    '"active"'::jsonb
                ),
                updated_at = NOW()
            WHERE id = event_id;
            
            RETURN true;
        END IF;
    END IF;
    
    -- Check if event is already active
    SELECT is_active INTO should_activate
    FROM public.events 
    WHERE id = event_id;
    
    RETURN COALESCE(should_activate, false);
END;
$$;

-- Function to get events with automatic activation
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
    config JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First, refresh activations
    PERFORM refresh_event_activations();
    
    -- Then return all events with only columns that exist
    RETURN QUERY 
    SELECT 
        e.id, e.name, e.description, e.location, e.start_date, e.end_date,
        e.capacity, e.organization_id, e.created_by, e.created_at, e.updated_at,
        e.is_active, e.lifecycle_status, e.config
    FROM public.events e
    ORDER BY e.created_at DESC;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION refresh_event_activations() TO authenticated;
GRANT EXECUTE ON FUNCTION check_event_activation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_events_with_activation() TO authenticated;

-- Create a view that shows event status clearly
CREATE OR REPLACE VIEW events_with_status AS
SELECT 
    e.*,
    CASE 
        WHEN e.is_active = true THEN 'active'
        WHEN e.config ? 'activation' AND (e.config->'activation'->>'status') = 'scheduled' THEN 'scheduled'
        ELSE 'draft'
    END as current_status,
    CASE 
        WHEN e.config ? 'activation' AND e.config->'activation' ? 'scheduled_time' 
        THEN (e.config->'activation'->>'scheduled_time')::timestamptz
        ELSE NULL
    END as scheduled_activation_time
FROM public.events e;

GRANT SELECT ON events_with_status TO authenticated;

-- Success messages
DO $$
BEGIN
    RAISE NOTICE 'Missing database functions created successfully!';
    RAISE NOTICE 'Frontend errors should now be resolved.';
END $$;
