-- ============================================================================
-- MISSING TABLES MIGRATION
-- Adds tables required by the Portal UI components
-- Compatible with existing schema
-- ============================================================================

-- ============================================================================
-- 1. FRAUD DETECTION & SECURITY
-- ============================================================================

-- Fraud detection records
CREATE TABLE IF NOT EXISTS public.fraud_detections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  wristband_id uuid,
  detection_type text NOT NULL CHECK (detection_type IN ('multiple_checkins', 'impossible_location', 'blocked_attempt', 'suspicious_pattern')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  investigated_at timestamp with time zone,
  investigated_by uuid,
  CONSTRAINT fraud_detections_pkey PRIMARY KEY (id),
  CONSTRAINT fraud_detections_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT fraud_detections_wristband_id_fkey FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id) ON DELETE SET NULL,
  CONSTRAINT fraud_detections_investigated_by_fkey FOREIGN KEY (investigated_by) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_fraud_detections_event_id ON public.fraud_detections(event_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_wristband_id ON public.fraud_detections(wristband_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_severity ON public.fraud_detections(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_created_at ON public.fraud_detections(created_at DESC);

-- Blocked wristbands
CREATE TABLE IF NOT EXISTS public.wristband_blocks (
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

CREATE INDEX IF NOT EXISTS idx_wristband_blocks_wristband_id ON public.wristband_blocks(wristband_id);
CREATE INDEX IF NOT EXISTS idx_wristband_blocks_event_id ON public.wristband_blocks(event_id);

-- ============================================================================
-- 2. SYSTEM ALERTS & NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('capacity', 'fraud', 'system', 'emergency', 'staff')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
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

CREATE INDEX IF NOT EXISTS idx_system_alerts_event_id ON public.system_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON public.system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON public.system_alerts(created_at DESC);

-- ============================================================================
-- 3. STAFF PERFORMANCE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_performance (
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
  CONSTRAINT staff_performance_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT staff_performance_unique UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_performance_event_id ON public.staff_performance(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_user_id ON public.staff_performance(user_id);

-- Cache table for performance (referenced in export service)
CREATE TABLE IF NOT EXISTS public.staff_performance_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  total_scans integer DEFAULT 0,
  successful_scans integer DEFAULT 0,
  error_rate numeric DEFAULT 0,
  scans_per_hour numeric DEFAULT 0,
  efficiency_score numeric DEFAULT 0,
  hours_worked numeric DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_performance_cache_pkey PRIMARY KEY (id),
  CONSTRAINT staff_performance_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT staff_performance_cache_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

-- ============================================================================
-- 4. EXPORT & REPORTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.export_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  user_id uuid NOT NULL,
  export_type text NOT NULL,
  format text NOT NULL CHECK (format IN ('csv', 'pdf', 'excel', 'json')),
  filters jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url text,
  error_message text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT export_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT export_jobs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT export_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON public.export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_event_id ON public.export_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON public.export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON public.export_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid,
  user_id uuid NOT NULL,
  template_id text NOT NULL,
  template_name text NOT NULL,
  schedule text NOT NULL CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  recipients text[] NOT NULL,
  is_active boolean DEFAULT true,
  last_run_at timestamp with time zone,
  next_run_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduled_reports_pkey PRIMARY KEY (id),
  CONSTRAINT scheduled_reports_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT scheduled_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_event_id ON public.scheduled_reports(event_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_is_active ON public.scheduled_reports(is_active);

-- ============================================================================
-- 5. AUDIT LOGGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
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
  CONSTRAINT audit_log_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL,
  CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_id ON public.audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- ============================================================================
-- 6. ADDITIONAL FEATURES
-- ============================================================================

-- Gate merges (for gate management interface)
CREATE TABLE IF NOT EXISTS public.gate_merges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  source_gate_id uuid NOT NULL,
  target_gate_id uuid NOT NULL,
  merged_at timestamp with time zone DEFAULT now(),
  merged_by uuid NOT NULL,
  reason text,
  CONSTRAINT gate_merges_pkey PRIMARY KEY (id),
  CONSTRAINT gate_merges_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT gate_merges_source_gate_id_fkey FOREIGN KEY (source_gate_id) REFERENCES public.gates(id) ON DELETE CASCADE,
  CONSTRAINT gate_merges_target_gate_id_fkey FOREIGN KEY (target_gate_id) REFERENCES public.gates(id) ON DELETE CASCADE,
  CONSTRAINT gate_merges_merged_by_fkey FOREIGN KEY (merged_by) REFERENCES auth.users(id)
);

-- Staff messages (for staff communication)
CREATE TABLE IF NOT EXISTS public.staff_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid,
  message text NOT NULL,
  is_broadcast boolean DEFAULT false,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_messages_pkey PRIMARY KEY (id),
  CONSTRAINT staff_messages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT staff_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id),
  CONSTRAINT staff_messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_staff_messages_event_id ON public.staff_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_recipient_id ON public.staff_messages(recipient_id);

-- ============================================================================
-- 7. UPDATE EXISTING TABLES
-- ============================================================================

-- Add missing columns to checkin_logs if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkin_logs' AND column_name = 'status') THEN
    ALTER TABLE public.checkin_logs ADD COLUMN status text DEFAULT 'success' CHECK (status IN ('success', 'denied', 'fraud', 'error'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkin_logs' AND column_name = 'processing_time_ms') THEN
    ALTER TABLE public.checkin_logs ADD COLUMN processing_time_ms integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkin_logs' AND column_name = 'is_test_data') THEN
    ALTER TABLE public.checkin_logs ADD COLUMN is_test_data boolean DEFAULT false;
  END IF;
END $$;

-- Add missing columns to wristbands if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wristbands' AND column_name = 'attendee_name') THEN
    ALTER TABLE public.wristbands ADD COLUMN attendee_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wristbands' AND column_name = 'attendee_email') THEN
    ALTER TABLE public.wristbands ADD COLUMN attendee_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wristbands' AND column_name = 'status') THEN
    ALTER TABLE public.wristbands ADD COLUMN status text DEFAULT 'activated' CHECK (status IN ('pending', 'activated', 'checked-in', 'deactivated', 'blocked'));
  END IF;
END $$;

-- Add missing columns to gates if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gates' AND column_name = 'status') THEN
    ALTER TABLE public.gates ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gates' AND column_name = 'health_score') THEN
    ALTER TABLE public.gates ADD COLUMN health_score integer DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gates' AND column_name = 'location_description') THEN
    ALTER TABLE public.gates ADD COLUMN location_description text;
  END IF;
END $$;

-- Add config column to events if it doesn't exist (for event configuration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'config') THEN
    ALTER TABLE public.events ADD COLUMN config jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add missing column to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;
END $$;

-- ============================================================================
-- 8. MATERIALIZED VIEW FOR ANALYTICS
-- ============================================================================

-- Drop and recreate materialized view for event analytics
DROP MATERIALIZED VIEW IF EXISTS public.event_analytics;

CREATE MATERIALIZED VIEW public.event_analytics AS
SELECT
  e.id as event_id,
  e.name as event_name,
  COUNT(DISTINCT w.id) as total_wristbands,
  COUNT(DISTINCT CASE WHEN w.status = 'activated' THEN w.id END) as activated_wristbands,
  COUNT(DISTINCT cl.id) as total_checkins,
  COUNT(DISTINCT cl.wristband_id) as unique_attendees,
  COUNT(DISTINCT g.id) as total_gates,
  AVG(cl.processing_time_ms) as avg_processing_time_ms,
  MIN(cl.timestamp) as first_checkin,
  MAX(cl.timestamp) as last_checkin,
  e.start_date,
  e.end_date,
  e.total_capacity
FROM public.events e
LEFT JOIN public.wristbands w ON w.event_id = e.id
LEFT JOIN public.checkin_logs cl ON cl.event_id = e.id AND cl.is_test_data = false
LEFT JOIN public.gates g ON g.event_id = e.id
GROUP BY e.id, e.name, e.start_date, e.end_date, e.total_capacity;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_analytics_event_id ON public.event_analytics(event_id);

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to refresh event analytics
CREATE OR REPLACE FUNCTION refresh_event_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.event_analytics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS (adjust as needed for your RLS policies)
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.fraud_detections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wristband_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.system_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_performance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_performance_cache TO authenticated;
GRANT SELECT, INSERT ON public.export_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.scheduled_reports TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT SELECT, INSERT ON public.gate_merges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_messages TO authenticated;
GRANT SELECT ON public.event_analytics TO authenticated;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.fraud_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wristband_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BASIC RLS POLICIES (customize based on your security requirements)
-- ============================================================================

-- Fraud detections: Users can view fraud for events they have access to
CREATE POLICY fraud_detections_select ON public.fraud_detections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.event_access
      WHERE event_access.event_id = fraud_detections.event_id
      AND event_access.user_id = auth.uid()
    )
  );

CREATE POLICY fraud_detections_insert ON public.fraud_detections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_access
      WHERE event_access.event_id = fraud_detections.event_id
      AND event_access.user_id = auth.uid()
    )
  );

-- Similar policies for other tables...
-- (Add more specific policies based on your access control requirements)

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE public.fraud_detections IS 'Stores fraud detection alerts and investigations';
COMMENT ON TABLE public.system_alerts IS 'System-wide alerts and notifications';
COMMENT ON TABLE public.staff_performance IS 'Staff performance metrics per event';
COMMENT ON TABLE public.export_jobs IS 'Export job queue and history';
COMMENT ON TABLE public.scheduled_reports IS 'Automated report schedules';
COMMENT ON TABLE public.audit_log IS 'Audit trail for compliance';

-- Migration complete!
SELECT 'Missing tables migration completed successfully!' as status;
