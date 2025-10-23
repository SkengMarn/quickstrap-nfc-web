-- PRODUCTION-READY EVENT ACTIVATION WITH pg_cron
-- This is the BEST approach for automatic event activation!

-- Step 1: Enable pg_cron extension (requires superuser privileges)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Create the activation function
CREATE OR REPLACE FUNCTION auto_activate_scheduled_events()
RETURNS TABLE(
    activated_count INTEGER,
    activation_details TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    event_record RECORD;
    activated_count INTEGER := 0;
    details TEXT[] := ARRAY[]::TEXT[];
    scheduled_time TIMESTAMPTZ;
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
        scheduled_time := (event_record.config->'activation'->>'scheduled_time')::timestamptz;
        
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
        
        -- Add to details array
        details := array_append(details, 
            format('Event "%s" (ID: %s) activated - was scheduled for %s', 
                event_record.name, 
                event_record.id, 
                scheduled_time::TEXT
            )
        );
        
        -- Log the activation
        RAISE NOTICE 'Auto-activated event: % (ID: %) - was scheduled for %', 
            event_record.name, event_record.id, scheduled_time;
    END LOOP;
    
    IF activated_count > 0 THEN
        RAISE NOTICE 'Total events auto-activated: %', activated_count;
    ELSE
        RAISE NOTICE 'No events needed activation at %', NOW();
    END IF;
    
    RETURN QUERY SELECT activated_count, details;
END;
$$;

-- Step 3: Create activation log table for tracking
CREATE TABLE IF NOT EXISTS event_activation_log (
    id SERIAL PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    activation_delay INTERVAL GENERATED ALWAYS AS (activated_at - scheduled_time) STORED
);

-- Step 4: Enhanced function with comprehensive logging
CREATE OR REPLACE FUNCTION auto_activate_with_logging()
RETURNS TABLE(
    activated_count INTEGER,
    total_scheduled INTEGER,
    next_activation TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    event_record RECORD;
    activated_count INTEGER := 0;
    total_scheduled INTEGER := 0;
    next_activation TIMESTAMPTZ;
    scheduled_time TIMESTAMPTZ;
BEGIN
    -- Count total scheduled events
    SELECT COUNT(*) INTO total_scheduled
    FROM public.events 
    WHERE 
        is_active = false
        AND config ? 'activation'
        AND (config->'activation'->>'status') = 'scheduled'
        AND lifecycle_status != 'cancelled';
    
    -- Find next activation time
    SELECT MIN((config->'activation'->>'scheduled_time')::timestamptz) INTO next_activation
    FROM public.events 
    WHERE 
        is_active = false
        AND config ? 'activation'
        AND (config->'activation'->>'status') = 'scheduled'
        AND (config->'activation'->>'scheduled_time')::timestamptz > NOW()
        AND lifecycle_status != 'cancelled';
    
    -- Activate due events
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
        scheduled_time := (event_record.config->'activation'->>'scheduled_time')::timestamptz;
        
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
        
        -- Log to activation table
        INSERT INTO event_activation_log (event_id, event_name, scheduled_time)
        VALUES (event_record.id, event_record.name, scheduled_time);
        
        activated_count := activated_count + 1;
        
        RAISE NOTICE 'Auto-activated: % (scheduled: %, delay: %)', 
            event_record.name, 
            scheduled_time,
            NOW() - scheduled_time;
    END LOOP;
    
    -- Summary logging
    IF activated_count > 0 THEN
        RAISE NOTICE 'Activation Summary: % activated, % still scheduled, next at %', 
            activated_count, total_scheduled - activated_count, next_activation;
    END IF;
    
    RETURN QUERY SELECT activated_count, total_scheduled, next_activation;
END;
$$;

-- Step 5: Schedule the cron job (EVERY MINUTE)
SELECT cron.schedule(
    'auto-activate-events',
    '* * * * *',
    'SELECT auto_activate_with_logging();'
);

-- Step 6: Create monitoring views
CREATE OR REPLACE VIEW cron_job_status AS
SELECT 
    jobid,
    schedule,
    command,
    database,
    username,
    active,
    jobname,
    CASE 
        WHEN active THEN '✅ Running'
        ELSE '❌ Stopped'
    END as status
FROM cron.job
WHERE jobname = 'auto-activate-events';

CREATE OR REPLACE VIEW activation_history AS
SELECT 
    e.name as event_name,
    e.start_date as event_start,
    eal.scheduled_time,
    eal.activated_at,
    eal.activation_delay,
    CASE 
        WHEN eal.activation_delay <= INTERVAL '1 minute' THEN '✅ On Time'
        WHEN eal.activation_delay <= INTERVAL '5 minutes' THEN '⚠️ Slightly Late'
        ELSE '❌ Late'
    END as timing_status
FROM event_activation_log eal
JOIN events e ON e.id = eal.event_id
ORDER BY eal.activated_at DESC;

CREATE OR REPLACE VIEW upcoming_activations AS
SELECT 
    e.id,
    e.name,
    e.start_date,
    (e.config->'activation'->>'scheduled_time')::timestamptz as scheduled_activation,
    (e.config->'activation'->>'scheduled_time')::timestamptz - NOW() as time_until_activation,
    CASE 
        WHEN (e.config->'activation'->>'scheduled_time')::timestamptz <= NOW() THEN '🔥 OVERDUE'
        WHEN (e.config->'activation'->>'scheduled_time')::timestamptz <= NOW() + INTERVAL '1 hour' THEN '⏰ Soon'
        ELSE '📅 Scheduled'
    END as status
FROM events e
WHERE 
    e.is_active = false
    AND e.config ? 'activation'
    AND (e.config->'activation'->>'status') = 'scheduled'
    AND e.lifecycle_status != 'cancelled'
ORDER BY (e.config->'activation'->>'scheduled_time')::timestamptz;

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION auto_activate_scheduled_events() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_activate_with_logging() TO authenticated;
GRANT SELECT ON event_activation_log TO authenticated;
GRANT SELECT ON cron_job_status TO authenticated;
GRANT SELECT ON activation_history TO authenticated;
GRANT SELECT ON upcoming_activations TO authenticated;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_scheduled_activation 
ON events USING btree (
    ((config->'activation'->>'scheduled_time')::timestamptz)
) 
WHERE config ? 'activation' 
  AND (config->'activation'->>'status') = 'scheduled'
  AND is_active = false;

CREATE INDEX IF NOT EXISTS idx_activation_log_event_id 
ON event_activation_log(event_id);

CREATE INDEX IF NOT EXISTS idx_activation_log_activated_at 
ON event_activation_log(activated_at DESC);

-- SUCCESS MESSAGES
DO $$
BEGIN
    RAISE NOTICE '🎉 EVENT ACTIVATION SYSTEM INSTALLED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ pg_cron job scheduled to run every minute';
    RAISE NOTICE '✅ Comprehensive logging enabled';
    RAISE NOTICE '✅ Performance indexes created';
    RAISE NOTICE '✅ Monitoring views available';
    RAISE NOTICE '';
    RAISE NOTICE '📊 MONITORING COMMANDS:';
    RAISE NOTICE '   • Check job status: SELECT * FROM cron_job_status;';
    RAISE NOTICE '   • View activation history: SELECT * FROM activation_history;';
    RAISE NOTICE '   • See upcoming activations: SELECT * FROM upcoming_activations;';
    RAISE NOTICE '   • Manual activation: SELECT * FROM auto_activate_with_logging();';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your events will now activate automatically every minute!';
END $$;
