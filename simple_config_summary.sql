-- ============================================================================
-- SIMPLE CONFIGURATION SUMMARY
-- Shows: What's configured and WHO configured it (User vs System)
-- ============================================================================

-- COMBINED VIEW: Events and Series with Configuration Sources
SELECT 
  -- === BASIC INFO ===
  CASE 
    WHEN es.id IS NULL THEN '🎪 MAIN EVENT'
    ELSE '📅 SERIES'
  END as type,
  
  COALESCE(es.name, e.name) as name,
  e.name as event_name,
  es.name as series_name,
  
  -- === STATUS ===
  COALESCE(es.lifecycle_status::text, e.lifecycle_status::text) as status,
  CASE 
    WHEN COALESCE(es.status_changed_by, e.status_changed_by) IS NULL THEN '🤖 System'
    ELSE '👤 User'
  END as "Status Set By",
  
  -- === CAPACITY ===
  COALESCE(es.capacity, e.capacity) as capacity,
  CASE 
    WHEN COALESCE(es.capacity, e.capacity) IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as "Has Capacity Limit",
  CASE 
    WHEN es.capacity IS NOT NULL THEN '👤 User (Series)'
    WHEN e.capacity IS NOT NULL THEN '👤 User (Event)'
    ELSE '⚠️ Not Set'
  END as "Capacity Set By",
  
  -- === TICKET LINKING ===
  CASE 
    WHEN es.id IS NOT NULL THEN get_series_ticket_linking_mode(es.id)
    ELSE e.ticket_linking_mode
  END as ticket_linking_mode,
  CASE 
    WHEN es.id IS NOT NULL THEN
      CASE 
        WHEN get_series_ticket_linking_mode(es.id) = 'required' THEN 'Yes - Required'
        WHEN get_series_ticket_linking_mode(es.id) = 'optional' THEN 'Yes - Optional'
        ELSE 'No'
      END
    ELSE
      CASE 
        WHEN e.ticket_linking_mode = 'required' THEN 'Yes - Required'
        WHEN e.ticket_linking_mode = 'optional' THEN 'Yes - Optional'
        ELSE 'No'
      END
  END as "Requires Ticket Linking",
  CASE 
    WHEN es.id IS NOT NULL THEN
      CASE 
        WHEN (es.config->>'ticket_linking_mode')::text = 'inherit' OR (es.config->>'ticket_linking_mode')::text IS NULL 
        THEN '🔗 Inherited from Event'
        ELSE '👤 User (Series Override)'
      END
    ELSE '👤 User (Event)'
  END as "Ticket Linking Set By",
  
  -- === CHECK-IN WINDOW ===
  CASE 
    WHEN es.id IS NOT NULL THEN
      CASE 
        WHEN es.checkin_window_start_offset IS NOT NULL THEN 'Yes'
        ELSE 'No (Always Open)'
      END
    ELSE
      CASE 
        WHEN (e.config->'checkin_window'->>'enabled')::boolean = true THEN 'Yes'
        ELSE 'No (Always Open)'
      END
  END as "Has Check-in Window",
  CASE 
    WHEN es.id IS NOT NULL THEN
      CASE 
        WHEN es.checkin_window_start_offset IS NOT NULL 
        THEN '👤 User (Series: ' || es.checkin_window_start_offset::text || ' before, ' || es.checkin_window_end_offset::text || ' after)'
        ELSE '🤖 Default (Always Open)'
      END
    ELSE
      CASE 
        WHEN (e.config->'checkin_window'->>'enabled')::boolean = true 
        THEN '👤 User (Event: ' || (e.config->'checkin_window'->>'start_time')::text || ' to ' || (e.config->'checkin_window'->>'end_time')::text || ')'
        ELSE '🤖 Default (Always Open)'
      END
  END as "Check-in Window Set By",
  
  -- === GATE SETTINGS ===
  CASE 
    WHEN es.id IS NOT NULL THEN
      CASE 
        WHEN es.config->'gate_settings'->'allowed_gates' IS NOT NULL THEN 'Yes - Restricted'
        ELSE 'No - All Gates'
      END
    ELSE
      CASE 
        WHEN (e.config->'gate_settings'->>'auto_create_gates')::boolean = true THEN 'Yes - Auto Create'
        WHEN (e.config->'gate_settings'->>'enforce_category_assignments')::boolean = true THEN 'Yes - Enforce Categories'
        ELSE 'No'
      END
  END as "Has Gate Restrictions",
  CASE 
    WHEN es.id IS NOT NULL THEN
      CASE 
        WHEN es.config->'gate_settings' IS NOT NULL THEN '👤 User (Series)'
        ELSE '🔗 Inherited from Event'
      END
    ELSE
      CASE 
        WHEN e.config->'gate_settings' IS NOT NULL THEN '👤 User (Event)'
        ELSE '🤖 System Defaults'
      END
  END as "Gate Settings Set By",
  
  -- === CAPACITY ALERTS ===
  CASE 
    WHEN es.id IS NOT NULL THEN
      CASE 
        WHEN (es.config->'capacity_settings'->>'alerts_enabled')::boolean = true THEN 'Yes'
        WHEN (e.config->'capacity_settings'->>'alerts_enabled')::boolean = true THEN 'Yes (from Event)'
        ELSE 'No'
      END
    ELSE
      CASE 
        WHEN (e.config->'capacity_settings'->>'alerts_enabled')::boolean = true THEN 'Yes'
        ELSE 'No'
      END
  END as "Has Capacity Alerts",
  CASE 
    WHEN es.id IS NOT NULL THEN
      CASE 
        WHEN es.config->'capacity_settings' IS NOT NULL THEN '👤 User (Series)'
        WHEN e.config->'capacity_settings' IS NOT NULL THEN '🔗 Inherited from Event'
        ELSE '⚠️ Not Set'
      END
    ELSE
      CASE 
        WHEN e.config->'capacity_settings' IS NOT NULL THEN '👤 User (Event)'
        ELSE '⚠️ Not Set'
      END
  END as "Capacity Alerts Set By",
  
  -- === SEQUENCE (Series Only) ===
  es.sequence_number,
  CASE 
    WHEN es.sequence_number IS NOT NULL THEN '🤖 Auto-Assigned'
    ELSE NULL
  END as "Sequence Set By",
  
  -- === DATES ===
  COALESCE(es.start_date, e.start_date) as start_date,
  COALESCE(es.end_date, e.end_date) as end_date,
  
  -- === IDs for reference ===
  e.id as event_id,
  es.id as series_id

