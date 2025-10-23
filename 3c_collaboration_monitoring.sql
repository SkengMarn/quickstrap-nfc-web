-- ============================================================================
-- STEP 3C: COLLABORATION, MONITORING & EXPORT (11 tables)
-- ============================================================================
-- Run this AFTER 3b_api_ml.sql
-- Execution time: ~1 minute
-- ============================================================================

BEGIN;

-- ============================================================================
-- COLLABORATION & COMMUNICATION (4 tables)
-- ============================================================================

CREATE TABLE public.staff_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid,
  message text NOT NULL,
  is_broadcast boolean DEFAULT false,
  priority text DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])),
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_messages_pkey PRIMARY KEY (id),
  CONSTRAINT staff_messages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT staff_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id),
  CONSTRAINT staff_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id)
);

CREATE TABLE public.collaboration_activity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  activity_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text,
  mentions uuid[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT collaboration_activity_pkey PRIMARY KEY (id),
  CONSTRAINT collaboration_activity_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT collaboration_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.active_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  current_route text,
  current_resource_type text,
  current_resource_id uuid,
  ip_address text,
  user_agent text,
  device_type text,
  last_activity_at timestamp with time zone DEFAULT now(),
  session_started_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT active_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT active_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT active_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE public.resource_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  locked_by_user_id uuid NOT NULL,
  locked_by_session_id uuid,
  lock_reason text DEFAULT 'editing'::text,
  acquired_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '00:15:00'::interval),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resource_locks_pkey PRIMARY KEY (id),
  CONSTRAINT resource_locks_locked_by_user_id_fkey FOREIGN KEY (locked_by_user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT resource_locks_locked_by_session_id_fkey FOREIGN KEY (locked_by_session_id) REFERENCES public.active_sessions(id) ON DELETE CASCADE
);

-- ============================================================================
-- STAFF PERFORMANCE (1 table)
-- ============================================================================

CREATE TABLE public.staff_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  total_scans integer DEFAULT 0,
  successful_scans integer DEFAULT 0,
  failed_scans integer DEFAULT 0,
  error_count integer DEFAULT 0,
  scans_per_hour numeric DEFAULT 0,
  avg_scan_time_ms integer DEFAULT 0,
  efficiency_score numeric DEFAULT 0,
  shift_start timestamp with time zone,
  shift_end timestamp with time zone,
  break_time_minutes integer DEFAULT 0,
  last_scan_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_performance_pkey PRIMARY KEY (id),
  CONSTRAINT staff_performance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT staff_performance_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

-- ============================================================================
-- SYSTEM MONITORING (2 tables)
-- ============================================================================

CREATE TABLE public.system_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  alert_type text NOT NULL CHECK (alert_type = ANY (ARRAY['capacity'::text, 'fraud'::text, 'system'::text, 'emergency'::text, 'staff'::text])),
  severity text NOT NULL CHECK (severity = ANY (ARRAY['info'::text, 'warning'::text, 'error'::text, 'critical'::text])),
  message text NOT NULL,
  data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  CONSTRAINT system_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT system_alerts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT system_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id)
);

CREATE TABLE public.system_health_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  auto_healing_rate numeric DEFAULT 0,
  intervention_required integer DEFAULT 0,
  issues_auto_resolved integer DEFAULT 0,
  self_recovery_count integer DEFAULT 0,
  uptime_percentage numeric DEFAULT 100,
  last_auto_cleanup_at timestamp with time zone,
  next_maintenance_cycle_at timestamp with time zone,
  health_details jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_health_logs_pkey PRIMARY KEY (id),
  CONSTRAINT system_health_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- ============================================================================
-- EXPORT & REPORTING (2 tables)
-- ============================================================================

CREATE TABLE public.export_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  user_id uuid NOT NULL,
  export_type text NOT NULL,
  format text NOT NULL CHECK (format = ANY (ARRAY['csv'::text, 'pdf'::text, 'excel'::text, 'json'::text])),
  filters jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  file_url text,
  error_message text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT export_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT export_jobs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT export_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.scheduled_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  user_id uuid NOT NULL,
  template_id text NOT NULL,
  template_name text NOT NULL,
  schedule text NOT NULL CHECK (schedule = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])),
  recipients text[] NOT NULL,
  is_active boolean DEFAULT true,
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduled_reports_pkey PRIMARY KEY (id),
  CONSTRAINT scheduled_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT scheduled_reports_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

-- ============================================================================
-- PERFORMANCE CACHING (2 tables - materialized views created separately)
-- ============================================================================

CREATE TABLE public.event_metrics_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE,
  total_wristbands integer DEFAULT 0,
  total_checkins integer DEFAULT 0,
  unique_attendees integer DEFAULT 0,
  checkin_rate numeric DEFAULT 0,
  peak_hour timestamp with time zone,
  peak_hour_checkins integer DEFAULT 0,
  avg_checkins_per_hour numeric DEFAULT 0,
  avg_processing_time_ms numeric DEFAULT 0,
  total_processing_time_ms bigint DEFAULT 0,
  total_gates integer DEFAULT 0,
  active_gates integer DEFAULT 0,
  avg_gate_health numeric DEFAULT 0,
  total_fraud_alerts integer DEFAULT 0,
  critical_fraud_alerts integer DEFAULT 0,
  last_computed_at timestamp with time zone DEFAULT now(),
  computation_time_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_metrics_cache_pkey PRIMARY KEY (id),
  CONSTRAINT event_metrics_cache_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

CREATE TABLE public.category_analytics_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  category text NOT NULL,
  total_wristbands integer DEFAULT 0,
  total_checkins integer DEFAULT 0,
  unique_attendees integer DEFAULT 0,
  checkin_rate numeric DEFAULT 0,
  checkins_by_hour jsonb DEFAULT '{}'::jsonb,
  checkins_by_gate jsonb DEFAULT '{}'::jsonb,
  last_computed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT category_analytics_cache_pkey PRIMARY KEY (id),
  CONSTRAINT category_analytics_cache_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Tables after 3c: ' || COUNT(*)::text as status
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show 54 tables (43 + 11)
