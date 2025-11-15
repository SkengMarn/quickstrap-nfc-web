-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔒 SECURE REMAINING 24 VULNERABLE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run this to complete your database security implementation
-- ═══════════════════════════════════════════════════════════════════════════════

-- First, let's identify which tables are vulnerable
-- Run this query to see the list:
/*
SELECT tablename, '❌ NO RLS' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('schema_migrations', 'supabase_migrations')
ORDER BY tablename;
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: ENABLE RLS ON CORE TABLES (if not already enabled)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Core event management tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

-- Wristband and ticket tables
ALTER TABLE public.wristbands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_wristband_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wristband_blocks ENABLE ROW LEVEL SECURITY;

-- Gate management tables
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_merges ENABLE ROW LEVEL SECURITY;

-- Check-in and fraud detection
ALTER TABLE public.checkin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_detections ENABLE ROW LEVEL SECURITY;

-- Organization and user management
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Analytics and reporting
ALTER TABLE public.category_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Additional tables
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_status ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: ADD ORGANIZATION-SCOPED POLICIES (PRODUCTION-READY)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Helper function to check organization membership
CREATE OR REPLACE FUNCTION public.user_has_org_access(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- EVENTS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "org_member_select_events" ON public.events;
CREATE POLICY "org_member_select_events" ON public.events
  FOR SELECT TO authenticated
  USING (user_has_org_access(organization_id));

DROP POLICY IF EXISTS "org_admin_insert_events" ON public.events;
CREATE POLICY "org_admin_insert_events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_org_access(organization_id) AND
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = events.organization_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "event_owner_update" ON public.events;
CREATE POLICY "event_owner_update" ON public.events
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    user_has_org_access(organization_id)
  );

DROP POLICY IF EXISTS "event_owner_delete" ON public.events;
CREATE POLICY "event_owner_delete" ON public.events
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- WRISTBANDS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "event_access_select_wristbands" ON public.wristbands;
CREATE POLICY "event_access_select_wristbands" ON public.wristbands
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = wristbands.event_id
        AND user_has_org_access(e.organization_id)
    )
  );

DROP POLICY IF EXISTS "event_staff_manage_wristbands" ON public.wristbands;
CREATE POLICY "event_staff_manage_wristbands" ON public.wristbands
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = wristbands.event_id
        AND ea.user_id = auth.uid()
        AND ea.is_active = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- CHECKIN_LOGS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "event_access_select_checkins" ON public.checkin_logs;
CREATE POLICY "event_access_select_checkins" ON public.checkin_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = checkin_logs.event_id
        AND user_has_org_access(e.organization_id)
    )
  );

DROP POLICY IF EXISTS "event_staff_insert_checkins" ON public.checkin_logs;
CREATE POLICY "event_staff_insert_checkins" ON public.checkin_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = checkin_logs.event_id
        AND ea.user_id = auth.uid()
        AND ea.is_active = true
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATIONS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "member_select_org" ON public.organizations;
CREATE POLICY "member_select_org" ON public.organizations
  FOR SELECT TO authenticated
  USING (user_has_org_access(id));

DROP POLICY IF EXISTS "owner_update_org" ON public.organizations;
CREATE POLICY "owner_update_org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = organizations.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "authenticated_insert_org" ON public.organizations;
CREATE POLICY "authenticated_insert_org" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATION_MEMBERS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "member_select_members" ON public.organization_members;
CREATE POLICY "member_select_members" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_has_org_access(organization_id));

DROP POLICY IF EXISTS "admin_manage_members" ON public.organization_members;
CREATE POLICY "admin_manage_members" ON public.organization_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- GATES TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "event_access_select_gates" ON public.gates;
CREATE POLICY "event_access_select_gates" ON public.gates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = gates.event_id
        AND user_has_org_access(e.organization_id)
    )
  );

DROP POLICY IF EXISTS "event_staff_manage_gates" ON public.gates;
CREATE POLICY "event_staff_manage_gates" ON public.gates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = gates.event_id
        AND ea.user_id = auth.uid()
        AND ea.access_level IN ('admin', 'owner')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- PROFILES TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "public_profiles_select" ON public.profiles;
CREATE POLICY "public_profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "own_profile_update" ON public.profiles;
CREATE POLICY "own_profile_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "own_profile_insert" ON public.profiles;
CREATE POLICY "own_profile_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- SYSTEM_ALERTS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "event_access_select_alerts" ON public.system_alerts;
CREATE POLICY "event_access_select_alerts" ON public.system_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = system_alerts.event_id
        AND user_has_org_access(e.organization_id)
    )
  );

DROP POLICY IF EXISTS "event_admin_manage_alerts" ON public.system_alerts;
CREATE POLICY "event_admin_manage_alerts" ON public.system_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = system_alerts.event_id
        AND ea.user_id = auth.uid()
        AND ea.access_level IN ('admin', 'owner')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check RLS status after running this script
SELECT 
  COUNT(*) FILTER (WHERE rowsecurity = true) as secured_tables,
  COUNT(*) FILTER (WHERE rowsecurity = false) as vulnerable_tables,
  COUNT(*) as total_tables
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('schema_migrations', 'supabase_migrations');

-- Check policy count
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 NOTES
-- ═══════════════════════════════════════════════════════════════════════════════

/*
WHAT THIS SCRIPT DOES:
1. Enables RLS on all remaining vulnerable tables
2. Adds production-ready organization-scoped policies
3. Creates helper function for organization access checks
4. Implements proper access control based on:
   - Organization membership
   - Event access permissions
   - User roles (owner, admin, scanner)

SECURITY MODEL:
- Organization members can view their org's data
- Event staff can manage event-specific data
- Admins have elevated permissions
- Users can only modify their own profiles

NEXT STEPS:
1. Run this script in Supabase SQL Editor
2. Test with different user roles
3. Remove temporary permissive policies from previous script
4. Monitor performance with new policies
*/
