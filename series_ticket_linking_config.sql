-- Series-Specific Ticket Linking Configuration
-- Allows each series within a main event to have its own ticket linking requirements

-- ============================================================================
-- HELPER FUNCTION: Get Effective Ticket Linking Mode for a Series
-- ============================================================================
-- This function determines the actual ticket linking mode for a series
-- by checking if it inherits from the main event or has its own setting

CREATE OR REPLACE FUNCTION get_series_ticket_linking_mode(p_series_id uuid)
RETURNS text AS $$
DECLARE
  v_series_mode text;
  v_event_mode text;
BEGIN
  -- Get the series config
  SELECT 
    COALESCE(
      (config->>'ticket_linking_mode')::text,
      'inherit'
    )
  INTO v_series_mode
  FROM event_series
  WHERE id = p_series_id;

  -- If series mode is 'inherit' or null, get from main event
  IF v_series_mode = 'inherit' OR v_series_mode IS NULL THEN
    SELECT 
      COALESCE(
        e.ticket_linking_mode,
        (e.config->>'ticket_linking_mode')::text,
        (e.config->>'security_mode')::text,
        'disabled'
      )
    INTO v_event_mode
    FROM event_series es
    JOIN events e ON e.id = es.main_event_id
    WHERE es.id = p_series_id;
    
    RETURN COALESCE(v_event_mode, 'disabled');
  END IF;

  RETURN v_series_mode;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_series_ticket_linking_mode IS 
'Returns the effective ticket linking mode for a series, inheriting from main event if set to "inherit"';


-- ============================================================================
-- HELPER FUNCTION: Check if Unlinked Entry Allowed for Series
-- ============================================================================

CREATE OR REPLACE FUNCTION series_allows_unlinked_entry(p_series_id uuid)
RETURNS boolean AS $$
DECLARE
  v_ticket_mode text;
  v_series_allow_unlinked boolean;
  v_event_allow_unlinked boolean;
BEGIN
  -- Get the effective ticket linking mode
  v_ticket_mode := get_series_ticket_linking_mode(p_series_id);

  -- If mode is 'disabled', unlinked entry is always allowed
  IF v_ticket_mode = 'disabled' THEN
    RETURN true;
  END IF;

  -- If mode is 'required', unlinked entry is never allowed
  IF v_ticket_mode = 'required' THEN
    RETURN false;
  END IF;

  -- For 'optional' mode, check the explicit allow_unlinked_entry setting
  SELECT 
    COALESCE(
      (config->>'allow_unlinked_entry')::boolean,
      NULL
    )
  INTO v_series_allow_unlinked
  FROM event_series
  WHERE id = p_series_id;

  -- If series has explicit setting, use it
  IF v_series_allow_unlinked IS NOT NULL THEN
    RETURN v_series_allow_unlinked;
  END IF;

  -- Otherwise inherit from main event
  SELECT 
    COALESCE(
      e.allow_unlinked_entry,
      (e.config->>'allow_unlinked_entry')::boolean,
      true
    )
  INTO v_event_allow_unlinked
  FROM event_series es
  JOIN events e ON e.id = es.main_event_id
  WHERE es.id = p_series_id;

  RETURN COALESCE(v_event_allow_unlinked, true);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION series_allows_unlinked_entry IS 
'Returns whether unlinked wristbands are allowed entry for a specific series';


-- ============================================================================
-- HELPER FUNCTION: Validate Wristband for Series Check-in
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_wristband_for_series(
  p_wristband_id uuid,
  p_series_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_ticket_mode text;
  v_allows_unlinked boolean;
  v_has_ticket boolean;
  v_wristband_active boolean;
  v_result jsonb;
BEGIN
  -- Get ticket linking configuration
  v_ticket_mode := get_series_ticket_linking_mode(p_series_id);
  v_allows_unlinked := series_allows_unlinked_entry(p_series_id);

  -- Check if wristband is active
  SELECT is_active INTO v_wristband_active
  FROM wristbands
  WHERE id = p_wristband_id;

  IF NOT v_wristband_active THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'wristband_inactive',
      'message', 'This wristband is not active'
    );
  END IF;

  -- Check if wristband has a linked ticket
  SELECT EXISTS(
    SELECT 1 FROM tickets
    WHERE linked_wristband_id = p_wristband_id
  ) INTO v_has_ticket;

  -- Apply ticket linking rules
  IF v_ticket_mode = 'required' AND NOT v_has_ticket THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'ticket_required',
      'message', 'This series requires a linked ticket. Please link a ticket first.',
      'ticket_mode', v_ticket_mode
    );
  END IF;

  IF v_ticket_mode = 'optional' AND NOT v_has_ticket AND NOT v_allows_unlinked THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'unlinked_not_allowed',
      'message', 'Unlinked wristbands are not allowed for this series.',
      'ticket_mode', v_ticket_mode
    );
  END IF;

  -- Validation passed
  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Wristband is valid for this series',
    'ticket_mode', v_ticket_mode,
    'has_ticket', v_has_ticket,
    'allows_unlinked', v_allows_unlinked
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_wristband_for_series IS 
'Validates whether a wristband can check in to a specific series based on ticket linking requirements';


-- ============================================================================
-- VIEW: Series Ticket Linking Summary
-- ============================================================================

CREATE OR REPLACE VIEW series_ticket_linking_summary AS
SELECT 
  es.id as series_id,
  es.name as series_name,
  es.main_event_id,
  e.name as event_name,
  es.lifecycle_status,
  get_series_ticket_linking_mode(es.id) as effective_ticket_mode,
  series_allows_unlinked_entry(es.id) as allows_unlinked_entry,
  (es.config->>'ticket_linking_mode')::text as series_config_mode,
  e.ticket_linking_mode as event_ticket_mode,
  CASE 
    WHEN (es.config->>'ticket_linking_mode')::text = 'inherit' OR (es.config->>'ticket_linking_mode')::text IS NULL 
    THEN true 
    ELSE false 
  END as inherits_from_event
FROM event_series es
JOIN events e ON e.id = es.main_event_id
WHERE es.lifecycle_status IN ('active', 'scheduled');

COMMENT ON VIEW series_ticket_linking_summary IS 
'Provides a summary of ticket linking configuration for active and scheduled series';


-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

/*
-- Set a series to require ticket linking (stricter than main event)
UPDATE event_series
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{ticket_linking_mode}',
  '"required"'
)
WHERE id = 'your-series-id';

-- Set a series to disable ticket linking (more permissive than main event)
UPDATE event_series
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{ticket_linking_mode}',
  '"disabled"'
)
WHERE id = 'your-series-id';

-- Set a series to inherit from main event (default)
UPDATE event_series
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{ticket_linking_mode}',
  '"inherit"'
)
WHERE id = 'your-series-id';

-- Check effective ticket linking for a series
SELECT get_series_ticket_linking_mode('your-series-id');

-- Validate a wristband for series check-in
SELECT validate_wristband_for_series('wristband-id', 'series-id');

-- View all series ticket linking configurations
SELECT * FROM series_ticket_linking_summary;
*/
