-- =====================================================
-- FIX EVENT SERIES RLS POLICIES
-- =====================================================
-- This fixes the "new row violates row-level security policy" error
-- when creating series
-- =====================================================

-- First, drop all existing policies on event_series
DROP POLICY IF EXISTS event_series_select_policy ON public.event_series;
DROP POLICY IF EXISTS event_series_insert_policy ON public.event_series;
DROP POLICY IF EXISTS event_series_update_policy ON public.event_series;
DROP POLICY IF EXISTS event_series_delete_policy ON public.event_series;
DROP POLICY IF EXISTS event_series_org_access ON public.event_series;

-- Create new comprehensive policies that work correctly

-- SELECT: Users can view series for their organization's events
CREATE POLICY event_series_select_policy ON public.event_series
  FOR SELECT
  USING (
    -- User is a member of the organization that owns the main event
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = event_series.main_event_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
    OR
    -- Or the series is public
    is_public = true
  );

-- INSERT: Users can create series for events in their organization
CREATE POLICY event_series_insert_policy ON public.event_series
  FOR INSERT
  WITH CHECK (
    -- User must be a member of the organization that owns the main event
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = event_series.main_event_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
    AND
    -- The organization_id must match the main event's organization
    organization_id IN (
      SELECT e.organization_id
      FROM public.events e
      WHERE e.id = event_series.main_event_id
    )
  );

-- UPDATE: Users can update series for their organization's events
CREATE POLICY event_series_update_policy ON public.event_series
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = event_series.main_event_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = event_series.main_event_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- DELETE: Users can delete series for their organization's events
CREATE POLICY event_series_delete_policy ON public.event_series
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = event_series.main_event_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

-- Verify the policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'event_series'
ORDER BY policyname;

-- =====================================================
-- ALSO FIX OTHER SERIES TABLES
-- =====================================================

-- Fix series_gates policies
DROP POLICY IF EXISTS series_gates_org_access ON public.series_gates;

CREATE POLICY series_gates_select_policy ON public.series_gates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_gates.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY series_gates_insert_policy ON public.series_gates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_gates.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY series_gates_update_policy ON public.series_gates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_gates.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY series_gates_delete_policy ON public.series_gates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_gates.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

-- Fix series_category_limits policies
DROP POLICY IF EXISTS series_category_limits_org_access ON public.series_category_limits;

CREATE POLICY series_category_limits_all_policy ON public.series_category_limits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_category_limits.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_category_limits.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- Fix series_wristband_assignments policies
DROP POLICY IF EXISTS series_wristband_assignments_org_access ON public.series_wristband_assignments;

CREATE POLICY series_wristband_assignments_all_policy ON public.series_wristband_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_wristband_assignments.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_wristband_assignments.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- Fix series_tickets policies
DROP POLICY IF EXISTS series_tickets_org_access ON public.series_tickets;

CREATE POLICY series_tickets_all_policy ON public.series_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_tickets.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_tickets.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- Fix series_metrics_cache policies (read-only for most users)
DROP POLICY IF EXISTS series_metrics_cache_org_access ON public.series_metrics_cache;

CREATE POLICY series_metrics_cache_select_policy ON public.series_metrics_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_metrics_cache.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Fix series_templates policies
DROP POLICY IF EXISTS series_templates_org_access ON public.series_templates;

CREATE POLICY series_templates_select_policy ON public.series_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
    )
    OR is_public = true
  );

CREATE POLICY series_templates_insert_policy ON public.series_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY series_templates_update_policy ON public.series_templates
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY series_templates_delete_policy ON public.series_templates
  FOR DELETE
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

-- Fix series_state_transitions (read-only)
DROP POLICY IF EXISTS series_state_transitions_org_access ON public.series_state_transitions;

CREATE POLICY series_state_transitions_select_policy ON public.series_state_transitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_series es
      JOIN public.events e ON e.id = es.main_event_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE es.id = series_state_transitions.series_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Verify all policies
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename LIKE '%series%'
ORDER BY tablename, policyname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Event Series RLS policies have been fixed!';
  RAISE NOTICE 'You should now be able to create series without RLS errors.';
END $$;
