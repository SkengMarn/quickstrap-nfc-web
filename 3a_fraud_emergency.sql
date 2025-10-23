-- ============================================================================
-- STEP 3A: FRAUD DETECTION & EMERGENCY MANAGEMENT (10 tables)
-- ============================================================================
-- Run this AFTER 2_enterprise_schema_core.sql
-- Execution time: ~1 minute
-- ============================================================================

BEGIN;

-- ============================================================================
-- FRAUD DETECTION & SECURITY (4 tables)
-- ============================================================================

CREATE TABLE public.fraud_detections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  wristband_id uuid,
  detection_type text NOT NULL CHECK (detection_type = ANY (ARRAY['multiple_checkins'::text, 'impossible_location'::text, 'blocked_attempt'::text, 'suspicious_pattern'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  investigated_at timestamp with time zone,
  investigated_by uuid,
  CONSTRAINT fraud_detections_pkey PRIMARY KEY (id),
  CONSTRAINT fraud_detections_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT fraud_detections_wristband_id_fkey FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id),
  CONSTRAINT fraud_detections_investigated_by_fkey FOREIGN KEY (investigated_by) REFERENCES auth.users(id)
);

CREATE TABLE public.fraud_cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  fraud_detection_id uuid,
  case_number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'investigating'::text, 'resolved'::text, 'closed'::text, 'false_positive'::text])),
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  assigned_to uuid,
  assigned_at timestamp with time zone,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  evidence jsonb DEFAULT '[]'::jsonb,
  wristband_ids uuid[],
  user_ids uuid[],
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fraud_cases_pkey PRIMARY KEY (id),
  CONSTRAINT fraud_cases_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT fraud_cases_fraud_detection_id_fkey FOREIGN KEY (fraud_detection_id) REFERENCES public.fraud_detections(id),
  CONSTRAINT fraud_cases_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id),
  CONSTRAINT fraud_cases_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id),
  CONSTRAINT fraud_cases_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.fraud_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid,
  name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type = ANY (ARRAY['multiple_checkins'::text, 'velocity_check'::text, 'impossible_location'::text, 'time_pattern'::text, 'category_mismatch'::text, 'blacklist_check'::text, 'custom'::text])),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_score integer DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  auto_block boolean DEFAULT false,
  auto_alert boolean DEFAULT true,
  alert_severity text DEFAULT 'medium'::text CHECK (alert_severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fraud_rules_pkey PRIMARY KEY (id),
  CONSTRAINT fraud_rules_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fraud_rules_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT fraud_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['wristband'::text, 'email'::text, 'phone'::text, 'ip_address'::text])),
  entity_value text NOT NULL,
  reason text NOT NULL,
  risk_level text DEFAULT 'medium'::text CHECK (risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  auto_block boolean DEFAULT false,
  auto_flag boolean DEFAULT true,
  related_case_ids uuid[],
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  added_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT watchlist_pkey PRIMARY KEY (id),
  CONSTRAINT watchlist_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT watchlist_added_by_fkey FOREIGN KEY (added_by) REFERENCES auth.users(id)
);

-- ============================================================================
-- EMERGENCY MANAGEMENT (3 tables)
-- ============================================================================

CREATE TABLE public.emergency_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid NOT NULL,
  incident_type text NOT NULL,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  location text,
  description text NOT NULL,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'investigating'::text, 'resolved'::text, 'closed'::text])),
  reported_by text,
  reported_by_user_id uuid,
  reported_at timestamp with time zone DEFAULT now(),
  responders uuid[],
  assigned_to uuid,
  response_started_at timestamp with time zone,
  estimated_affected integer DEFAULT 0,
  actual_affected integer,
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  evidence jsonb DEFAULT '[]'::jsonb,
  action_log jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT emergency_incidents_pkey PRIMARY KEY (id),
  CONSTRAINT emergency_incidents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT emergency_incidents_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT emergency_incidents_reported_by_user_id_fkey FOREIGN KEY (reported_by_user_id) REFERENCES auth.users(id),
  CONSTRAINT emergency_incidents_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id),
  CONSTRAINT emergency_incidents_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id)
);

CREATE TABLE public.emergency_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid,
  incident_id uuid,
  action_type text NOT NULL CHECK (action_type = ANY (ARRAY['lockdown'::text, 'evacuation'::text, 'broadcast'::text, 'staff_alert'::text, 'system_shutdown'::text, 'gate_control'::text, 'access_restriction'::text])),
  action_title text NOT NULL,
  action_description text,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  estimated_impact text,
  actual_impact text,
  executed_by uuid NOT NULL,
  executed_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'executing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])),
  result_details jsonb DEFAULT '{}'::jsonb,
  affected_gates uuid[],
  affected_users uuid[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT emergency_actions_pkey PRIMARY KEY (id),
  CONSTRAINT emergency_actions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT emergency_actions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT emergency_actions_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.emergency_incidents(id) ON DELETE CASCADE,
  CONSTRAINT emergency_actions_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES auth.users(id)
);

CREATE TABLE public.emergency_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE,
  alert_level text DEFAULT 'normal'::text CHECK (alert_level = ANY (ARRAY['normal'::text, 'elevated'::text, 'high'::text, 'critical'::text])),
  is_active boolean DEFAULT false,
  active_incidents integer DEFAULT 0,
  systems_locked boolean DEFAULT false,
  evacuation_status text DEFAULT 'none'::text CHECK (evacuation_status = ANY (ARRAY['none'::text, 'partial'::text, 'full'::text])),
  last_updated_at timestamp with time zone DEFAULT now(),
  alert_started_at timestamp with time zone,
  alert_cleared_at timestamp with time zone,
  status_details jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT emergency_status_pkey PRIMARY KEY (id),
  CONSTRAINT emergency_status_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- ============================================================================
-- AUDIT LOG (1 table)
-- ============================================================================

CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT audit_log_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ============================================================================
-- VENUES (1 table)
-- ============================================================================

CREATE TABLE public.venues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  venue_type text NOT NULL CHECK (venue_type = ANY (ARRAY['indoor'::text, 'outdoor'::text, 'hybrid'::text])),
  default_radius_m integer DEFAULT 30,
  gps_threshold_accuracy_m integer DEFAULT 20,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT venues_pkey PRIMARY KEY (id)
);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Tables after 3a: ' || COUNT(*)::text as status
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show 32 tables (22 + 10)
