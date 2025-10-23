-- =====================================================
-- COMPREHENSIVE EVENT SERIES SYSTEM
-- =====================================================
-- This migration creates a complete event series system that allows
-- events to have multiple series (sub-events) with full independence
-- Author: Claude Code
-- Date: 2025-10-20
-- =====================================================

-- =====================================================
-- 1. ENHANCE EVENT_SERIES TABLE
-- =====================================================

-- First, ensure the base table exists with all needed columns
CREATE TABLE IF NOT EXISTS public.event_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  main_event_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,

  -- Check-in window configuration
  checkin_window_start_offset interval DEFAULT '2 hours'::interval,
  checkin_window_end_offset interval DEFAULT '2 hours'::interval,

  -- Lifecycle & status
  lifecycle_status text DEFAULT 'draft'::text CHECK (lifecycle_status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  status_changed_at timestamp with time zone DEFAULT now(),
  status_changed_by uuid,
  auto_transition_enabled boolean DEFAULT true,

  -- Metadata
  sequence_number integer,
  series_type text DEFAULT 'standard'::text CHECK (series_type IN ('standard', 'knockout', 'group_stage', 'round_robin', 'custom')),

  -- Location override (can differ from main event)
  location text,
  venue_id uuid,

  -- Capacity override
  capacity integer,

  -- Recurring series support
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb, -- {type: 'daily'|'weekly'|'monthly', interval: 1, end_after_occurrences: 10}
  parent_series_id uuid, -- Link to parent if this is a recurring instance

  -- Configuration
  config jsonb DEFAULT '{}'::jsonb,

  -- Visibility & access
  is_public boolean DEFAULT false,
  requires_separate_ticket boolean DEFAULT false,

  -- Audit fields
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  organization_id uuid NOT NULL,

  CONSTRAINT event_series_pkey PRIMARY KEY (id),
  CONSTRAINT event_series_main_event_id_fkey FOREIGN KEY (main_event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_series_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT event_series_status_changed_by_fkey FOREIGN KEY (status_changed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT event_series_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT event_series_parent_series_fkey FOREIGN KEY (parent_series_id) REFERENCES public.event_series(id) ON DELETE CASCADE,
  CONSTRAINT event_series_venue_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL
);

-- Add new columns to existing table if they don't exist
DO $$
BEGIN
  -- Lifecycle status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_series' AND column_name = 'lifecycle_status') THEN
    ALTER TABLE public.event_series ADD COLUMN lifecycle_status text DEFAULT 'draft'::text CHECK (lifecycle_status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled'));
    ALTER TABLE public.event_series ADD COLUMN status_changed_at timestamp with time zone DEFAULT now();
    ALTER TABLE public.event_series ADD COLUMN status_changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE public.event_series ADD COLUMN auto_transition_enabled boolean DEFAULT true;
  END IF;

  -- Location override
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_series' AND column_name = 'location') THEN
    ALTER TABLE public.event_series ADD COLUMN location text;
    ALTER TABLE public.event_series ADD COLUMN venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL;
  END IF;

  -- Capacity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_series' AND column_name = 'capacity') THEN
    ALTER TABLE public.event_series ADD COLUMN capacity integer;
  END IF;

  -- Recurring series
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_series' AND column_name = 'is_recurring') THEN
    ALTER TABLE public.event_series ADD COLUMN is_recurring boolean DEFAULT false;
    ALTER TABLE public.event_series ADD COLUMN recurrence_pattern jsonb;
    ALTER TABLE public.event_series ADD COLUMN parent_series_id uuid REFERENCES public.event_series(id) ON DELETE CASCADE;
  END IF;

  -- Visibility
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_series' AND column_name = 'is_public') THEN
    ALTER TABLE public.event_series ADD COLUMN is_public boolean DEFAULT false;
    ALTER TABLE public.event_series ADD COLUMN requires_separate_ticket boolean DEFAULT false;
  END IF;

  -- Ensure organization_id exists and is NOT NULL
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_series' AND column_name = 'organization_id' AND is_nullable = 'NO') THEN
    -- First add if doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_series' AND column_name = 'organization_id') THEN
      ALTER TABLE public.event_series ADD COLUMN organization_id uuid;
    END IF;
    -- Update nulls from main event
    UPDATE public.event_series es
    SET organization_id = e.organization_id
    FROM public.events e
    WHERE es.main_event_id = e.id AND es.organization_id IS NULL;
    -- Make NOT NULL
    ALTER TABLE public.event_series ALTER COLUMN organization_id SET NOT NULL;
    -- Add FK if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'event_series_organization_id_fkey') THEN
      ALTER TABLE public.event_series ADD CONSTRAINT event_series_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_series_main_event ON public.event_series(main_event_id);
CREATE INDEX IF NOT EXISTS idx_event_series_dates ON public.event_series(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_event_series_org ON public.event_series(organization_id);
CREATE INDEX IF NOT EXISTS idx_event_series_lifecycle ON public.event_series(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_event_series_parent ON public.event_series(parent_series_id);
CREATE INDEX IF NOT EXISTS idx_event_series_venue ON public.event_series(venue_id);

-- =====================================================
-- 2. SERIES-SPECIFIC GATES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.series_gates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL,
  gate_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  notes text,

  CONSTRAINT series_gates_pkey PRIMARY KEY (id),
  CONSTRAINT series_gates_series_fkey FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE CASCADE,
  CONSTRAINT series_gates_gate_fkey FOREIGN KEY (gate_id) REFERENCES public.gates(id) ON DELETE CASCADE,
  CONSTRAINT series_gates_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT series_gates_unique UNIQUE (series_id, gate_id)
);

CREATE INDEX IF NOT EXISTS idx_series_gates_series ON public.series_gates(series_id);
CREATE INDEX IF NOT EXISTS idx_series_gates_gate ON public.series_gates(gate_id);

-- =====================================================
-- 3. SERIES-SPECIFIC CATEGORIES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.series_category_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL,
  category text NOT NULL,
  max_wristbands integer DEFAULT 1,
  max_capacity integer, -- Overall capacity for this category
  current_count integer DEFAULT 0,
  requires_ticket boolean DEFAULT false,
  price numeric(10,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  CONSTRAINT series_category_limits_pkey PRIMARY KEY (id),
  CONSTRAINT series_category_limits_series_fkey FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE CASCADE,
  CONSTRAINT series_category_limits_unique UNIQUE (series_id, category)
);

CREATE INDEX IF NOT EXISTS idx_series_category_limits_series ON public.series_category_limits(series_id);

-- =====================================================
-- 4. SERIES WRISTBAND ASSIGNMENTS (Enhanced)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.series_wristband_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL,
  wristband_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  is_active boolean DEFAULT true,

  -- Validation fields
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected', 'expired')),
  validated_at timestamp with time zone,
  validated_by uuid,

  -- Access tracking
  first_checkin_at timestamp with time zone,
  last_checkin_at timestamp with time zone,
  checkin_count integer DEFAULT 0,

  CONSTRAINT series_wristband_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT series_wristband_assignments_series_fkey FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE CASCADE,
  CONSTRAINT series_wristband_assignments_wristband_fkey FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id) ON DELETE CASCADE,
  CONSTRAINT series_wristband_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT series_wristband_assignments_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT series_wristband_unique UNIQUE (series_id, wristband_id)
);

CREATE INDEX IF NOT EXISTS idx_series_wristband_series ON public.series_wristband_assignments(series_id);
CREATE INDEX IF NOT EXISTS idx_series_wristband_wristband ON public.series_wristband_assignments(wristband_id);
CREATE INDEX IF NOT EXISTS idx_series_wristband_status ON public.series_wristband_assignments(validation_status);

-- =====================================================
-- 5. SERIES TICKETS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.series_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL,
  ticket_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  linked_at timestamp with time zone DEFAULT now(),
  linked_by uuid,

  CONSTRAINT series_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT series_tickets_series_fkey FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE CASCADE,
  CONSTRAINT series_tickets_ticket_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE,
  CONSTRAINT series_tickets_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT series_tickets_unique UNIQUE (series_id, ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_series_tickets_series ON public.series_tickets(series_id);
CREATE INDEX IF NOT EXISTS idx_series_tickets_ticket ON public.series_tickets(ticket_id);

-- =====================================================
-- 6. SERIES ANALYTICS CACHE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.series_metrics_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL UNIQUE,
  total_wristbands integer DEFAULT 0,
  total_checkins integer DEFAULT 0,
  unique_attendees integer DEFAULT 0,
  checkin_rate numeric DEFAULT 0,
  peak_hour timestamp with time zone,
  peak_hour_checkins integer DEFAULT 0,
  avg_checkins_per_hour numeric DEFAULT 0,
  total_gates integer DEFAULT 0,
  active_gates integer DEFAULT 0,
  last_computed_at timestamp with time zone DEFAULT now(),
  computation_time_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  CONSTRAINT series_metrics_cache_pkey PRIMARY KEY (id),
  CONSTRAINT series_metrics_cache_series_fkey FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_series_metrics_cache_series ON public.series_metrics_cache(series_id);
CREATE INDEX IF NOT EXISTS idx_series_metrics_cache_computed ON public.series_metrics_cache(last_computed_at);

-- =====================================================
-- 7. SERIES TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.series_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  template_type text DEFAULT 'single' CHECK (template_type IN ('single', 'recurring', 'tournament', 'multi_day')),

  -- Template configuration
  default_series_type text DEFAULT 'standard',
  default_checkin_window_start interval DEFAULT '2 hours'::interval,
  default_checkin_window_end interval DEFAULT '2 hours'::interval,
  default_capacity integer,

  -- Category templates
  categories jsonb DEFAULT '[]'::jsonb, -- [{"name": "VIP", "max": 100}, ...]

  -- Gate templates
  gate_configurations jsonb DEFAULT '[]'::jsonb, -- [{"name": "Main Entrance", "type": "entry"}, ...]

  -- Recurrence template
  recurrence_pattern jsonb,

  -- Settings
  is_public boolean DEFAULT false,
  usage_count integer DEFAULT 0,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,

  CONSTRAINT series_templates_pkey PRIMARY KEY (id),
  CONSTRAINT series_templates_organization_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT series_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_series_templates_org ON public.series_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_series_templates_type ON public.series_templates(template_type);

-- =====================================================
-- 8. SERIES STATE TRANSITIONS (Audit)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.series_state_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  reason text,
  automated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),

  CONSTRAINT series_state_transitions_pkey PRIMARY KEY (id),
  CONSTRAINT series_state_transitions_series_fkey FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE CASCADE,
  CONSTRAINT series_state_transitions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_series_state_transitions_series ON public.series_state_transitions(series_id);
CREATE INDEX IF NOT EXISTS idx_series_state_transitions_created ON public.series_state_transitions(created_at);

-- =====================================================
-- 9. UPDATE EXISTING TABLES FOR SERIES SUPPORT
-- =====================================================

-- Update wristbands table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wristbands' AND column_name = 'series_id') THEN
    ALTER TABLE public.wristbands ADD COLUMN series_id uuid REFERENCES public.event_series(id) ON DELETE SET NULL;
    CREATE INDEX idx_wristbands_series ON public.wristbands(series_id);
  END IF;
END $$;

-- Update checkin_logs table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkin_logs' AND column_name = 'series_id') THEN
    ALTER TABLE public.checkin_logs ADD COLUMN series_id uuid REFERENCES public.event_series(id) ON DELETE SET NULL;
    CREATE INDEX idx_checkin_logs_series ON public.checkin_logs(series_id);
  END IF;
END $$;

-- Update gates table to support series-specific configuration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gates' AND column_name = 'series_id') THEN
    ALTER TABLE public.gates ADD COLUMN series_id uuid REFERENCES public.event_series(id) ON DELETE CASCADE;
    CREATE INDEX idx_gates_series ON public.gates(series_id);
    COMMENT ON COLUMN public.gates.series_id IS 'If set, this gate is exclusive to a specific series';
  END IF;
END $$;

-- Update fraud_detections for series support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fraud_detections' AND column_name = 'series_id') THEN
    ALTER TABLE public.fraud_detections ADD COLUMN series_id uuid REFERENCES public.event_series(id) ON DELETE SET NULL;
    CREATE INDEX idx_fraud_detections_series ON public.fraud_detections(series_id);
  END IF;
END $$;

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to check if series is within check-in window
CREATE OR REPLACE FUNCTION public.is_series_within_checkin_window(p_series_id uuid)
RETURNS boolean AS $$
DECLARE
  v_series record;
  v_now timestamp with time zone := now();
BEGIN
  SELECT
    start_date,
    end_date,
    checkin_window_start_offset,
    checkin_window_end_offset
  INTO v_series
  FROM public.event_series
  WHERE id = p_series_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN v_now >= (v_series.start_date - COALESCE(v_series.checkin_window_start_offset, '0'::interval))
    AND v_now <= (v_series.end_date + COALESCE(v_series.checkin_window_end_offset, '0'::interval));
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get active series for an event
CREATE OR REPLACE FUNCTION public.get_active_series_for_event(p_event_id uuid)
RETURNS TABLE (
  series_id uuid,
  series_name text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_within_window boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.id,
    es.name,
    es.start_date,
    es.end_date,
    public.is_series_within_checkin_window(es.id)
  FROM public.event_series es
  WHERE es.main_event_id = p_event_id
    AND es.lifecycle_status IN ('scheduled', 'active')
  ORDER BY es.start_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to compute series metrics
CREATE OR REPLACE FUNCTION public.compute_series_metrics(p_series_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_metrics jsonb;
BEGIN
  SELECT jsonb_build_object(
    'series_id', p_series_id,
    'total_wristbands', COUNT(DISTINCT swa.wristband_id),
    'total_checkins', COUNT(cl.id),
    'unique_attendees', COUNT(DISTINCT cl.wristband_id),
    'checkin_rate', CASE
      WHEN COUNT(DISTINCT swa.wristband_id) > 0
      THEN ROUND((COUNT(DISTINCT cl.wristband_id)::numeric / COUNT(DISTINCT swa.wristband_id)::numeric) * 100, 2)
      ELSE 0
    END,
    'total_gates', COUNT(DISTINCT sg.gate_id),
    'first_checkin', MIN(cl.timestamp),
    'last_checkin', MAX(cl.timestamp)
  )
  INTO v_metrics
  FROM public.event_series es
  LEFT JOIN public.series_wristband_assignments swa ON swa.series_id = es.id AND swa.is_active = true
  LEFT JOIN public.checkin_logs cl ON cl.series_id = es.id
  LEFT JOIN public.series_gates sg ON sg.series_id = es.id AND sg.is_active = true
  WHERE es.id = p_series_id;

  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to create recurring series instances
CREATE OR REPLACE FUNCTION public.create_recurring_series_instances(
  p_parent_series_id uuid,
  p_occurrences integer DEFAULT 10
)
RETURNS TABLE (created_series_id uuid) AS $$
DECLARE
  v_parent record;
  v_interval_days integer;
  v_counter integer := 1;
  v_new_start_date timestamp with time zone;
  v_new_end_date timestamp with time zone;
  v_duration interval;
  v_new_series_id uuid;
BEGIN
  -- Get parent series
  SELECT * INTO v_parent
  FROM public.event_series
  WHERE id = p_parent_series_id;

  IF NOT FOUND OR NOT v_parent.is_recurring THEN
    RAISE EXCEPTION 'Parent series not found or not configured for recurrence';
  END IF;

  -- Calculate duration
  v_duration := v_parent.end_date - v_parent.start_date;

  -- Get interval from pattern
  v_interval_days := (v_parent.recurrence_pattern->>'interval')::integer;
  IF (v_parent.recurrence_pattern->>'type') = 'weekly' THEN
    v_interval_days := v_interval_days * 7;
  ELSIF (v_parent.recurrence_pattern->>'type') = 'monthly' THEN
    v_interval_days := v_interval_days * 30;
  END IF;

  -- Create instances
  WHILE v_counter <= p_occurrences LOOP
    v_new_start_date := v_parent.start_date + (v_counter * v_interval_days || ' days')::interval;
    v_new_end_date := v_new_start_date + v_duration;

    INSERT INTO public.event_series (
      main_event_id,
      name,
      description,
      start_date,
      end_date,
      checkin_window_start_offset,
      checkin_window_end_offset,
      lifecycle_status,
      sequence_number,
      series_type,
      location,
      venue_id,
      capacity,
      is_recurring,
      parent_series_id,
      config,
      is_public,
      requires_separate_ticket,
      organization_id,
      created_by
    ) VALUES (
      v_parent.main_event_id,
      v_parent.name || ' - Instance ' || v_counter,
      v_parent.description,
      v_new_start_date,
      v_new_end_date,
      v_parent.checkin_window_start_offset,
      v_parent.checkin_window_end_offset,
      'scheduled',
      v_parent.sequence_number + v_counter,
      v_parent.series_type,
      v_parent.location,
      v_parent.venue_id,
      v_parent.capacity,
      false, -- instances are not recurring themselves
      v_parent.id,
      v_parent.config,
      v_parent.is_public,
      v_parent.requires_separate_ticket,
      v_parent.organization_id,
      v_parent.created_by
    )
    RETURNING id INTO v_new_series_id;

    created_series_id := v_new_series_id;
    RETURN NEXT;

    v_counter := v_counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. VIEWS
-- =====================================================

-- Comprehensive series view with all related data
CREATE OR REPLACE VIEW public.series_overview AS
SELECT
  es.id,
  es.main_event_id,
  es.name,
  es.description,
  es.start_date,
  es.end_date,
  es.lifecycle_status,
  es.series_type,
  es.location,
  es.capacity,
  es.is_recurring,
  es.organization_id,
  e.name as main_event_name,
  COUNT(DISTINCT swa.wristband_id) as assigned_wristbands,
  COUNT(DISTINCT sg.gate_id) as assigned_gates,
  COUNT(DISTINCT scl.category) as category_count,
  public.is_series_within_checkin_window(es.id) as is_within_window
FROM public.event_series es
JOIN public.events e ON es.main_event_id = e.id
LEFT JOIN public.series_wristband_assignments swa ON swa.series_id = es.id AND swa.is_active = true
LEFT JOIN public.series_gates sg ON sg.series_id = es.id AND sg.is_active = true
LEFT JOIN public.series_category_limits scl ON scl.series_id = es.id
GROUP BY es.id, e.name;

-- Series with real-time metrics
CREATE OR REPLACE VIEW public.series_with_metrics AS
SELECT
  es.*,
  smc.total_wristbands,
  smc.total_checkins,
  smc.unique_attendees,
  smc.checkin_rate,
  smc.peak_hour,
  smc.peak_hour_checkins,
  smc.total_gates,
  smc.active_gates,
  smc.last_computed_at
FROM public.event_series es
LEFT JOIN public.series_metrics_cache smc ON smc.series_id = es.id;

-- =====================================================
-- 12. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_category_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_wristband_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_state_transitions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS event_series_select_policy ON public.event_series;
  DROP POLICY IF EXISTS event_series_insert_policy ON public.event_series;
  DROP POLICY IF EXISTS event_series_update_policy ON public.event_series;
  DROP POLICY IF EXISTS event_series_delete_policy ON public.event_series;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Event Series policies
CREATE POLICY event_series_org_access ON public.event_series
  FOR ALL
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Series Gates policies
CREATE POLICY series_gates_org_access ON public.series_gates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      WHERE es.id = series_id
      AND es.organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
    )
  );

-- Series Category Limits policies
CREATE POLICY series_category_limits_org_access ON public.series_category_limits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      WHERE es.id = series_id
      AND es.organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
    )
  );

