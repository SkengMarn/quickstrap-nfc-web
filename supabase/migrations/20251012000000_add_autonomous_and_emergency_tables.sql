-- ============================================================================
-- AUTONOMOUS OPERATIONS & EMERGENCY MANAGEMENT TABLES
-- ============================================================================
-- This migration adds tables for:
-- 1. Autonomous Gate Operations & AI Decision Tracking
-- 2. Emergency Incident Management
-- 3. System Health & Performance Monitoring
-- ============================================================================

-- ============================================================================
-- 1. AUTONOMOUS OPERATIONS
-- ============================================================================

-- Autonomous AI events log
CREATE TABLE IF NOT EXISTS public.autonomous_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,

  -- Event type
  event_type text NOT NULL CHECK (event_type IN (
    'gate_creation',
    'gate_merge',
    'threshold_adjustment',
    'anomaly_detection',
    'performance_optimization',
    'auto_correction',
    'prediction'
  )),

  -- Event details
  action text NOT NULL,
  reasoning text,
  impact text,
  confidence_score numeric(5,4) NOT NULL,

  -- Metadata
  metadata jsonb DEFAULT '{}',
  automated boolean DEFAULT true,
  requires_review boolean DEFAULT false,

  -- Review/validation
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_status text CHECK (review_status IN ('approved', 'rejected', 'modified')),

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_autonomous_events_org ON public.autonomous_events(organization_id);
CREATE INDEX idx_autonomous_events_event ON public.autonomous_events(event_id);
CREATE INDEX idx_autonomous_events_type ON public.autonomous_events(event_type);
CREATE INDEX idx_autonomous_events_created ON public.autonomous_events(created_at DESC);

-- Autonomous gate views (gates managed by AI)
CREATE TABLE IF NOT EXISTS public.autonomous_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id uuid NOT NULL REFERENCES gates(id) ON DELETE CASCADE UNIQUE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Status
  status text DEFAULT 'learning' CHECK (status IN ('active', 'learning', 'optimizing', 'maintenance', 'paused')),

  -- AI metrics
  confidence_score numeric(5,4) DEFAULT 0.5,
  confidence_history jsonb DEFAULT '[]', -- Array of historical confidence scores

  -- Performance
  decisions_count integer DEFAULT 0,
  decisions_today integer DEFAULT 0,
  accuracy_rate numeric(5,4) DEFAULT 0,

  -- Last decision
  last_decision_at timestamptz,
  last_decision_type text,

  -- Performance metrics
  avg_response_time_ms integer DEFAULT 0,
  total_processed integer DEFAULT 0,
  success_rate numeric(5,4) DEFAULT 1.0,

  -- AI learning
  learning_started_at timestamptz DEFAULT now(),
  last_optimization_at timestamptz,
  optimization_count integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_autonomous_gates_gate ON public.autonomous_gates(gate_id);
CREATE INDEX idx_autonomous_gates_event ON public.autonomous_gates(event_id);
CREATE INDEX idx_autonomous_gates_org ON public.autonomous_gates(organization_id);
CREATE INDEX idx_autonomous_gates_status ON public.autonomous_gates(status);

-- Gate merge suggestions
CREATE TABLE IF NOT EXISTS public.gate_merge_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  primary_gate_id uuid NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
  secondary_gate_id uuid NOT NULL REFERENCES gates(id) ON DELETE CASCADE,

  -- Suggestion details
  confidence_score numeric(5,4) NOT NULL,
  reasoning text NOT NULL,
  distance_meters numeric(10,2),
  traffic_similarity numeric(5,4),

  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_applied')),

  -- Resolution
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,

  suggested_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gate_merge_event ON public.gate_merge_suggestions(event_id);
CREATE INDEX idx_gate_merge_status ON public.gate_merge_suggestions(status);
CREATE INDEX idx_gate_merge_suggested ON public.gate_merge_suggestions(suggested_at DESC);

-- System health monitoring
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Health metrics
  auto_healing_rate numeric(5,4) DEFAULT 0,
  intervention_required integer DEFAULT 0,
  issues_auto_resolved integer DEFAULT 0,
  self_recovery_count integer DEFAULT 0,
  uptime_percentage numeric(5,4) DEFAULT 100,

  -- Timestamps
  last_auto_cleanup_at timestamptz,
  next_maintenance_cycle_at timestamptz,

  -- Details
  health_details jsonb DEFAULT '{}',

  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_system_health_org ON public.system_health_logs(organization_id);
