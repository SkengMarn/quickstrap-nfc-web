-- ============================================================================
-- PHASE 2: INTELLIGENCE - Event Templates, Caching, Fraud Prevention, ML
-- ============================================================================
-- This migration implements:
-- 1. Event Templates & Cloning
-- 2. Intelligent Caching & Performance Layer
-- 3. Advanced Fraud Prevention System
-- 4. Predictive Analytics & ML
-- ============================================================================

-- ============================================================================
-- 1. EVENT TEMPLATES & CLONING
-- ============================================================================

-- Event templates
CREATE TABLE public.event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template info
  name text NOT NULL,
  description text,
  category text, -- 'festival', 'conference', 'wedding', 'sports', 'corporate'

  -- Template data (JSON snapshot of event configuration)
  template_data jsonb NOT NULL DEFAULT '{}',

  -- Visibility
  is_public boolean DEFAULT false, -- Available in marketplace
  is_featured boolean DEFAULT false,
  usage_count integer DEFAULT 0,

  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_event_templates_org ON public.event_templates(organization_id);
CREATE INDEX idx_event_templates_category ON public.event_templates(category);
CREATE INDEX idx_event_templates_public ON public.event_templates(is_public) WHERE is_public = true;

-- Template gates (pre-configured gate layouts)
CREATE TABLE public.template_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,

  -- Gate configuration
  name text NOT NULL,
  gate_type text,
  location_description text,
  category_bindings jsonb DEFAULT '[]',

  -- Position in template
  sort_order integer DEFAULT 0,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_template_gates_template ON public.template_gates(template_id);

-- Template categories (standard category setups)
CREATE TABLE public.template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,

  -- Category info
  name text NOT NULL,
  description text,
  color text,

  -- Limits
  max_capacity integer,

  -- Position
  sort_order integer DEFAULT 0,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_template_categories_template ON public.template_categories(template_id);

-- Event cloning history (track what was cloned from what)
CREATE TABLE public.event_clones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  source_template_id uuid REFERENCES event_templates(id) ON DELETE SET NULL,
  cloned_event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- What was cloned
  cloned_settings boolean DEFAULT true,
  cloned_gates boolean DEFAULT true,
  cloned_categories boolean DEFAULT true,
  cloned_wristbands boolean DEFAULT false,

  -- Metadata
  cloned_by uuid REFERENCES auth.users(id),
  cloned_at timestamptz DEFAULT now()
);

CREATE INDEX idx_event_clones_source_event ON public.event_clones(source_event_id);
CREATE INDEX idx_event_clones_source_template ON public.event_clones(source_template_id);
CREATE INDEX idx_event_clones_cloned_event ON public.event_clones(cloned_event_id);

-- ============================================================================
-- 2. INTELLIGENT CACHING & PERFORMANCE LAYER
-- ============================================================================

-- Event metrics cache (pre-computed statistics)
CREATE TABLE public.event_metrics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE UNIQUE,

  -- Attendance metrics
  total_wristbands integer DEFAULT 0,
  total_checkins integer DEFAULT 0,
  unique_attendees integer DEFAULT 0,
  checkin_rate numeric(5,2) DEFAULT 0, -- Percentage

  -- Time metrics
  peak_hour timestamptz,
  peak_hour_checkins integer DEFAULT 0,
  avg_checkins_per_hour numeric(10,2) DEFAULT 0,

  -- Performance metrics
  avg_processing_time_ms numeric(10,2) DEFAULT 0,
  total_processing_time_ms bigint DEFAULT 0,

  -- Gate metrics
  total_gates integer DEFAULT 0,
  active_gates integer DEFAULT 0,
  avg_gate_health numeric(5,2) DEFAULT 0,

  -- Fraud metrics
  total_fraud_alerts integer DEFAULT 0,
  critical_fraud_alerts integer DEFAULT 0,

  -- Cache metadata
  last_computed_at timestamptz DEFAULT now(),
  computation_time_ms integer,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_event_metrics_cache_event ON public.event_metrics_cache(event_id);
