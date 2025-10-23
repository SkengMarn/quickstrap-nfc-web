-- ============================================================================
-- STEP 3D: TEMPLATES, TELEGRAM & FINAL TABLES (6 tables)
-- ============================================================================
-- Run this AFTER 3c_collaboration_monitoring.sql
-- Execution time: ~30 seconds
-- ============================================================================

BEGIN;

-- ============================================================================
-- EVENT TEMPLATES (3 tables)
-- ============================================================================

CREATE TABLE public.event_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_templates_pkey PRIMARY KEY (id),
  CONSTRAINT event_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT event_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.template_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text,
  max_capacity integer,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT template_categories_pkey PRIMARY KEY (id),
  CONSTRAINT template_categories_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.event_templates(id) ON DELETE CASCADE
);

CREATE TABLE public.template_gates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  name text NOT NULL,
  gate_type text,
  location_description text,
  category_bindings jsonb DEFAULT '[]'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT template_gates_pkey PRIMARY KEY (id),
  CONSTRAINT template_gates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.event_templates(id) ON DELETE CASCADE
);

-- ============================================================================
-- TELEGRAM INTEGRATION (3 tables)
-- ============================================================================

CREATE TABLE public.telegram_auth_sessions (
  user_id bigint NOT NULL,
  email text NOT NULL,
  session_expiry timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_auth_sessions_pkey PRIMARY KEY (user_id)
);

CREATE TABLE public.telegram_login_sessions (
  user_id bigint NOT NULL,
  step text NOT NULL CHECK (step = ANY (ARRAY['email'::text, 'password'::text])),
  email text,
  attempts integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_login_sessions_pkey PRIMARY KEY (user_id)
);

CREATE TABLE public.telegram_menu_state (
  user_id bigint NOT NULL,
  current_menu text NOT NULL,
  previous_menu text,
  context jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT telegram_menu_state_pkey PRIMARY KEY (user_id)
);

COMMIT;

-- ============================================================================
-- Final Verification
-- ============================================================================
SELECT 'Total tables created: ' || COUNT(*)::text as status
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show 60 tables total! 🎉

SELECT 
  'Tables by category:' as info,
  COUNT(*) FILTER (WHERE tablename LIKE '%fraud%' OR tablename = 'watchlist') as fraud_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%emergency%') as emergency_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%api%') as api_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%ml%' OR tablename LIKE '%prediction%' OR tablename LIKE '%training%' OR tablename = 'adaptive_thresholds') as ml_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%autonomous%') as autonomous_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%staff%' OR tablename LIKE '%collaboration%' OR tablename LIKE '%session%' OR tablename LIKE '%resource_lock%') as collaboration_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%cache%') as cache_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%alert%' OR tablename LIKE '%health%') as monitoring_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%export%' OR tablename LIKE '%report%') as export_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%telegram%') as telegram_tables,
  COUNT(*) FILTER (WHERE tablename LIKE '%template%') as template_tables
FROM pg_tables 
WHERE schemaname = 'public';
