-- Event Activation Trigger System
-- This creates a function and trigger to automatically activate events at their scheduled time

-- Function to activate scheduled events
CREATE OR REPLACE FUNCTION activate_scheduled_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update events that are scheduled and their activation time has passed
  UPDATE public.events 
  SET 
    is_active = true,
    config = jsonb_set(
      config, 
      '{activation,status}', 
      '"active"'::jsonb
    ),
    updated_at = now()
  WHERE 
    is_active = false
    AND config->>'activation' IS NOT NULL
    AND (config->'activation'->>'status') = 'scheduled'
    AND (config->'activation'->>'scheduled_time')::timestamp <= now()
    AND lifecycle_status != 'cancelled';
    
  -- Log the number of events activated
  RAISE NOTICE 'Activated % scheduled events', ROW_COUNT;
END;
$$;

-- Create a function that can be called by pg_cron or external scheduler
CREATE OR REPLACE FUNCTION check_and_activate_events()
RETURNS TABLE(activated_count integer)
LANGUAGE plpgsql
AS $$
DECLARE
  count_activated integer := 0;
BEGIN
  -- Count events that will be activated
  SELECT COUNT(*) INTO count_activated
  FROM public.events 
  WHERE 
    is_active = false
    AND config->>'activation' IS NOT NULL
    AND (config->'activation'->>'status') = 'scheduled'
    AND (config->'activation'->>'scheduled_time')::timestamp <= now()
    AND lifecycle_status != 'cancelled';
    
  -- Activate the events
  PERFORM activate_scheduled_events();
  
  -- Return the count
  RETURN QUERY SELECT count_activated;
END;
$$;

-- Create a trigger function for real-time checking (optional)
-- This will check for activation whenever an event is updated
CREATE OR REPLACE FUNCTION trigger_check_event_activation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If this event is scheduled and the time has passed, activate it
  IF NEW.is_active = false 
     AND NEW.config->>'activation' IS NOT NULL
     AND (NEW.config->'activation'->>'status') = 'scheduled'
     AND (NEW.config->'activation'->>'scheduled_time')::timestamp <= now()
     AND NEW.lifecycle_status != 'cancelled' THEN
    
    NEW.is_active := true;
    NEW.config := jsonb_set(
      NEW.config, 
      '{activation,status}', 
      '"active"'::jsonb
    );
    NEW.updated_at := now();
    
    RAISE NOTICE 'Event % automatically activated', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger (optional - for real-time activation on updates)
DROP TRIGGER IF EXISTS event_activation_trigger ON public.events;
CREATE TRIGGER event_activation_trigger
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_event_activation();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION activate_scheduled_events() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_activate_events() TO authenticated;

-- Example usage:
-- To manually check and activate events: SELECT * FROM check_and_activate_events();
-- To set up with pg_cron (if available): SELECT cron.schedule('activate-events', '* * * * *', 'SELECT activate_scheduled_events();');

-- Note: For production, you should set up an external cron job or use pg_cron extension
-- to call check_and_activate_events() every minute or as needed.
