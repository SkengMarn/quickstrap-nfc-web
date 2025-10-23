-- ============================================================================
-- View All Events and Series with Complete Configuration
-- ============================================================================

-- 1. ALL MAIN EVENTS with their configuration
SELECT 
  '🎪 MAIN EVENT' as type,
  e.id,
  e.name,
  e.organization_id,
  o.name as organization_name,
  
  -- === LIFECYCLE (System Managed) ===
  e.lifecycle_status as status,
  e.auto_transition_enabled as auto_transition,
  e.status_changed_at,
  e.status_changed_by,
  CASE 
    WHEN e.status_changed_by IS NULL THEN '🤖 System'
    ELSE '👤 User'
  END as status_set_by,
  
  -- === BASIC INFO (User Defined) ===
  e.start_date,
  e.end_date,
  e.capacity as max_capacity,
  CASE WHEN e.capacity IS NOT NULL THEN '👤 User Set' ELSE '⚠️ Not Set' END as capacity_source,
  e.location,
  e.is_public,
  
  -- === TICKET LINKING (User Defined) ===
  e.ticket_linking_mode,
  e.allow_unlinked_entry,
  CASE 
    WHEN e.ticket_linking_mode = 'disabled' THEN '🔓 No tickets needed'
    WHEN e.ticket_linking_mode = 'optional' THEN '🎫 Tickets optional'
    WHEN e.ticket_linking_mode = 'required' THEN '🔒 Tickets required'
    ELSE '⚠️ Not configured'
  END as ticket_linking_description,
  
  -- === CONFIG JSONB BREAKDOWN ===
  -- Gate Settings (User Defined)
  (e.config->'gate_settings'->>'auto_create_gates')::boolean as auto_create_gates,
  (e.config->'gate_settings'->>'enforce_category_assignments')::boolean as enforce_categories,
  (e.config->'gate_settings'->>'default_scan_mode')::text as scan_mode,
  CASE 
    WHEN e.config->'gate_settings' IS NOT NULL THEN '👤 User Configured'
    ELSE '🤖 System Defaults'
  END as gate_settings_source,
  
  -- Capacity Settings (User Defined)
  (e.config->'capacity_settings'->>'max_capacity')::integer as config_max_capacity,
  (e.config->'capacity_settings'->>'alerts_enabled')::boolean as capacity_alerts,
  (e.config->'capacity_settings'->>'alert_threshold')::integer as alert_threshold,
  (e.config->'capacity_settings'->'alert_recipients') as alert_recipients,
  CASE 
    WHEN e.config->'capacity_settings' IS NOT NULL THEN '👤 User Configured'
    ELSE '⚠️ Not Set'
  END as capacity_alerts_source,
  
  -- Check-in Window (User Defined)
  (e.config->'checkin_window'->>'enabled')::boolean as checkin_window_enabled,
  (e.config->'checkin_window'->>'start_time')::text as checkin_start,
  (e.config->'checkin_window'->>'end_time')::text as checkin_end,
  CASE 
    WHEN (e.config->'checkin_window'->>'enabled')::boolean = true THEN '👤 User Set'
    ELSE '🤖 Always Open'
  END as checkin_window_source,
  
  -- Emergency Controls (System/User)
  (e.config->>'emergency_stop')::boolean as emergency_stop,
  CASE 
    WHEN (e.config->>'emergency_stop')::boolean = true THEN '🚨 EMERGENCY MODE'
    ELSE '✅ Normal'
  END as emergency_status,
  
  -- Full config for reference
  e.config as full_config,
  
  -- === METADATA ===
  e.created_at,
  e.created_by,
  
  -- === STATS (System Calculated) ===
  (SELECT COUNT(*) FROM event_series WHERE main_event_id = e.id) as total_series,
  (SELECT COUNT(*) FROM event_series WHERE main_event_id = e.id AND lifecycle_status = 'active') as active_series,
  (SELECT COUNT(*) FROM wristbands WHERE event_id = e.id) as total_wristbands,
  (SELECT COUNT(*) FROM wristbands WHERE event_id = e.id AND is_active = true) as active_wristbands,
  (SELECT COUNT(*) FROM tickets WHERE event_id = e.id) as total_tickets,
  (SELECT COUNT(*) FROM tickets WHERE event_id = e.id AND status = 'linked') as linked_tickets,
  (SELECT COUNT(*) FROM checkin_logs WHERE event_id = e.id) as total_checkins,
  (SELECT COUNT(DISTINCT wristband_id) FROM checkin_logs WHERE event_id = e.id) as unique_attendees
  
FROM events e
LEFT JOIN organizations o ON o.id = e.organization_id
ORDER BY e.created_at DESC;