-- Series Wristband Assignments policies
CREATE POLICY series_wristband_assignments_org_access ON public.series_wristband_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      WHERE es.id = series_id
      AND es.organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
    )
  );

-- Series Tickets policies
CREATE POLICY series_tickets_org_access ON public.series_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      WHERE es.id = series_id
      AND es.organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
    )
  );

-- Series Metrics Cache policies
CREATE POLICY series_metrics_cache_org_access ON public.series_metrics_cache
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      WHERE es.id = series_id
      AND es.organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
    )
  );

-- Series Templates policies
CREATE POLICY series_templates_org_access ON public.series_templates
  FOR ALL
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
    OR is_public = true
  );

-- Series State Transitions policies
CREATE POLICY series_state_transitions_org_access ON public.series_state_transitions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      WHERE es.id = series_id
      AND es.organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.status = 'active'
      )
    )
  );

-- =====================================================
-- 13. TRIGGERS
-- =====================================================

-- Update timestamp trigger for series
CREATE OR REPLACE FUNCTION public.update_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_series_updated_at
  BEFORE UPDATE ON public.event_series
  FOR EACH ROW
  EXECUTE FUNCTION public.update_series_updated_at();

-- Trigger for series state transitions audit
CREATE OR REPLACE FUNCTION public.audit_series_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN
    INSERT INTO public.series_state_transitions (
      series_id,
      from_status,
      to_status,
      changed_by,
      automated
    ) VALUES (
      NEW.id,
      OLD.lifecycle_status,
      NEW.lifecycle_status,
      NEW.status_changed_by,
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_series_state_change_trigger
  AFTER UPDATE ON public.event_series
  FOR EACH ROW
  WHEN (OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status)
  EXECUTE FUNCTION public.audit_series_state_change();

-- Trigger to update series metrics cache on checkin
CREATE OR REPLACE FUNCTION public.update_series_metrics_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.series_id IS NOT NULL THEN
    -- Update the cache (simplified - in production you'd want to do this async)
    INSERT INTO public.series_metrics_cache (series_id)
    VALUES (NEW.series_id)
    ON CONFLICT (series_id) DO UPDATE
    SET
      total_checkins = series_metrics_cache.total_checkins + 1,
      last_computed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_series_metrics_on_checkin_trigger
  AFTER INSERT ON public.checkin_logs
  FOR EACH ROW
  WHEN (NEW.series_id IS NOT NULL)
  EXECUTE FUNCTION public.update_series_metrics_on_checkin();

-- =====================================================
-- 14. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_series TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_gates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_category_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_wristband_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_tickets TO authenticated;
GRANT SELECT ON public.series_metrics_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_templates TO authenticated;
GRANT SELECT ON public.series_state_transitions TO authenticated;

-- =====================================================
-- 15. COMMENTS
-- =====================================================

COMMENT ON TABLE public.event_series IS 'Main table for event series - sub-events that extend a main event';
COMMENT ON TABLE public.series_gates IS 'Maps gates to specific series for access control';
COMMENT ON TABLE public.series_category_limits IS 'Category-specific capacity limits for each series';
COMMENT ON TABLE public.series_wristband_assignments IS 'Assigns wristbands to specific series with validation tracking';
COMMENT ON TABLE public.series_tickets IS 'Links tickets to specific series';
COMMENT ON TABLE public.series_metrics_cache IS 'Cached analytics for series performance';
COMMENT ON TABLE public.series_templates IS 'Reusable templates for creating series';
COMMENT ON TABLE public.series_state_transitions IS 'Audit log for series lifecycle changes';

COMMENT ON FUNCTION public.is_series_within_checkin_window IS 'Checks if a series is currently within its check-in window';
COMMENT ON FUNCTION public.get_active_series_for_event IS 'Returns all active series for a given event';
COMMENT ON FUNCTION public.compute_series_metrics IS 'Computes real-time metrics for a series';
COMMENT ON FUNCTION public.create_recurring_series_instances IS 'Creates multiple instances of a recurring series';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
