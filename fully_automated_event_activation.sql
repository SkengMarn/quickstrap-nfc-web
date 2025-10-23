-- FULLY AUTOMATED EVENT ACTIVATION SYSTEM
-- This system automatically activates events when their scheduled time is reached
-- No external cron jobs or manual intervention required!

-- Enhanced function that activates events and handles all edge cases
CREATE OR REPLACE FUNCTION auto_activate_scheduled_events()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    event_record RECORD;
    activated_count INTEGER := 0;
BEGIN
    -- Find and activate all events that should be active now
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
        
        -- Optional: Insert into an activation log table if you want to track this
        -- INSERT INTO event_activation_log (event_id, activated_at) VALUES (event_record.id, NOW());
    END LOOP;
    
    IF activated_count > 0 THEN
        RAISE NOTICE 'Total events auto-activated: %', activated_count;
    END IF;
END;
$$;

-- Enhanced trigger function that checks EVERY time an event is accessed
CREATE OR REPLACE FUNCTION trigger_auto_activate_on_access()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if ANY event needs activation whenever events table is accessed
    PERFORM auto_activate_scheduled_events();
    
    -- Return the original row (for SELECT) or NEW row (for INSERT/UPDATE)
    IF TG_OP = 'SELECT' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Create triggers that fire on ANY access to events table
DROP TRIGGER IF EXISTS auto_activate_on_select ON public.events;
DROP TRIGGER IF EXISTS auto_activate_on_update ON public.events;
DROP TRIGGER IF EXISTS auto_activate_on_insert ON public.events;

-- Trigger on SELECT (when events are viewed/queried)
CREATE TRIGGER auto_activate_on_select
    BEFORE SELECT ON public.events
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_activate_scheduled_events();

-- Trigger on UPDATE (when events are modified)
CREATE TRIGGER auto_activate_on_update
    BEFORE UPDATE ON public.events
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_activate_scheduled_events();

-- Trigger on INSERT (when new events are created)
CREATE TRIGGER auto_activate_on_insert
    AFTER INSERT ON public.events
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_activate_scheduled_events();

-- Function to check specific event activation (called from application)
CREATE OR REPLACE FUNCTION check_event_activation(event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    should_activate BOOLEAN := false;
    event_config JSONB;
BEGIN
    -- First run global activation check
    PERFORM auto_activate_scheduled_events();
    
    -- Then check if this specific event is now active
    SELECT config INTO event_config
    FROM public.events 
    WHERE id = event_id AND is_active = true;
    
    RETURN FOUND;
END;
$$;

-- Function that applications can call to ensure events are up-to-date
CREATE OR REPLACE FUNCTION refresh_event_activations()
RETURNS TABLE(
    total_checked INTEGER,
    newly_activated INTEGER,
    active_events INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_events INTEGER;
    activated_count INTEGER := 0;
    active_count INTEGER;
    before_count INTEGER;
BEGIN
    -- Count active events before
    SELECT COUNT(*) INTO before_count FROM public.events WHERE is_active = true;
    
    -- Run activation
    PERFORM auto_activate_scheduled_events();
    
    -- Count totals after
    SELECT COUNT(*) INTO total_events FROM public.events WHERE lifecycle_status != 'cancelled';
    SELECT COUNT(*) INTO active_count FROM public.events WHERE is_active = true;
    
    activated_count := active_count - before_count;
    
    RETURN QUERY SELECT total_events, activated_count, active_count;
END;
$$;

-- Create a view that automatically activates events when queried
CREATE OR REPLACE VIEW active_events AS
SELECT 
    id, name, description, location, start_date, end_date, 
    capacity, organization_id, created_by, created_at, updated_at,
    is_active, public, allow_unlinked_entry, ticket_linking_mode,
    has_series, lifecycle_status, config
FROM public.events 
WHERE is_active = true 
   OR (
       is_active = false 
       AND config ? 'activation'
       AND (config->'activation'->>'status') = 'scheduled'
       AND (config->'activation'->>'scheduled_time')::timestamptz <= NOW()
       AND lifecycle_status != 'cancelled'
   );

-- Grant permissions
GRANT EXECUTE ON FUNCTION auto_activate_scheduled_events() TO authenticated;
GRANT EXECUTE ON FUNCTION check_event_activation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_event_activations() TO authenticated;
GRANT SELECT ON active_events TO authenticated;

-- Usage Examples:
-- 1. Manual refresh (call from your app periodically): SELECT * FROM refresh_event_activations();
-- 2. Check specific event: SELECT check_event_activation('your-event-id');
-- 3. Get all active events (auto-activates): SELECT * FROM active_events;
-- 4. Regular event queries will auto-activate: SELECT * FROM events WHERE is_active = true;

RAISE NOTICE 'Fully automated event activation system installed successfully!';
RAISE NOTICE 'Events will now activate automatically when:';
RAISE NOTICE '1. Any query is made to the events table';
RAISE NOTICE '2. Events are updated or inserted';
RAISE NOTICE '3. The active_events view is queried';
RAISE NOTICE '4. refresh_event_activations() is called';