-- 2. ALL SERIES with their configuration
SELECT 
  '📅 SERIES' as type,
  es.id,
  es.name as series_name,
  e.name as main_event_name,
  es.main_event_id,
  es.organization_id,
  o.name as organization_name,
  
  -- === LIFECYCLE (System Managed) ===
  es.lifecycle_status as status,
  es.auto_transition_enabled as auto_transition,
  es.status_changed_at,
  es.status_changed_by,
  CASE 
    WHEN es.status_changed_by IS NULL THEN '🤖 System'
    ELSE '👤 User'
  END as status_set_by,
  
  -- === BASIC INFO (User Defined) ===
  es.series_type,
  es.sequence_number as seq_num,
  CASE 
    WHEN es.sequence_number IS NOT NULL THEN '🤖 Auto-Assigned'
    ELSE '⚠️ Not Set'
  END as sequence_source,
  es.start_date,
  es.end_date,
  es.capacity as max_capacity,
  CASE 
    WHEN es.capacity IS NOT NULL THEN '👤 User Set'
    ELSE '⚠️ Not Set'
  END as capacity_source,
  es.location,
  es.is_public,
  es.requires_separate_ticket,
  
  -- === CHECK-IN WINDOW (User Defined) ===
  es.checkin_window_start_offset as window_start_offset,
  es.checkin_window_end_offset as window_end_offset,
  CASE 
    WHEN es.checkin_window_start_offset IS NOT NULL THEN '👤 User Set'
    ELSE '🤖 Default (2 hours)'
  END as checkin_window_source,
  
  -- === TICKET LINKING (User Defined / Inherited) ===
  (es.config->>'ticket_linking_mode')::text as configured_ticket_linking,
  (es.config->>'allow_unlinked_entry')::boolean as configured_allow_unlinked,
  get_series_ticket_linking_mode(es.id) as effective_ticket_linking,
  series_allows_unlinked_entry(es.id) as effective_allow_unlinked,
  e.ticket_linking_mode as event_ticket_linking,
  e.allow_unlinked_entry as event_allow_unlinked,
  CASE 
    WHEN (es.config->>'ticket_linking_mode')::text = 'inherit' OR (es.config->>'ticket_linking_mode')::text IS NULL 
    THEN '🔗 Inheriting from event (' || COALESCE(e.ticket_linking_mode, 'disabled') || ')'
    WHEN (es.config->>'ticket_linking_mode')::text = 'disabled' THEN '👤 User Set: 🔓 No tickets needed'
    WHEN (es.config->>'ticket_linking_mode')::text = 'optional' THEN '👤 User Set: 🎫 Tickets optional'
    WHEN (es.config->>'ticket_linking_mode')::text = 'required' THEN '👤 User Set: 🔒 Tickets required'
    ELSE '⚠️ Not configured'
  END as ticket_linking_source,
  CASE 
    WHEN (es.config->>'ticket_linking_mode')::text NOT IN ('inherit', NULL) 
         AND (es.config->>'ticket_linking_mode')::text != e.ticket_linking_mode 
    THEN '⚠️ OVERRIDE: Series differs from event'
    WHEN (es.config->>'ticket_linking_mode')::text = e.ticket_linking_mode 
    THEN '✅ Matches event setting'
    ELSE '✅ Inheriting'
  END as ticket_linking_comparison,
  
  -- === CONFIG JSONB BREAKDOWN ===
  -- Gate Settings (User Defined)
  (es.config->'gate_settings'->'allowed_gates') as allowed_gates,
  (es.config->'gate_settings'->>'auto_create_gates')::boolean as series_auto_create_gates,
  CASE 
    WHEN es.config->'gate_settings'->'allowed_gates' IS NOT NULL 
    THEN '👤 Restricted to specific gates'
    ELSE '🤖 All event gates available'
  END as gate_restriction_source,
  
  -- Capacity Settings (User Defined)
  (es.config->'capacity_settings'->>'max_capacity')::integer as config_max_capacity,
  (es.config->'capacity_settings'->>'alerts_enabled')::boolean as capacity_alerts,
  (es.config->'capacity_settings'->>'alert_threshold')::integer as alert_threshold,
  CASE 
    WHEN es.config->'capacity_settings' IS NOT NULL THEN '👤 User Configured'
    ELSE '🔗 Inherits from event'
  END as capacity_alerts_source,
  
  -- Recurrence (User Defined)
  es.is_recurring,
  es.recurrence_pattern,
  es.parent_series_id,
  CASE 
    WHEN es.is_recurring = true THEN '👤 Recurring series'
    WHEN es.parent_series_id IS NOT NULL THEN '🔗 Child of recurring series'
    ELSE '📍 Single occurrence'
  END as recurrence_type,
  
  -- Full config for reference
  es.config as full_config,
  
  -- === METADATA ===
  es.created_at,
  es.created_by,
  
  -- === STATS (System Calculated) ===
  (SELECT COUNT(*) FROM series_wristband_assignments WHERE series_id = es.id AND is_active = true) as assigned_wristbands,
  (SELECT COUNT(*) FROM series_gates WHERE series_id = es.id AND is_active = true) as assigned_gates,
  (SELECT COUNT(*) FROM series_tickets WHERE series_id = es.id AND is_active = true) as linked_tickets,
  (SELECT COUNT(*) FROM checkin_logs WHERE series_id = es.id) as total_checkins,
  (SELECT COUNT(DISTINCT wristband_id) FROM checkin_logs WHERE series_id = es.id) as unique_attendees,
  (SELECT COUNT(*) FROM fraud_detections WHERE series_id = es.id) as fraud_alerts
  
