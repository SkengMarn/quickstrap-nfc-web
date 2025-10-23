-- ============================================================================
-- STEP 3B: API MANAGEMENT & AI/ML INFRASTRUCTURE (11 tables)
-- ============================================================================
-- Run this AFTER 3a_fraud_emergency.sql
-- Execution time: ~1 minute
-- ============================================================================

BEGIN;

-- ============================================================================
-- API MANAGEMENT (3 tables)
-- ============================================================================

CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] DEFAULT ARRAY['read:events'::text, 'read:wristbands'::text, 'read:checkins'::text],
  allowed_origins text[],
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'revoked'::text, 'expired'::text])),
  rate_limit_per_hour integer DEFAULT 1000,
  rate_limit_per_day integer DEFAULT 10000,
  last_used_at timestamp with time zone,
  created_by uuid,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.api_rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL,
  window_start timestamp with time zone NOT NULL,
  window_end timestamp with time zone NOT NULL,
  requests_count integer DEFAULT 0,
  requests_allowed integer,
  first_request_at timestamp with time zone,
  last_request_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_rate_limits_pkey PRIMARY KEY (id),
  CONSTRAINT api_rate_limits_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE
);

CREATE TABLE public.api_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  api_key_id uuid,
  organization_id uuid,
  method text NOT NULL,
  endpoint text NOT NULL,
  query_params jsonb,
  request_body jsonb,
  status_code integer,
  response_time_ms integer,
  error_message text,
  ip_address text,
  user_agent text,
  requested_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT api_audit_log_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE,
  CONSTRAINT api_audit_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- ============================================================================
-- AI & MACHINE LEARNING (5 tables)
-- ============================================================================

CREATE TABLE public.ml_models (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  name text NOT NULL,
  model_type text NOT NULL CHECK (model_type = ANY (ARRAY['attendance_forecast'::text, 'staffing_recommendation'::text, 'fraud_detection'::text, 'gate_optimization'::text, 'anomaly_detection'::text])),
  version text NOT NULL,
  algorithm text,
  hyperparameters jsonb DEFAULT '{}'::jsonb,
  training_dataset_size integer,
  training_started_at timestamp with time zone,
  training_completed_at timestamp with time zone,
  training_duration_seconds integer,
  accuracy numeric,
  precision_score numeric,
  recall_score numeric,
  f1_score numeric,
  mean_absolute_error numeric,
  model_storage_path text,
  model_size_bytes bigint,
  status text DEFAULT 'training'::text CHECK (status = ANY (ARRAY['training'::text, 'active'::text, 'deprecated'::text, 'failed'::text])),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ml_models_pkey PRIMARY KEY (id),
  CONSTRAINT ml_models_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT ml_models_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL,
  event_id uuid,
  prediction_type text NOT NULL,
  prediction_data jsonb NOT NULL,
  confidence_score numeric,
  prediction_for timestamp with time zone,
  valid_until timestamp with time zone,
  actual_outcome jsonb,
  accuracy numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT predictions_pkey PRIMARY KEY (id),
  CONSTRAINT predictions_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.ml_models(id) ON DELETE CASCADE,
  CONSTRAINT predictions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

CREATE TABLE public.predictive_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid,
  insight_type text NOT NULL CHECK (insight_type = ANY (ARRAY['capacity_warning'::text, 'peak_prediction'::text, 'bottleneck_alert'::text, 'optimization_suggestion'::text, 'staffing_recommendation'::text])),
  message text NOT NULL,
  confidence_score numeric NOT NULL,
  impact_level text NOT NULL CHECK (impact_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  predicted_time timestamp with time zone,
  valid_until timestamp with time zone,
  suggested_actions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  was_accurate boolean,
  actual_outcome jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT predictive_insights_pkey PRIMARY KEY (id),
  CONSTRAINT predictive_insights_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT predictive_insights_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

CREATE TABLE public.training_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  data_type text NOT NULL CHECK (data_type = ANY (ARRAY['attendance_pattern'::text, 'fraud_pattern'::text, 'gate_performance'::text, 'staffing_effectiveness'::text])),
  features jsonb NOT NULL,
  label jsonb,
  source_event_id uuid,
  is_validated boolean DEFAULT false,
  quality_score numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_data_pkey PRIMARY KEY (id),
  CONSTRAINT training_data_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT training_data_source_event_id_fkey FOREIGN KEY (source_event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

CREATE TABLE public.adaptive_thresholds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid,
  duplicate_distance_meters integer DEFAULT 25,
  promotion_sample_size integer DEFAULT 100,
  confidence_threshold numeric DEFAULT 0.85,
  velocity_threshold_ms integer DEFAULT 5000,
  last_optimization_at timestamp with time zone DEFAULT now(),
  optimization_history jsonb DEFAULT '[]'::jsonb,
  performance_improvement numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT adaptive_thresholds_pkey PRIMARY KEY (id),
  CONSTRAINT adaptive_thresholds_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT adaptive_thresholds_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

-- ============================================================================
-- AUTONOMOUS OPERATIONS (2 tables)
-- ============================================================================

CREATE TABLE public.autonomous_gates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gate_id uuid NOT NULL UNIQUE,
  event_id uuid NOT NULL,
  organization_id uuid,
  status text DEFAULT 'learning'::text CHECK (status = ANY (ARRAY['active'::text, 'learning'::text, 'optimizing'::text, 'maintenance'::text, 'paused'::text])),
  confidence_score numeric DEFAULT 0.5,
  confidence_history jsonb DEFAULT '[]'::jsonb,
  decisions_count integer DEFAULT 0,
  decisions_today integer DEFAULT 0,
  accuracy_rate numeric DEFAULT 0,
  last_decision_at timestamp with time zone,
  last_decision_type text,
  avg_response_time_ms integer DEFAULT 0,
  total_processed integer DEFAULT 0,
  success_rate numeric DEFAULT 1.0,
  learning_started_at timestamp with time zone DEFAULT now(),
  last_optimization_at timestamp with time zone,
  optimization_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT autonomous_gates_pkey PRIMARY KEY (id),
  CONSTRAINT autonomous_gates_gate_id_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id) ON DELETE CASCADE,
  CONSTRAINT autonomous_gates_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT autonomous_gates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

CREATE TABLE public.autonomous_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['gate_creation'::text, 'gate_merge'::text, 'threshold_adjustment'::text, 'anomaly_detection'::text, 'performance_optimization'::text, 'auto_correction'::text, 'prediction'::text])),
  action text NOT NULL,
  reasoning text,
  impact text,
  confidence_score numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  automated boolean DEFAULT true,
  requires_review boolean DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_status text CHECK (review_status = ANY (ARRAY['approved'::text, 'rejected'::text, 'modified'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT autonomous_events_pkey PRIMARY KEY (id),
  CONSTRAINT autonomous_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT autonomous_events_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT autonomous_events_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)
);

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Tables after 3b: ' || COUNT(*)::text as status
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show 43 tables (32 + 11)