CREATE INDEX idx_event_metrics_cache_updated ON public.event_metrics_cache(updated_at);

-- Gate performance cache
CREATE TABLE public.gate_performance_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id uuid NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,

  -- Performance metrics
  total_scans integer DEFAULT 0,
  successful_scans integer DEFAULT 0,
  failed_scans integer DEFAULT 0,
  avg_scan_time_ms numeric(10,2) DEFAULT 0,

  -- Time analysis
  peak_hour timestamptz,
  peak_hour_scans integer DEFAULT 0,
  scans_per_hour numeric(10,2) DEFAULT 0,

  -- Health
  health_score numeric(5,2) DEFAULT 100,
  last_scan_at timestamptz,
  uptime_percentage numeric(5,2) DEFAULT 100,

  -- Cache metadata
  last_computed_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(gate_id, event_id)
);

CREATE INDEX idx_gate_performance_cache_gate ON public.gate_performance_cache(gate_id);
CREATE INDEX idx_gate_performance_cache_event ON public.gate_performance_cache(event_id);

-- Category analytics cache
CREATE TABLE public.category_analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category text NOT NULL,

  -- Category metrics
  total_wristbands integer DEFAULT 0,
  total_checkins integer DEFAULT 0,
  unique_attendees integer DEFAULT 0,
  checkin_rate numeric(5,2) DEFAULT 0,

  -- Time distribution
  checkins_by_hour jsonb DEFAULT '{}', -- {hour: count}

  -- Gate distribution
  checkins_by_gate jsonb DEFAULT '{}', -- {gate_id: count}

  -- Cache metadata
  last_computed_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(event_id, category)
);

CREATE INDEX idx_category_analytics_cache_event ON public.category_analytics_cache(event_id);
CREATE INDEX idx_category_analytics_cache_category ON public.category_analytics_cache(category);

-- Function to refresh all caches for an event
CREATE OR REPLACE FUNCTION refresh_event_caches(p_event_id uuid)
RETURNS void AS $$
BEGIN
  -- Refresh event metrics cache
  INSERT INTO public.event_metrics_cache (
    event_id, total_wristbands, total_checkins, unique_attendees,
    checkin_rate, avg_processing_time_ms, last_computed_at
  )
  SELECT
    p_event_id,
    COUNT(DISTINCT w.id),
    COUNT(DISTINCT cl.id),
    COUNT(DISTINCT cl.wristband_id),
    CASE WHEN COUNT(DISTINCT w.id) > 0
      THEN (COUNT(DISTINCT cl.wristband_id)::numeric / COUNT(DISTINCT w.id) * 100)
      ELSE 0
    END,
    AVG(cl.processing_time_ms),
    now()
  FROM events e
  LEFT JOIN wristbands w ON w.event_id = e.id
  LEFT JOIN checkin_logs cl ON cl.event_id = e.id
  WHERE e.id = p_event_id
  GROUP BY e.id
  ON CONFLICT (event_id) DO UPDATE SET
    total_wristbands = EXCLUDED.total_wristbands,
    total_checkins = EXCLUDED.total_checkins,
    unique_attendees = EXCLUDED.unique_attendees,
    checkin_rate = EXCLUDED.checkin_rate,
    avg_processing_time_ms = EXCLUDED.avg_processing_time_ms,
    last_computed_at = EXCLUDED.last_computed_at,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. ADVANCED FRAUD PREVENTION SYSTEM
-- ============================================================================

