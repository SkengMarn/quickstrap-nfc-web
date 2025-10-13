-- Get ticket linking configuration for a specific event
SELECT
  id,
  name,
  ticket_linking_mode,
  allow_unlinked_entry
FROM events
WHERE id = 'your-event-id';

-- Example results:
-- ticket_linking_mode: 'disabled' | 'optional' | 'required'
-- allow_unlinked_entry: true | false

-- Get all events with their ticket linking settings
SELECT 
  id,
  name,
  ticket_linking_mode,
  allow_unlinked_entry,
  CASE 
    WHEN ticket_linking_mode = 'disabled' THEN 'No validation - any wristband works'
    WHEN ticket_linking_mode = 'optional' AND allow_unlinked_entry = true THEN 'Guest list available, unlinked entry allowed'
    WHEN ticket_linking_mode = 'optional' AND allow_unlinked_entry = false THEN 'Guest list available, unlinked entry denied'
    WHEN ticket_linking_mode = 'required' THEN 'Strict validation - only linked tickets allowed'
  END as validation_description
FROM events
ORDER BY created_at DESC;
