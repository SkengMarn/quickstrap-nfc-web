-- ═══════════════════════════════════════════════════════════════════════════════
-- COMBINED FIX: Organization RLS + Security Hardening
-- ═══════════════════════════════════════════════════════════════════════════════
-- This combines the critical fixes with the organization RLS fix
-- Safe to run in production: YES
-- Requires downtime: NO
-- Time to run: ~5 minutes
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: FIX ORGANIZATION INFINITE RECURSION (CRITICAL FOR YOUR APP)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop all existing problematic organization policies
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own org memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view other members in their orgs" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Organization members can view their org" ON public.organizations;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view members in their orgs" ON public.organization_members;
DROP POLICY IF EXISTS "Users can insert memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can update memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can delete memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can delete owned organizations" ON public.organizations;

-- Drop and recreate helper functions
DROP FUNCTION IF EXISTS public.user_is_org_member(uuid);
DROP FUNCTION IF EXISTS public.user_organization_ids();

-- Create SECURITY DEFINER functions to break recursion
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  is_member boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  ) INTO is_member;

  RETURN COALESCE(is_member, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS TABLE (organization_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid()
    AND om.status = 'active';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.user_is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;

-- Create new non-recursive organization_members policies
CREATE POLICY "Users can view own memberships"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view members in their orgs"
  ON public.organization_members FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_organization_ids()));

CREATE POLICY "Users can insert memberships"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_members.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Users can update memberships"
  ON public.organization_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

CREATE POLICY "Users can delete memberships"
  ON public.organization_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Create new organizations policies
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (id IN (SELECT organization_id FROM public.user_organization_ids()));

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their organizations"
  ON public.organizations FOR UPDATE
  USING (
    public.user_is_org_member(id) AND
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "Users can delete owned organizations"
  ON public.organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND status = 'active'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: ENABLE RLS ON OTHER TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_creation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_performance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_wifi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_merge_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_category_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_link_audit ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: ADD TEMPORARY POLICIES FOR OTHER TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- Note: Replace these with organization-scoped policies later

CREATE POLICY "temp_auth_select" ON public.profile_creation_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.gate_performance_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.beacons FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.fraud_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.gate_bindings FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.gate_geofences FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.gate_wifi FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.gate_merge_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.fraud_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.watchlist FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.emergency_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.emergency_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.event_state_transitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.event_category_limits FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.ticket_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY "temp_auth_select" ON public.ticket_link_audit FOR SELECT TO authenticated USING (true);

-- Organization settings policy
DROP POLICY IF EXISTS "Users can view org settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can manage org settings" ON public.organization_settings;

CREATE POLICY "Users can view org settings"
  ON public.organization_settings FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_organization_ids()));

CREATE POLICY "Users can manage org settings"
  ON public.organization_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organization_settings.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: ADD CRITICAL PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Organization indexes (for the RLS fix)
CREATE INDEX IF NOT EXISTS idx_org_members_user_status
  ON public.organization_members(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_org_members_org_status
  ON public.organization_members(organization_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_org_members_user_org_role
  ON public.organization_members(user_id, organization_id, role, status) WHERE status = 'active';

-- Other foreign key indexes
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_organization_id ON public.active_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_ticket_id ON public.checkin_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_gate_id ON public.checkin_logs(gate_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_wristband_id ON public.checkin_logs(wristband_id);
CREATE INDEX IF NOT EXISTS idx_events_status_changed_by ON public.events(status_changed_by);
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);

-- RLS column indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON public.api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_organization_id ON public.fraud_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_organization_id ON public.watchlist(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_incidents_organization_id ON public.emergency_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_emergency_actions_organization_id ON public.emergency_actions(organization_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: FIX PRIMARY KEY
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.event_analytics'::regclass
    AND contype = 'p'
  ) THEN
    ALTER TABLE public.event_analytics ADD PRIMARY KEY (event_id);
  END IF;
END $$;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ DONE! VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'Combined fix applied successfully!' as status;

-- Verify RLS is enabled
SELECT
  schemaname || '.' || tablename as table_name,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'organization_members', 'organization_settings')
ORDER BY tablename;