CREATE INDEX idx_system_health_recorded ON public.system_health_logs(recorded_at DESC);

-- Predictive insights
CREATE TABLE IF NOT EXISTS public.predictive_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,

  -- Insight type
  insight_type text NOT NULL CHECK (insight_type IN (
    'capacity_warning',
    'peak_prediction',
    'bottleneck_alert',
    'optimization_suggestion',
    'staffing_recommendation'
  )),

  -- Insight details
  message text NOT NULL,
  confidence_score numeric(5,4) NOT NULL,
  impact_level text NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),

  -- Timing
  predicted_time timestamptz,
  valid_until timestamptz,

  -- Actions
  suggested_actions jsonb DEFAULT '[]', -- Array of suggested action strings

  -- Status
  is_active boolean DEFAULT true,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,

  -- Accuracy tracking
  was_accurate boolean,
  actual_outcome jsonb,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_predictive_insights_org ON public.predictive_insights(organization_id);
CREATE INDEX idx_predictive_insights_event ON public.predictive_insights(event_id);
CREATE INDEX idx_predictive_insights_type ON public.predictive_insights(insight_type);
CREATE INDEX idx_predictive_insights_active ON public.predictive_insights(is_active) WHERE is_active = true;

-- Adaptive thresholds log
CREATE TABLE IF NOT EXISTS public.adaptive_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,

  -- Threshold values
  duplicate_distance_meters integer DEFAULT 25,
  promotion_sample_size integer DEFAULT 100,
  confidence_threshold numeric(5,4) DEFAULT 0.85,
  velocity_threshold_ms integer DEFAULT 5000,

  -- Optimization history
  last_optimization_at timestamptz DEFAULT now(),
  optimization_history jsonb DEFAULT '[]', -- Array of optimization events

  -- Performance impact
  performance_improvement numeric(5,4) DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_adaptive_thresholds_org ON public.adaptive_thresholds(organization_id);
CREATE INDEX idx_adaptive_thresholds_event ON public.adaptive_thresholds(event_id);

-- ============================================================================
-- 2. EMERGENCY INCIDENT MANAGEMENT
-- ============================================================================

-- Emergency incidents
CREATE TABLE IF NOT EXISTS public.emergency_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Incident details
  incident_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  location text,
  description text NOT NULL,

  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'closed')),

  -- Reporting
  reported_by text,
  reported_by_user_id uuid REFERENCES auth.users(id),
  reported_at timestamptz DEFAULT now(),

  -- Response
  responders text[], -- Array of responder names/IDs
  assigned_to uuid REFERENCES auth.users(id),
  response_started_at timestamptz,

  -- Impact
  estimated_affected integer DEFAULT 0,
  actual_affected integer,

  -- Resolution
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,

  -- Evidence & logs
  evidence jsonb DEFAULT '[]',
  action_log jsonb DEFAULT '[]', -- Timeline of actions taken

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_emergency_incidents_org ON public.emergency_incidents(organization_id);
CREATE INDEX idx_emergency_incidents_event ON public.emergency_incidents(event_id);
CREATE INDEX idx_emergency_incidents_status ON public.emergency_incidents(status);
CREATE INDEX idx_emergency_incidents_severity ON public.emergency_incidents(severity);
CREATE INDEX idx_emergency_incidents_reported ON public.emergency_incidents(reported_at DESC);

-- Emergency actions log (audit trail)
CREATE TABLE IF NOT EXISTS public.emergency_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  incident_id uuid REFERENCES emergency_incidents(id) ON DELETE SET NULL,

  -- Action details
  action_type text NOT NULL CHECK (action_type IN (
    'lockdown',
    'evacuation',
    'broadcast',
    'staff_alert',
    'system_shutdown',
    'gate_control',
    'access_restriction'
  )),
  action_title text NOT NULL,
  action_description text,

  -- Severity & impact
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  estimated_impact text,
  actual_impact text,

  -- Execution
  executed_by uuid NOT NULL REFERENCES auth.users(id),
  executed_at timestamptz DEFAULT now(),
  completed_at timestamptz,

  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'cancelled')),

  -- Results
  result_details jsonb DEFAULT '{}',
  affected_gates uuid[],
  affected_users uuid[],

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_emergency_actions_org ON public.emergency_actions(organization_id);
CREATE INDEX idx_emergency_actions_event ON public.emergency_actions(event_id);
CREATE INDEX idx_emergency_actions_incident ON public.emergency_actions(incident_id);
CREATE INDEX idx_emergency_actions_type ON public.emergency_actions(action_type);
CREATE INDEX idx_emergency_actions_executed ON public.emergency_actions(executed_at DESC);