FROM event_series es
JOIN events e ON e.id = es.main_event_id
LEFT JOIN organizations o ON o.id = es.organization_id
ORDER BY es.main_event_id, es.sequence_number, es.start_date;


-- 3. COMBINED VIEW: Events and their Series (Hierarchical)
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.lifecycle_status as event_status,
  e.ticket_linking_mode as event_ticket_linking,
  e.start_date as event_start,
  e.end_date as event_end,
  
  -- Series details (NULL if no series)
  es.id as series_id,
  es.name as series_name,
  es.lifecycle_status as series_status,
  es.sequence_number,
  (es.config->>'ticket_linking_mode')::text as series_ticket_config,
  get_series_ticket_linking_mode(es.id) as series_effective_ticket_linking,
  es.start_date as series_start,
  es.end_date as series_end,
  
  -- Comparison
  CASE 
    WHEN es.id IS NULL THEN '📍 No series'
    WHEN (es.config->>'ticket_linking_mode')::text = 'inherit' OR (es.config->>'ticket_linking_mode')::text IS NULL 
    THEN '✅ Inherits: ' || COALESCE(e.ticket_linking_mode, 'disabled')
    WHEN (es.config->>'ticket_linking_mode')::text = e.ticket_linking_mode
    THEN '🟰 Same as event: ' || (es.config->>'ticket_linking_mode')::text
    ELSE '🔧 Override: ' || (es.config->>'ticket_linking_mode')::text || ' (event: ' || COALESCE(e.ticket_linking_mode, 'disabled') || ')'
  END as ticket_linking_comparison
  
FROM events e
LEFT JOIN event_series es ON es.main_event_id = e.id
ORDER BY e.created_at DESC, es.sequence_number;


-- 4. TICKET LINKING SUMMARY (Active/Scheduled Series Only)
SELECT * FROM series_ticket_linking_summary;


-- 5. CONFIGURATION CONFLICTS (Series with different ticket linking than event)
SELECT 
  e.name as event_name,
  e.ticket_linking_mode as event_mode,
  es.name as series_name,
  (es.config->>'ticket_linking_mode')::text as series_mode,
  get_series_ticket_linking_mode(es.id) as effective_mode,
  CASE 
    WHEN (es.config->>'ticket_linking_mode')::text = 'inherit' THEN '✅ Inheriting'
    WHEN (es.config->>'ticket_linking_mode')::text = e.ticket_linking_mode THEN '✅ Matching'
    WHEN (es.config->>'ticket_linking_mode')::text = 'required' AND e.ticket_linking_mode != 'required' THEN '⚠️ Series MORE restrictive'
    WHEN (es.config->>'ticket_linking_mode')::text = 'disabled' AND e.ticket_linking_mode = 'required' THEN '⚠️ Series LESS restrictive'
    ELSE '🔧 Different configuration'
  END as conflict_status
FROM events e
JOIN event_series es ON es.main_event_id = e.id
WHERE (es.config->>'ticket_linking_mode')::text IS NOT NULL 
  AND (es.config->>'ticket_linking_mode')::text != 'inherit'
ORDER BY e.name, es.sequence_number;


-- 6. QUICK STATS
SELECT 
  'EVENTS' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE lifecycle_status = 'draft') as draft,
  COUNT(*) FILTER (WHERE lifecycle_status = 'scheduled') as scheduled,
  COUNT(*) FILTER (WHERE lifecycle_status = 'active') as active,
  COUNT(*) FILTER (WHERE lifecycle_status = 'completed') as completed,
  COUNT(*) FILTER (WHERE lifecycle_status = 'cancelled') as cancelled
FROM events

UNION ALL

SELECT 
  'SERIES' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE lifecycle_status = 'draft') as draft,
  COUNT(*) FILTER (WHERE lifecycle_status = 'scheduled') as scheduled,
  COUNT(*) FILTER (WHERE lifecycle_status = 'active') as active,
  COUNT(*) FILTER (WHERE lifecycle_status = 'completed') as completed,
  COUNT(*) FILTER (WHERE lifecycle_status = 'cancelled') as cancelled
FROM event_series;
