-- ============================================================================
-- STEP 2: ENTERPRISE SCHEMA - CORE TABLES (Part 1 of 2)
-- ============================================================================
-- Creates ALL 60+ tables from Enterprise Schema
-- Complete feature set - nothing omitted
-- Execution time: ~2 minutes
-- ============================================================================

BEGIN;

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

CREATE TYPE lifecycle_status AS ENUM ('draft', 'scheduled', 'active', 'completed', 'cancelled');
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'manager', 'member');

-- ============================================================================
-- ORGANIZATIONS (Multi-tenant foundation)
-- ============================================================================

CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  website text,
  primary_color text DEFAULT '#0EA5E9'::text,
  secondary_color text DEFAULT '#8B5CF6'::text,
  custom_domain text,
  subscription_tier text DEFAULT 'free'::text CHECK (subscription_tier = ANY (ARRAY['free'::text, 'starter'::text, 'professional'::text, 'enterprise'::text])),
  max_events integer DEFAULT 5,
  max_wristbands integer DEFAULT 1000,
  max_team_members integer DEFAULT 5,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT organizations_pkey PRIMARY KEY (id),
  CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role org_role NOT NULL DEFAULT 'member'::org_role,
  permissions jsonb DEFAULT '{"events": "read", "reports": "read", "wristbands": "read"}'::jsonb,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'invited'::text])),
  invited_by uuid,
  invited_at timestamp with time zone,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id)
);

CREATE TABLE public.organization_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE,
  features jsonb DEFAULT '{"api_access": false, "ai_insights": false, "white_label": false, "fraud_detection": true, "custom_workflows": false}'::jsonb,
  notifications jsonb DEFAULT '{"sms_enabled": false, "push_enabled": true, "email_enabled": true}'::jsonb,
  require_2fa boolean DEFAULT false,
  allowed_ip_ranges text[],
  session_timeout_minutes integer DEFAULT 480,
  data_retention_days integer DEFAULT 365,
  auto_archive_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT organization_settings_pkey PRIMARY KEY (id),
  CONSTRAINT organization_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- ============================================================================
-- PROFILES (User information)
-- ============================================================================

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  role text DEFAULT 'scanner'::text CHECK (role = ANY (ARRAY['admin'::text, 'owner'::text, 'scanner'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_sign_in timestamp with time zone,
  phone text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================================
-- EVENTS (Core event management)
-- ============================================================================

CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text,
  capacity integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL DEFAULT now(),
  is_public boolean DEFAULT false,
  ticket_linking_mode text DEFAULT 'disabled'::text CHECK (ticket_linking_mode = ANY (ARRAY['disabled'::text, 'optional'::text, 'required'::text])),
  allow_unlinked_entry boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  lifecycle_status lifecycle_status NOT NULL DEFAULT 'draft'::lifecycle_status,
  status_changed_at timestamp with time zone DEFAULT now(),
  status_changed_by uuid,
  auto_transition_enabled boolean DEFAULT true,
  organization_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT events_status_changed_by_fkey FOREIGN KEY (status_changed_by) REFERENCES auth.users(id),
  CONSTRAINT events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE public.event_state_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  from_status lifecycle_status,
  to_status lifecycle_status NOT NULL,
  changed_by uuid,
  reason text,
  automated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_state_transitions_pkey PRIMARY KEY (id),
  CONSTRAINT event_state_transitions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_state_transitions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);

CREATE TABLE public.event_category_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  category text NOT NULL,
  max_wristbands integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_category_limits_pkey PRIMARY KEY (id),
  CONSTRAINT event_category_limits_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

CREATE TABLE public.event_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  access_level text DEFAULT 'scanner'::text CHECK (access_level = ANY (ARRAY['admin'::text, 'owner'::text, 'scanner'::text])),
  granted_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT event_access_pkey PRIMARY KEY (id),
  CONSTRAINT event_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT event_access_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id)
);

-- ============================================================================
-- TICKETS (Guest list from ticketing platforms)
-- ============================================================================

CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  ticket_number text NOT NULL,
  ticket_category text NOT NULL,
  holder_name text,
  holder_email text,
  holder_phone text,
  status text NOT NULL DEFAULT 'unused'::text CHECK (status = ANY (ARRAY['unused'::text, 'linked'::text, 'cancelled'::text])),
  linked_wristband_id uuid UNIQUE,
  linked_at timestamp with time zone,
  linked_by uuid,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tickets_pkey PRIMARY KEY (id),
  CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT tickets_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES auth.users(id)
);