-- Emergency status tracking
CREATE TABLE IF NOT EXISTS public.emergency_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  -- Status
  alert_level text DEFAULT 'normal' CHECK (alert_level IN ('normal', 'elevated', 'high', 'critical')),
  is_active boolean DEFAULT false,

  -- Counts
  active_incidents integer DEFAULT 0,
  systems_locked boolean DEFAULT false,
  evacuation_status text DEFAULT 'none' CHECK (evacuation_status IN ('none', 'partial', 'full')),

  -- Timestamps
  last_updated_at timestamptz DEFAULT now(),
  alert_started_at timestamptz,
  alert_cleared_at timestamptz,

  -- Details
  status_details jsonb DEFAULT '{}',

  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_emergency_status_org ON public.emergency_status(organization_id);
CREATE INDEX idx_emergency_status_active ON public.emergency_status(is_active) WHERE is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.autonomous_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_merge_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_status ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view their organization's data
CREATE POLICY "Users can view org autonomous events"
  ON public.autonomous_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can view org autonomous gates"
  ON public.autonomous_gates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can view org emergency incidents"
  ON public.emergency_incidents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Staff can manage incidents"
  ON public.emergency_incidents FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'staff') AND status = 'active'
    )
  );

CREATE POLICY "Staff can create emergency actions"
  ON public.emergency_actions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'staff') AND status = 'active'
    )
  );

CREATE POLICY "Users can view emergency actions"
  ON public.emergency_actions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can view gate merge suggestions"
  ON public.gate_merge_suggestions FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      INNER JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Admins can manage merge suggestions"
  ON public.gate_merge_suggestions FOR ALL
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      INNER JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'manager') AND om.status = 'active'
    )
  );

CREATE POLICY "Users can view system health logs"
  ON public.system_health_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "System can insert health logs"
  ON public.system_health_logs FOR INSERT
  WITH CHECK (true); -- Allow system to insert health logs

CREATE POLICY "Users can view predictive insights"
  ON public.predictive_insights FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "System can manage insights"
  ON public.predictive_insights FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can view adaptive thresholds"
  ON public.adaptive_thresholds FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can manage thresholds"
  ON public.adaptive_thresholds FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager') AND status = 'active'
    )
  );

CREATE POLICY "Users can view emergency status"
  ON public.emergency_status FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Staff can update emergency status"
  ON public.emergency_status FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'staff') AND status = 'active'
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.autonomous_events TO authenticated;
GRANT SELECT ON public.autonomous_gates TO authenticated;
GRANT SELECT ON public.gate_merge_suggestions TO authenticated;
GRANT SELECT ON public.system_health_logs TO authenticated;
GRANT SELECT ON public.predictive_insights TO authenticated;
GRANT SELECT ON public.adaptive_thresholds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.emergency_incidents TO authenticated;
GRANT SELECT, INSERT ON public.emergency_actions TO authenticated;
GRANT SELECT, UPDATE ON public.emergency_status TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.autonomous_events IS 'Log of AI-driven autonomous system events and decisions';
COMMENT ON TABLE public.autonomous_gates IS 'Gates managed by AI with performance tracking';
COMMENT ON TABLE public.gate_merge_suggestions IS 'AI-suggested gate merges based on proximity and traffic';
COMMENT ON TABLE public.system_health_logs IS 'System health and auto-healing metrics over time';
COMMENT ON TABLE public.predictive_insights IS 'AI-generated predictive insights and warnings';
COMMENT ON TABLE public.adaptive_thresholds IS 'Self-optimizing threshold values for fraud detection';
COMMENT ON TABLE public.emergency_incidents IS 'Emergency incidents and their response tracking';
COMMENT ON TABLE public.emergency_actions IS 'Audit trail of emergency actions executed';
COMMENT ON TABLE public.emergency_status IS 'Current emergency alert status per organization';