-- Fraud detection rules (configurable)
CREATE TABLE public.fraud_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE, -- null = global rule

  -- Rule info
  name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type IN (
    'multiple_checkins',
    'velocity_check',
    'impossible_location',
    'time_pattern',
    'category_mismatch',
    'blacklist_check',
    'custom'
  )),

  -- Rule configuration
  config jsonb NOT NULL DEFAULT '{}',

  -- Scoring
  risk_score integer DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),

  -- Actions
  auto_block boolean DEFAULT false,
  auto_alert boolean DEFAULT true,
  alert_severity text DEFAULT 'medium' CHECK (alert_severity IN ('low', 'medium', 'high', 'critical')),

  -- Status
  is_active boolean DEFAULT true,

  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_fraud_rules_org ON public.fraud_rules(organization_id);
CREATE INDEX idx_fraud_rules_event ON public.fraud_rules(event_id);
CREATE INDEX idx_fraud_rules_active ON public.fraud_rules(is_active) WHERE is_active = true;

-- Fraud investigation cases
CREATE TABLE public.fraud_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  fraud_detection_id uuid REFERENCES fraud_detections(id) ON DELETE SET NULL,

  -- Case info
  case_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,

  -- Status
  status text DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'false_positive')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Assignment
  assigned_to uuid REFERENCES auth.users(id),
  assigned_at timestamptz,

  -- Resolution
  resolution_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,

  -- Evidence
  evidence jsonb DEFAULT '[]', -- Array of evidence items

  -- Related entities
  wristband_ids uuid[],
  user_ids uuid[],

  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_fraud_cases_event ON public.fraud_cases(event_id);
CREATE INDEX idx_fraud_cases_status ON public.fraud_cases(status);
CREATE INDEX idx_fraud_cases_assigned ON public.fraud_cases(assigned_to);
CREATE INDEX idx_fraud_cases_created ON public.fraud_cases(created_at);

-- Generate unique case number
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS text AS $$
DECLARE
  year text := to_char(now(), 'YY');
  month text := to_char(now(), 'MM');
  sequence integer;
BEGIN
  SELECT COUNT(*) + 1 INTO sequence
  FROM fraud_cases
  WHERE created_at >= date_trunc('month', now());

  RETURN 'FC-' || year || month || '-' || lpad(sequence::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate case number
CREATE OR REPLACE FUNCTION set_fraud_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL THEN
    NEW.case_number := generate_case_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_fraud_case_number_trigger
  BEFORE INSERT ON public.fraud_cases
  FOR EACH ROW
  EXECUTE FUNCTION set_fraud_case_number();

-- Watchlist (known problematic wristbands/users)
CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Entity on watchlist
  entity_type text NOT NULL CHECK (entity_type IN ('wristband', 'email', 'phone', 'ip_address')),
  entity_value text NOT NULL,

  -- Reason
  reason text NOT NULL,
  risk_level text DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Actions
  auto_block boolean DEFAULT false,
  auto_flag boolean DEFAULT true,

  -- Related cases
  related_case_ids uuid[],

  -- Status
  is_active boolean DEFAULT true,
  expires_at timestamptz,

  -- Metadata
  added_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, entity_type, entity_value)
);

CREATE INDEX idx_watchlist_org ON public.watchlist(organization_id);
CREATE INDEX idx_watchlist_entity ON public.watchlist(entity_type, entity_value);
CREATE INDEX idx_watchlist_active ON public.watchlist(is_active) WHERE is_active = true;

-- ============================================================================
-- 4. PREDICTIVE ANALYTICS & ML
-- ============================================================================

-- ML models metadata
CREATE TABLE public.ml_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Model info
  name text NOT NULL,
  model_type text NOT NULL CHECK (model_type IN (
    'attendance_forecast',
    'staffing_recommendation',
    'fraud_detection',
    'gate_optimization',
    'anomaly_detection'
  )),
  version text NOT NULL,

  -- Model configuration
  algorithm text, -- 'linear_regression', 'random_forest', 'neural_network', etc.
  hyperparameters jsonb DEFAULT '{}',

  -- Training info
  training_dataset_size integer,
  training_started_at timestamptz,
  training_completed_at timestamptz,
  training_duration_seconds integer,

  -- Performance metrics
  accuracy numeric(5,4),
  precision_score numeric(5,4),
  recall_score numeric(5,4),
  f1_score numeric(5,4),
  mean_absolute_error numeric(10,2),

  -- Model file
  model_storage_path text, -- S3/storage location
  model_size_bytes bigint,

  -- Status
  status text DEFAULT 'training' CHECK (status IN ('training', 'active', 'deprecated', 'failed')),

  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ml_models_org ON public.ml_models(organization_id);