CREATE TABLE public.ticket_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  filename text NOT NULL,
  total_tickets integer NOT NULL,
  successful_imports integer DEFAULT 0,
  failed_imports integer DEFAULT 0,
  upload_timestamp timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT ticket_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_uploads_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT ticket_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)
);

CREATE TABLE public.ticket_link_audit (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  ticket_id uuid,
  wristband_id uuid NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY['link'::text, 'unlink'::text, 'link_attempt_failed'::text, 'entry_allowed_no_ticket'::text, 'entry_denied_no_ticket'::text])),
  performed_by uuid NOT NULL,
  reason text,
  timestamp timestamp with time zone DEFAULT now(),
  metadata jsonb,
  CONSTRAINT ticket_link_audit_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_link_audit_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT ticket_link_audit_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id),
  CONSTRAINT ticket_link_audit_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id)
);

-- ============================================================================
-- WRISTBANDS (NFC wristband inventory)
-- ============================================================================

CREATE TABLE public.wristbands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  nfc_id text NOT NULL UNIQUE,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  linked_ticket_id uuid UNIQUE,
  linked_at timestamp with time zone,
  ticket_link_required boolean DEFAULT false,
  attendee_name text,
  attendee_email text,
  status text DEFAULT 'activated'::text CHECK (status = ANY (ARRAY['pending'::text, 'activated'::text, 'checked-in'::text, 'deactivated'::text, 'blocked'::text])),
  CONSTRAINT wristbands_pkey PRIMARY KEY (id),
  CONSTRAINT wristbands_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT wristbands_linked_ticket_id_fkey FOREIGN KEY (linked_ticket_id) REFERENCES public.tickets(id)
);

-- Add FK from tickets to wristbands
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_linked_wristband_id_fkey 
  FOREIGN KEY (linked_wristband_id) REFERENCES public.wristbands(id);

-- Add FK from ticket_link_audit to wristbands
ALTER TABLE public.ticket_link_audit
  ADD CONSTRAINT ticket_link_audit_wristband_id_fkey 
  FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id);

CREATE TABLE public.ticket_wristband_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  wristband_id uuid NOT NULL UNIQUE,
  linked_at timestamp with time zone DEFAULT now(),
  linked_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT ticket_wristband_links_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_wristband_links_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES auth.users(id),
  CONSTRAINT ticket_wristband_links_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE,
  CONSTRAINT ticket_wristband_links_wristband_id_fkey FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id) ON DELETE CASCADE
);

CREATE TABLE public.wristband_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  wristband_id uuid NOT NULL,
  event_id uuid NOT NULL,
  reason text NOT NULL,
  blocked_at timestamp with time zone DEFAULT now(),
  blocked_by uuid NOT NULL,
  unblocked_at timestamp with time zone,
  unblocked_by uuid,
  CONSTRAINT wristband_blocks_pkey PRIMARY KEY (id),
  CONSTRAINT wristband_blocks_wristband_id_fkey FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id) ON DELETE CASCADE,
  CONSTRAINT wristband_blocks_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT wristband_blocks_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES auth.users(id),
  CONSTRAINT wristband_blocks_unblocked_by_fkey FOREIGN KEY (unblocked_by) REFERENCES auth.users(id)
);

-- ============================================================================
-- GATES (Entry points)
-- ============================================================================

CREATE TABLE public.gates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  name text NOT NULL,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'maintenance'::text])),
  health_score integer DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  location_description text,
  CONSTRAINT gates_pkey PRIMARY KEY (id),
  CONSTRAINT gates_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

CREATE TABLE public.gate_bindings (
  gate_id uuid NOT NULL,
  category text NOT NULL,
  bound_at timestamp with time zone DEFAULT now(),
  status text NOT NULL CHECK (status = ANY (ARRAY['probation'::text, 'enforced'::text, 'unbound'::text])),
  sample_count integer DEFAULT 0,
  confidence numeric DEFAULT 0,
  event_id uuid,
  violation_count integer DEFAULT 0,
  last_violation_at timestamp with time zone,
  id uuid DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gate_bindings_pkey PRIMARY KEY (gate_id, category),
  CONSTRAINT gate_bindings_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id) ON DELETE CASCADE
);

