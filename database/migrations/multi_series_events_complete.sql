-- =====================================================
-- MULTI-SERIES EVENT SYSTEM - COMPLETE MIGRATION
-- =====================================================
-- This migration creates a comprehensive multi-series event system
-- Author: Claude Code
-- Date: 2025-10-18
-- =====================================================

-- =====================================================
-- 1. CREATE EVENT_SERIES TABLE
-- =====================================================
-- Represents a series that groups multiple events together
CREATE TABLE IF NOT EXISTS public.event_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  main_event_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,

  -- Check-in window configuration
  checkin_window_start_offset interval DEFAULT '2 hours'::interval,  -- How early can check-in start
  checkin_window_end_offset interval DEFAULT '2 hours'::interval,     -- How long after end_date is check-in allowed

  -- Metadata
  sequence_number integer,  -- For ordering series (e.g., Matchday 1, Matchday 2)
  series_type text DEFAULT 'standard'::text,  -- 'standard', 'knockout', 'group_stage', etc.
  config jsonb DEFAULT '{}'::jsonb,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  organization_id uuid,

  CONSTRAINT event_series_pkey PRIMARY KEY (id),
  CONSTRAINT event_series_main_event_id_fkey FOREIGN KEY (main_event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_series_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_series_main_event ON public.event_series(main_event_id);
CREATE INDEX IF NOT EXISTS idx_event_series_dates ON public.event_series(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_event_series_org ON public.event_series(organization_id);

-- =====================================================
-- 2. UPDATE EVENTS TABLE FOR SERIES SUPPORT
-- =====================================================
-- Add series relationship columns to events table
DO $$
BEGIN
  -- Add series_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'events' AND column_name = 'series_id') THEN
    ALTER TABLE public.events ADD COLUMN series_id uuid;
    ALTER TABLE public.events ADD CONSTRAINT events_series_id_fkey
      FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE SET NULL;
    CREATE INDEX idx_events_series ON public.events(series_id);
  END IF;

  -- Add parent_event_id for hierarchical structure
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'events' AND column_name = 'parent_event_id') THEN
    ALTER TABLE public.events ADD COLUMN parent_event_id uuid;
    ALTER TABLE public.events ADD CONSTRAINT events_parent_event_fkey
      FOREIGN KEY (parent_event_id) REFERENCES public.events(id) ON DELETE CASCADE;
    CREATE INDEX idx_events_parent ON public.events(parent_event_id);
  END IF;

  -- Add check-in window configuration to events
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'events' AND column_name = 'checkin_window_start_offset') THEN
    ALTER TABLE public.events ADD COLUMN checkin_window_start_offset interval DEFAULT '2 hours'::interval;
    ALTER TABLE public.events ADD COLUMN checkin_window_end_offset interval DEFAULT '2 hours'::interval;
  END IF;

  -- Update has_series to nullable boolean
  ALTER TABLE public.events ALTER COLUMN has_series DROP DEFAULT;
  ALTER TABLE public.events ALTER COLUMN has_series SET DEFAULT false;

END $$;

-- =====================================================
-- 3. CREATE SERIES_WRISTBAND_ASSIGNMENTS TABLE
-- =====================================================
-- Maps wristbands to specific series (for series-specific access)
CREATE TABLE IF NOT EXISTS public.series_wristband_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL,
  wristband_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  assigned_by uuid,
  is_active boolean DEFAULT true,

  CONSTRAINT series_wristband_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT series_wristband_assignments_series_fkey FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE CASCADE,
  CONSTRAINT series_wristband_assignments_wristband_fkey FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id) ON DELETE CASCADE,
  CONSTRAINT series_wristband_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure a wristband can only be assigned once per series
  CONSTRAINT series_wristband_unique UNIQUE (series_id, wristband_id)
);

CREATE INDEX IF NOT EXISTS idx_series_wristband_series ON public.series_wristband_assignments(series_id);
CREATE INDEX IF NOT EXISTS idx_series_wristband_wristband ON public.series_wristband_assignments(wristband_id);

-- =====================================================
-- 4. UPDATE WRISTBANDS TABLE FOR SERIES SUPPORT
-- =====================================================
DO $$
BEGIN
  -- Add series_id column to wristbands
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'wristbands' AND column_name = 'series_id') THEN
    ALTER TABLE public.wristbands ADD COLUMN series_id uuid;
    ALTER TABLE public.wristbands ADD CONSTRAINT wristbands_series_id_fkey
      FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE SET NULL;
    CREATE INDEX idx_wristbands_series ON public.wristbands(series_id);
  END IF;
END $$;