CREATE INDEX idx_ml_models_type ON public.ml_models(model_type);
CREATE INDEX idx_ml_models_status ON public.ml_models(status);

-- Predictions
CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,

  -- Prediction details
  prediction_type text NOT NULL,
  prediction_data jsonb NOT NULL,

  -- Confidence
  confidence_score numeric(5,4),

  -- Time window
  prediction_for timestamptz, -- When is this prediction for?
  valid_until timestamptz,

  -- Accuracy tracking
  actual_outcome jsonb,
  accuracy numeric(5,4),

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_predictions_model ON public.predictions(model_id);
CREATE INDEX idx_predictions_event ON public.predictions(event_id);
CREATE INDEX idx_predictions_type ON public.predictions(prediction_type);
CREATE INDEX idx_predictions_for ON public.predictions(prediction_for);

-- Training data (historical patterns for ML)
CREATE TABLE public.training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Data type
  data_type text NOT NULL CHECK (data_type IN (
    'attendance_pattern',
    'fraud_pattern',
    'gate_performance',
    'staffing_effectiveness'
  )),

  -- Feature vector
  features jsonb NOT NULL,

  -- Label (for supervised learning)
  label jsonb,

  -- Source event
  source_event_id uuid REFERENCES events(id) ON DELETE SET NULL,

  -- Quality
  is_validated boolean DEFAULT false,
  quality_score numeric(5,4),

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_training_data_org ON public.training_data(organization_id);
CREATE INDEX idx_training_data_type ON public.training_data(data_type);
CREATE INDEX idx_training_data_source ON public.training_data(source_event_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_clones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_performance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_data ENABLE ROW LEVEL SECURITY;

-- Event Templates: Users can view public templates or their org's templates
CREATE POLICY "Users can view accessible templates"
  ON public.event_templates FOR SELECT
  USING (
    is_public = true OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can manage org templates"
  ON public.event_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager') AND status = 'active'
    )
  );

-- Fraud Rules: Users can view org's rules
CREATE POLICY "Users can view org fraud rules"
  ON public.fraud_rules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Fraud Cases: Users can view org's cases
CREATE POLICY "Users can view org fraud cases"
  ON public.fraud_cases FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM public.events
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Similar policies for other tables...

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_gates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_categories TO authenticated;
GRANT SELECT, INSERT ON public.event_clones TO authenticated;
GRANT SELECT ON public.event_metrics_cache TO authenticated;
GRANT SELECT ON public.gate_performance_cache TO authenticated;
GRANT SELECT ON public.category_analytics_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fraud_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fraud_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.watchlist TO authenticated;
GRANT SELECT ON public.ml_models TO authenticated;
GRANT SELECT ON public.predictions TO authenticated;
GRANT SELECT ON public.training_data TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.event_templates IS 'Reusable event configurations and templates';
COMMENT ON TABLE public.event_metrics_cache IS 'Pre-computed event statistics for fast dashboard loading';
COMMENT ON TABLE public.fraud_rules IS 'Configurable fraud detection rules';
COMMENT ON TABLE public.fraud_cases IS 'Fraud investigation case management';
COMMENT ON TABLE public.watchlist IS 'Known problematic entities to monitor';
COMMENT ON TABLE public.ml_models IS 'Machine learning model metadata';
COMMENT ON TABLE public.predictions IS 'ML-generated predictions for events';