FROM events e
LEFT JOIN event_series es ON es.main_event_id = e.id
ORDER BY e.created_at DESC, es.sequence_number;


-- ============================================================================
-- CONFIGURATION SUMMARY BY SETTING
-- Shows each configuration type and who sets it
-- ============================================================================

SELECT 
  'Configuration Type' as setting,
  'Who Sets It' as set_by,
  'Notes' as notes
  
UNION ALL SELECT '─────────────────────────', '─────────────────────', '─────────────────────────────────────────'

-- Event-level settings
UNION ALL SELECT '🎪 EVENT: Status', '👤 User or 🤖 System', 'User creates as draft/scheduled/active. System auto-transitions if enabled.'
UNION ALL SELECT '🎪 EVENT: Capacity', '👤 User', 'User sets max capacity during event creation or edit.'
UNION ALL SELECT '🎪 EVENT: Ticket Linking', '👤 User', 'User chooses disabled/optional/required during event setup.'
UNION ALL SELECT '🎪 EVENT: Check-in Window', '👤 User', 'User sets absolute start/end times or leaves always open.'
UNION ALL SELECT '🎪 EVENT: Gate Settings', '👤 User', 'User configures auto-create, enforce categories, scan mode.'
UNION ALL SELECT '🎪 EVENT: Capacity Alerts', '👤 User', 'User enables alerts and sets threshold/recipients.'

UNION ALL SELECT '─────────────────────────', '─────────────────────', '─────────────────────────────────────────'

-- Series-level settings
UNION ALL SELECT '📅 SERIES: Status', '👤 User or 🤖 System', 'User creates as draft/scheduled/active. System auto-transitions if enabled.'
UNION ALL SELECT '📅 SERIES: Sequence Number', '🤖 System', 'Auto-assigned based on start date/time + name (alphabetical).'
UNION ALL SELECT '📅 SERIES: Capacity', '👤 User', 'User can set series-specific capacity or leave unset.'
UNION ALL SELECT '📅 SERIES: Ticket Linking', '👤 User or 🔗 Inherited', 'User can inherit from event or override with custom setting.'
UNION ALL SELECT '📅 SERIES: Check-in Window', '👤 User', 'User sets relative offsets (hours before/after) or uses defaults.'
UNION ALL SELECT '📅 SERIES: Gate Restrictions', '👤 User or 🔗 Inherited', 'User can restrict to specific gates or use all event gates.'
UNION ALL SELECT '📅 SERIES: Capacity Alerts', '👤 User or 🔗 Inherited', 'User can set series-specific alerts or inherit from event.'

UNION ALL SELECT '─────────────────────────', '─────────────────────', '─────────────────────────────────────────'

-- System-managed
UNION ALL SELECT '🤖 SYSTEM: Wristband Counts', '🤖 System', 'Automatically counted from wristbands table.'
UNION ALL SELECT '🤖 SYSTEM: Check-in Counts', '🤖 System', 'Automatically counted from checkin_logs table.'
UNION ALL SELECT '🤖 SYSTEM: Fraud Alerts', '🤖 System', 'Automatically detected based on fraud rules.'
UNION ALL SELECT '🤖 SYSTEM: Gate Discovery', '🤖 System', 'Automatically discovered from check-in GPS data.'
UNION ALL SELECT '🤖 SYSTEM: Health Scores', '🤖 System', 'Automatically calculated based on performance metrics.';


-- ============================================================================
-- QUICK LEGEND
-- ============================================================================

SELECT 
  '👤 User' as icon,
  'User explicitly configured this setting' as meaning
  
UNION ALL SELECT '🤖 System', 'System automatically manages this (auto-assigned, auto-calculated, auto-detected)'
UNION ALL SELECT '🔗 Inherited', 'Series inherits this setting from the main event'
UNION ALL SELECT '⚠️ Not Set', 'This optional setting has not been configured';
