-- =====================================================
-- QUICKSTRAP COMPLETE SCHEMA RECONSTRUCTION - PART 2
-- =====================================================
-- Advanced tables, triggers, and functions

-- 10. GATE_MERGE_SUGGESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.gate_merge_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  primary_gate_id text NOT NULL,
  suggested_gate_id text NOT NULL,
  confidence_score decimal DEFAULT 0.0,
  suggested_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz
);

-- 11. SYSTEM_HEALTH_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid REFERENCES public.events(id),
  metric_type text NOT NULL,
  metric_value decimal,
  status text DEFAULT 'normal',
  recorded_at timestamptz DEFAULT now(),
  metadata jsonb
);

-- 12. STAFF_PERFORMANCE TABLE
CREATE TABLE IF NOT EXISTS public.staff_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  checkins_processed integer DEFAULT 0,
  avg_processing_time decimal DEFAULT 0.0,
  errors_count integer DEFAULT 0,
  last_activity timestamptz,
  performance_score decimal DEFAULT 0.0,
  UNIQUE(staff_id, event_id, date)
);

-- 13. PREDICTIVE_INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS public.predictive_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid REFERENCES public.events(id),
  insight_type text NOT NULL,
  prediction_data jsonb,
  confidence_level decimal DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

-- 14. TICKET_LINK_AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.ticket_link_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_id uuid,
  wristband_id uuid,
  action text NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now(),
  old_values jsonb,
  new_values jsonb,
  reason text
);

-- 15. EVENT_CATEGORY_LIMITS TABLE
CREATE TABLE IF NOT EXISTS public.event_category_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  category text NOT NULL,
  max_limit integer NOT NULL,
  current_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, category)
);

-- 16. TELEGRAM INTEGRATION TABLES
CREATE TABLE IF NOT EXISTS public.telegram_auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  auth_code text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_used boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.telegram_login_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL,
  session_token text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.telegram_menu_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id bigint NOT NULL UNIQUE,
  current_menu text DEFAULT 'main',
  menu_data jsonb DEFAULT '{}',
  last_updated timestamptz DEFAULT now()
);

-- 17. TRAINING DATA TABLE (AI/ML features)
CREATE TABLE IF NOT EXISTS public.training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  data_type text NOT NULL,
  source_type text NOT NULL,
  data_payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  is_processed boolean DEFAULT false
);

-- 18. PREDICTIONS TABLE (AI predictions)
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid REFERENCES public.events(id),
  prediction_type text NOT NULL,
  input_data jsonb,
  prediction_result jsonb,
  confidence_score decimal DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);