-- =====================================================
-- 5. UPDATE CHECKIN_LOGS TABLE FOR SERIES SUPPORT
-- =====================================================
-- Add series_id to track which series a check-in was for
-- (Note: Already exists in schema but ensuring it's there)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'checkin_logs' AND column_name = 'series_id') THEN
    ALTER TABLE public.checkin_logs ADD COLUMN series_id uuid;
    ALTER TABLE public.checkin_logs ADD CONSTRAINT checkin_logs_series_id_fkey
      FOREIGN KEY (series_id) REFERENCES public.event_series(id) ON DELETE SET NULL;
    CREATE INDEX idx_checkin_logs_series ON public.checkin_logs(series_id);
  END IF;
END $$;

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to check if an event or series is within its check-in window
CREATE OR REPLACE FUNCTION public.is_within_checkin_window(
  p_event_id uuid DEFAULT NULL,
  p_series_id uuid DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
  v_start_offset interval;
  v_end_offset interval;
  v_now timestamp with time zone := now();
BEGIN
  -- Check series first, then event
  IF p_series_id IS NOT NULL THEN
    SELECT
      start_date,
      end_date,
      checkin_window_start_offset,
      checkin_window_end_offset
    INTO v_start_date, v_end_date, v_start_offset, v_end_offset
    FROM public.event_series
    WHERE id = p_series_id;
  ELSIF p_event_id IS NOT NULL THEN
    SELECT
      start_date,
      end_date,
      checkin_window_start_offset,
      checkin_window_end_offset
    INTO v_start_date, v_end_date, v_start_offset, v_end_offset
    FROM public.events
    WHERE id = p_event_id;
  ELSE
    RETURN false;
  END IF;

  -- If no dates found, return false
  IF v_start_date IS NULL OR v_end_date IS NULL THEN
    RETURN false;
  END IF;

  -- Check if current time is within window
  RETURN v_now >= (v_start_date - COALESCE(v_start_offset, '0'::interval))
    AND v_now <= (v_end_date + COALESCE(v_end_offset, '0'::interval));
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all scannable events and series for a given time
CREATE OR REPLACE FUNCTION public.get_scannable_items(
  p_organization_id uuid DEFAULT NULL
) RETURNS TABLE (
  item_id uuid,
  item_type text,
  item_name text,
  main_event_name text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  window_start timestamp with time zone,
  window_end timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  -- Get scannable events (no series)
  SELECT
    e.id as item_id,
    'event'::text as item_type,
    e.name as item_name,
    e.name as main_event_name,
    e.start_date,
    e.end_date,
    (e.start_date - COALESCE(e.checkin_window_start_offset, '0'::interval)) as window_start,
    (e.end_date + COALESCE(e.checkin_window_end_offset, '0'::interval)) as window_end
  FROM public.events e
  WHERE e.is_active = true
    AND e.series_id IS NULL
    AND (p_organization_id IS NULL OR e.organization_id = p_organization_id)
    AND now() >= (e.start_date - COALESCE(e.checkin_window_start_offset, '0'::interval))
    AND now() <= (e.end_date + COALESCE(e.checkin_window_end_offset, '0'::interval))

  UNION ALL

  -- Get scannable series
  SELECT
    es.id as item_id,
    'series'::text as item_type,
    es.name as item_name,
    e.name as main_event_name,
    es.start_date,
    es.end_date,
    (es.start_date - COALESCE(es.checkin_window_start_offset, '0'::interval)) as window_start,
    (es.end_date + COALESCE(es.checkin_window_end_offset, '0'::interval)) as window_end
  FROM public.event_series es
  JOIN public.events e ON es.main_event_id = e.id
  WHERE e.is_active = true
    AND (p_organization_id IS NULL OR es.organization_id = p_organization_id)
    AND now() >= (es.start_date - COALESCE(es.checkin_window_start_offset, '0'::interval))
    AND now() <= (es.end_date + COALESCE(es.checkin_window_end_offset, '0'::interval))

  ORDER BY window_start DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to verify wristband for event or series
CREATE OR REPLACE FUNCTION public.verify_wristband_access(
  p_wristband_id uuid,
  p_event_id uuid DEFAULT NULL,
  p_series_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_wristband record;
  v_result jsonb;
  v_is_valid boolean := false;
  v_message text := 'Access denied';
  v_reason text := '';
BEGIN
  -- Get wristband details
  SELECT * INTO v_wristband
  FROM public.wristbands
  WHERE id = p_wristband_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Wristband not found',
      'reason', 'invalid_wristband'
    );
  END IF;

  -- Check if wristband is active
  IF NOT v_wristband.is_active THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Wristband is inactive',
      'reason', 'inactive_wristband'
    );
  END IF;

  -- Check if wristband is blocked
  IF v_wristband.is_blocked THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Wristband is blocked',
      'reason', 'blocked_wristband'
    );
  END IF;

  -- Verify against series
  IF p_series_id IS NOT NULL THEN
    -- Check if wristband is assigned to this series OR to the main event
    IF v_wristband.series_id = p_series_id OR
       EXISTS (
         SELECT 1 FROM public.series_wristband_assignments
         WHERE series_id = p_series_id AND wristband_id = p_wristband_id AND is_active = true
       ) THEN
      v_is_valid := true;
      v_message := 'Access granted to series';
    ELSE
      v_reason := 'wristband_not_assigned_to_series';
      v_message := 'Wristband is not valid for this series';
    END IF;
  -- Verify against event
  ELSIF p_event_id IS NOT NULL THEN
    IF v_wristband.event_id = p_event_id THEN
      v_is_valid := true;
      v_message := 'Access granted to event';
    ELSE
      v_reason := 'wristband_not_assigned_to_event';
      v_message := 'Wristband is not valid for this event';
    END IF;
  ELSE
    v_reason := 'no_target_specified';
    v_message := 'No event or series specified';
  END IF;

  RETURN jsonb_build_object(
    'valid', v_is_valid,
    'message', v_message,
    'reason', v_reason,
    'wristband', jsonb_build_object(
      'id', v_wristband.id,
      'nfc_id', v_wristband.nfc_id,
      'category', v_wristband.category
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 7. CREATE VIEWS FOR ANALYTICS
-- =====================================================

-- View for series analytics
CREATE OR REPLACE VIEW public.series_analytics AS
SELECT
  es.id as series_id,
  es.name as series_name,
  es.main_event_id,
  e.name as main_event_name,
  COUNT(DISTINCT cl.wristband_id) as unique_checkins,
  COUNT(cl.id) as total_checkins,
  COUNT(DISTINCT cl.staff_id) as staff_count,
  COUNT(DISTINCT cl.gate_id) as gates_used,
  MIN(cl.checked_in_at) as first_checkin,
  MAX(cl.checked_in_at) as last_checkin
FROM public.event_series es
JOIN public.events e ON es.main_event_id = e.id
LEFT JOIN public.checkin_logs cl ON cl.series_id = es.id
GROUP BY es.id, es.name, es.main_event_id, e.name;

-- View for main event analytics (includes all series)
CREATE OR REPLACE VIEW public.main_event_analytics AS
SELECT
  e.id as event_id,
  e.name as event_name,
  COUNT(DISTINCT es.id) as series_count,
  COUNT(DISTINCT sub_events.id) as sub_events_count,
  COUNT(DISTINCT COALESCE(cl_direct.wristband_id, cl_series.wristband_id)) as total_unique_checkins,
  COUNT(cl_direct.id) + COUNT(cl_series.id) as total_checkins
FROM public.events e
LEFT JOIN public.event_series es ON es.main_event_id = e.id
LEFT JOIN public.events sub_events ON sub_events.series_id = es.id
LEFT JOIN public.checkin_logs cl_direct ON cl_direct.event_id = e.id AND cl_direct.series_id IS NULL
LEFT JOIN public.checkin_logs cl_series ON cl_series.series_id = es.id
WHERE e.has_series = true
GROUP BY e.id, e.name;

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_wristband_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for event_series: Users can view series for their organization
CREATE POLICY event_series_select_policy ON public.event_series
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy for event_series: Users can insert series for their organization
CREATE POLICY event_series_insert_policy ON public.event_series
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy for event_series: Users can update their organization's series
CREATE POLICY event_series_update_policy ON public.event_series
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy for series_wristband_assignments
CREATE POLICY series_wristband_assignments_policy ON public.series_wristband_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      WHERE es.id = series_id
      AND (
        es.organization_id IN (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
        OR
        es.organization_id IN (
          SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
        )
      )
    )
  );

-- =====================================================
-- 9. CREATE AUDIT TRIGGERS
-- =====================================================

-- Update timestamp trigger for event_series
CREATE OR REPLACE FUNCTION public.update_event_series_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_series_updated_at
  BEFORE UPDATE ON public.event_series
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_series_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE public.event_series IS 'Stores event series that group multiple events together (e.g., tournament rounds, festival days)';
COMMENT ON TABLE public.series_wristband_assignments IS 'Maps wristbands to specific series for access control';
COMMENT ON FUNCTION public.is_within_checkin_window IS 'Checks if current time is within check-in window for event or series';
COMMENT ON FUNCTION public.get_scannable_items IS 'Returns all events and series currently within their check-in windows';
COMMENT ON FUNCTION public.verify_wristband_access IS 'Verifies if a wristband has access to a specific event or series';