CREATE TABLE public.gate_geofences (
  gate_id uuid NOT NULL,
  geojson jsonb,
  CONSTRAINT gate_geofences_pkey PRIMARY KEY (gate_id),
  CONSTRAINT gate_geofences_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id) ON DELETE CASCADE
);

CREATE TABLE public.gate_wifi (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gate_id uuid NOT NULL,
  ssid text NOT NULL,
  CONSTRAINT gate_wifi_pkey PRIMARY KEY (id),
  CONSTRAINT gate_wifi_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id) ON DELETE CASCADE
);

CREATE TABLE public.beacons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gate_id uuid,
  beacon_key text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT beacons_pkey PRIMARY KEY (id),
  CONSTRAINT beacons_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id) ON DELETE CASCADE
);

CREATE TABLE public.gate_merges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  source_gate_id uuid NOT NULL,
  target_gate_id uuid NOT NULL,
  merged_at timestamp with time zone DEFAULT now(),
  merged_by uuid NOT NULL,
  reason text,
  CONSTRAINT gate_merges_pkey PRIMARY KEY (id),
  CONSTRAINT gate_merges_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT gate_merges_source_gate_id_fkey FOREIGN KEY (source_gate_id) REFERENCES public.gates(id),
  CONSTRAINT gate_merges_target_gate_id_fkey FOREIGN KEY (target_gate_id) REFERENCES public.gates(id),
  CONSTRAINT gate_merges_merged_by_fkey FOREIGN KEY (merged_by) REFERENCES auth.users(id)
);

CREATE TABLE public.gate_merge_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  primary_gate_id uuid NOT NULL,
  secondary_gate_id uuid NOT NULL,
  confidence_score numeric NOT NULL,
  reasoning text NOT NULL,
  distance_meters numeric,
  traffic_similarity numeric,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'auto_applied'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  suggested_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gate_merge_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT gate_merge_suggestions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT gate_merge_suggestions_primary_gate_id_fkey FOREIGN KEY (primary_gate_id) REFERENCES public.gates(id),
  CONSTRAINT gate_merge_suggestions_secondary_gate_id_fkey FOREIGN KEY (secondary_gate_id) REFERENCES public.gates(id),
  CONSTRAINT gate_merge_suggestions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);

-- ============================================================================
-- CHECKIN LOGS (Scan activity)
-- ============================================================================

CREATE TABLE public.checkin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  wristband_id uuid NOT NULL,
  staff_id uuid,
  timestamp timestamp with time zone DEFAULT now(),
  location text,
  notes text,
  gate_id uuid,
  scanner_id uuid,
  app_lat double precision,
  app_lon double precision,
  app_accuracy double precision,
  ble_seen text[],
  wifi_ssids text[],
  probation_tagged boolean DEFAULT false,
  ticket_id uuid,
  status text DEFAULT 'success'::text CHECK (status = ANY (ARRAY['success'::text, 'denied'::text, 'fraud'::text, 'error'::text])),
  processing_time_ms integer,
  is_test_data boolean DEFAULT false,
  gps_quality_score numeric DEFAULT 0,
  CONSTRAINT checkin_logs_pkey PRIMARY KEY (id),
  CONSTRAINT checkin_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT checkin_logs_wristband_id_fkey FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id),
  CONSTRAINT checkin_logs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES auth.users(id),
  CONSTRAINT checkin_logs_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id),
  CONSTRAINT checkin_logs_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id)
);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to calculate GPS quality score automatically
CREATE OR REPLACE FUNCTION calculate_gps_quality_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate GPS quality based on accuracy
  IF NEW.app_lat IS NULL OR NEW.app_lon IS NULL OR NEW.app_accuracy IS NULL THEN
    NEW.gps_quality_score := 0;
  ELSIF NEW.app_accuracy <= 10 THEN
    NEW.gps_quality_score := 1.0;
  ELSIF NEW.app_accuracy <= 20 THEN
    NEW.gps_quality_score := 0.9;
  ELSIF NEW.app_accuracy <= 30 THEN
    NEW.gps_quality_score := 0.8;
  ELSIF NEW.app_accuracy <= 50 THEN
    NEW.gps_quality_score := 0.6;
  ELSE
    NEW.gps_quality_score := 0.4;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate GPS quality on insert/update
CREATE TRIGGER trigger_calculate_gps_quality
  BEFORE INSERT OR UPDATE ON checkin_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_gps_quality_score();

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Core tables created: ' || COUNT(*)::text as status
FROM pg_tables 
WHERE schemaname = 'public';
