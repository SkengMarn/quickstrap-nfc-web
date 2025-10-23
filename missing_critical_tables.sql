-- =====================================================
-- MISSING CRITICAL TABLES - QUICKSTRAP RESTORATION
-- =====================================================
-- These tables are referenced in your code but missing from the schema

-- 1. FRAUD_DETECTIONS TABLE (Critical - FraudDetectionPage broken without this)
CREATE TABLE IF NOT EXISTS public.fraud_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  wristband_id text NOT NULL,
  detection_type text NOT NULL,
  severity text DEFAULT 'medium',
  description text,
  detected_at timestamptz DEFAULT now(),
  investigated_at timestamptz,
  investigated_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}',
  organization_id uuid
);

-- 2. WRISTBAND_BLOCKS TABLE (Critical - Blocking functionality broken)
CREATE TABLE IF NOT EXISTS public.wristband_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wristband_id uuid REFERENCES public.wristbands(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  blocked_by uuid REFERENCES auth.users(id),
  blocked_at timestamptz DEFAULT now(),
  unblocked_at timestamptz,
  unblocked_by uuid REFERENCES auth.users(id),
  reason text,
  is_active boolean DEFAULT true,
  organization_id uuid
);

-- 3. GATES TABLE (Critical - Analytics service expects this)
CREATE TABLE IF NOT EXISTS public.gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id text UNIQUE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  name text,
  location text,
  location_lat decimal,
  location_lng decimal,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  organization_id uuid,
  is_active boolean DEFAULT true
);

-- 4. AUDIT_LOG TABLE (Referenced in staffService.ts)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  organization_id uuid
);

-- 5. SYSTEM_SETTINGS TABLE (Global configuration)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- 6. SECURITY_INCIDENTS TABLE (Security tracking)
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type text NOT NULL,
  severity text DEFAULT 'medium',
  description text,
  event_id uuid REFERENCES public.events(id),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'open',
  metadata jsonb DEFAULT '{}',
  organization_id uuid
);

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_fraud_detections_event ON public.fraud_detections(event_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_status ON public.fraud_detections(status);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_detected ON public.fraud_detections(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_org ON public.fraud_detections(organization_id);

CREATE INDEX IF NOT EXISTS idx_wristband_blocks_wristband ON public.wristband_blocks(wristband_id);
CREATE INDEX IF NOT EXISTS idx_wristband_blocks_event ON public.wristband_blocks(event_id);
CREATE INDEX IF NOT EXISTS idx_wristband_blocks_active ON public.wristband_blocks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_wristband_blocks_org ON public.wristband_blocks(organization_id);

CREATE INDEX IF NOT EXISTS idx_gates_event ON public.gates(event_id);
CREATE INDEX IF NOT EXISTS idx_gates_gate_id ON public.gates(gate_id);
CREATE INDEX IF NOT EXISTS idx_gates_status ON public.gates(status);
CREATE INDEX IF NOT EXISTS idx_gates_org ON public.gates(organization_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_event ON public.audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON public.audit_log(organization_id);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON public.system_settings(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON public.security_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_detected ON public.security_incidents(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_org ON public.security_incidents(organization_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.fraud_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wristband_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR FRAUD_DETECTIONS
CREATE POLICY "Users can view fraud detections for their organization" ON public.fraud_detections
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create fraud detections for their organization" ON public.fraud_detections
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update fraud detections for their organization" ON public.fraud_detections
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS POLICIES FOR WRISTBAND_BLOCKS
CREATE POLICY "Users can view wristband blocks for their organization" ON public.wristband_blocks
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can create wristband blocks for their organization" ON public.wristband_blocks
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update wristband blocks for their organization" ON public.wristband_blocks
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS POLICIES FOR GATES
CREATE POLICY "Users can view gates for their organization" ON public.gates
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage gates for their organization" ON public.gates
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS POLICIES FOR AUDIT_LOG
CREATE POLICY "Users can view audit logs for their organization" ON public.audit_log
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "System can create audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- RLS POLICIES FOR SYSTEM_SETTINGS
CREATE POLICY "Users can view public system settings" ON public.system_settings
  FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND access_level = 'admin'
    )
  );

-- RLS POLICIES FOR SECURITY_INCIDENTS
CREATE POLICY "Users can view security incidents for their organization" ON public.security_incidents
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "System can create security incidents" ON public.security_incidents
  FOR INSERT WITH CHECK (true);

-- GRANT PERMISSIONS
GRANT ALL ON public.fraud_detections TO authenticated;
GRANT ALL ON public.wristband_blocks TO authenticated;
GRANT ALL ON public.gates TO authenticated;
GRANT ALL ON public.audit_log TO authenticated;
GRANT ALL ON public.system_settings TO authenticated;
GRANT ALL ON public.security_incidents TO authenticated;

-- CREATE MISSING MATERIALIZED VIEW: EVENT_ANALYTICS
CREATE MATERIALIZED VIEW IF NOT EXISTS public.event_analytics AS
SELECT 
  e.id as event_id,
  e.name,
  e.start_date,
  e.end_date,
  e.organization_id,
  COUNT(DISTINCT w.id) as total_wristbands,
  COUNT(DISTINCT cl.id) as total_checkins,
  COUNT(DISTINCT cl.staff_id) as unique_staff,
  COUNT(DISTINCT g.id) as total_gates,
  COUNT(DISTINCT DATE(cl.checked_in_at)) as active_days,
  COALESCE(ROUND((COUNT(DISTINCT cl.id)::decimal / NULLIF(COUNT(DISTINCT w.id), 0)) * 100, 2), 0) as attendance_rate,
  MIN(cl.checked_in_at) as first_checkin,
  MAX(cl.checked_in_at) as last_checkin,
  COUNT(DISTINCT fd.id) as fraud_alerts,
  COUNT(DISTINCT wb.id) as blocked_wristbands,
  now() as last_updated
FROM public.events e
LEFT JOIN public.wristbands w ON e.id = w.event_id
LEFT JOIN public.checkin_logs cl ON e.id = cl.event_id
LEFT JOIN public.gates g ON e.id = g.event_id
LEFT JOIN public.fraud_detections fd ON e.id = fd.event_id
LEFT JOIN public.wristband_blocks wb ON e.id = wb.event_id AND wb.is_active = true
WHERE e.is_active = true
GROUP BY e.id, e.name, e.start_date, e.end_date, e.organization_id;

-- Create index on event_analytics materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_analytics_event_id ON public.event_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_event_analytics_org ON public.event_analytics(organization_id);

-- Grant access to the view
GRANT SELECT ON public.event_analytics TO authenticated;

-- REFRESH FUNCTION FOR EVENT_ANALYTICS
CREATE OR REPLACE FUNCTION refresh_event_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.event_analytics;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION refresh_event_analytics TO authenticated;
