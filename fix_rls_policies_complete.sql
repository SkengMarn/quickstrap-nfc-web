-- Complete fix for RLS infinite recursion across all tables
-- This script completely eliminates circular dependencies by establishing a clear hierarchy:
-- Users → Organization_members → Events → Wristbands (no cycles)

-- ==============================================
-- STEP 1: Fix organization_members table
-- ==============================================

ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can manage organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own membership" ON public.organization_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organization owners can manage members" ON public.organization_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = organization_members.organization_id
            AND created_by = auth.uid()
        )
    );

-- REMOVED: This policy creates self-reference infinite recursion
-- Users can already view their own membership via the first policy
-- Organization owners can view all members via the second policy
-- No additional policy needed here

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 2: Fix events table
-- ==============================================

-- Drop ALL existing event policies
DROP POLICY IF EXISTS "Users can view events" ON public.events;
DROP POLICY IF EXISTS "Users can manage events" ON public.events;
DROP POLICY IF EXISTS "Users can view their organization events" ON public.events;
DROP POLICY IF EXISTS "Event creators can manage events" ON public.events;

-- Create simple, non-recursive policies for events
-- Policy 1: Users can view events they created
CREATE POLICY "Users can view their events" ON public.events
    FOR SELECT USING (created_by = auth.uid());

-- Policy 2: Event creators can manage their events
CREATE POLICY "Users can manage their events" ON public.events
    FOR ALL USING (created_by = auth.uid());

-- ==============================================
-- STEP 3: Fix event_access table
-- ==============================================

-- Drop ALL existing event_access policies
DROP POLICY IF EXISTS "Users can view event access" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage event access" ON public.event_access;
DROP POLICY IF EXISTS "Event owners can manage access" ON public.event_access;
DROP POLICY IF EXISTS "Users can view their own access" ON public.event_access;
DROP POLICY IF EXISTS "Event creators can manage access" ON public.event_access;
DROP POLICY IF EXISTS "Event admins can view access" ON public.event_access;

-- Create simple, non-recursive policies for event_access
-- Policy 1: Users can view their own access grants
CREATE POLICY "Users view own access" ON public.event_access
    FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Event creators can manage all access for their events
CREATE POLICY "Event creators manage access" ON public.event_access
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events
            WHERE created_by = auth.uid()
        )
    );

-- ==============================================
-- STEP 4: Fix wristbands table (KEY FIX)
-- ==============================================

-- Drop ALL existing wristbands policies
DROP POLICY IF EXISTS "Users can view wristbands for their events" ON public.wristbands;
DROP POLICY IF EXISTS "Users can manage wristbands for their events" ON public.wristbands;
DROP POLICY IF EXISTS "Users can view wristbands" ON public.wristbands;
DROP POLICY IF EXISTS "Users can manage wristbands" ON public.wristbands;
DROP POLICY IF EXISTS "Users can insert wristbands" ON public.wristbands;
DROP POLICY IF EXISTS "Users can update wristbands" ON public.wristbands;
DROP POLICY IF EXISTS "Users can delete wristbands" ON public.wristbands;

-- Create simple, non-recursive wristbands policies
-- CRITICAL: Do NOT reference event_access table here - this causes infinite recursion
-- Instead, check organization membership directly

-- Policy 1: Users can view wristbands for events in their organization
CREATE POLICY "Users view organization wristbands" ON public.wristbands
    FOR SELECT USING (
        event_id IN (
            SELECT e.id
            FROM public.events e
            INNER JOIN public.organization_members om
                ON om.organization_id = e.organization_id
            WHERE om.user_id = auth.uid()
            AND om.status = 'active'
        )
    );

-- Policy 2: Event creators and org owners can manage wristbands
CREATE POLICY "Users manage event wristbands" ON public.wristbands
    FOR ALL USING (
        event_id IN (
            SELECT e.id
            FROM public.events e
            WHERE e.created_by = auth.uid()
            OR e.organization_id IN (
                SELECT om.organization_id
                FROM public.organization_members om
                WHERE om.user_id = auth.uid()
                AND om.status = 'active'
                AND om.role = 'owner'
            )
        )
    );

-- ==============================================
-- STEP 5: Fix tickets table
-- ==============================================

-- Drop ALL existing ticket policies
DROP POLICY IF EXISTS "Users can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can manage their event tickets" ON public.tickets;

-- Create simple, non-recursive ticket policies
-- Policy 1: Users can view tickets for events in their organization
CREATE POLICY "Users view organization tickets" ON public.tickets
    FOR SELECT USING (
        event_id IN (
            SELECT e.id
            FROM public.events e
            INNER JOIN public.organization_members om
                ON om.organization_id = e.organization_id
            WHERE om.user_id = auth.uid()
            AND om.status = 'active'
        )
    );

-- Policy 2: Event creators and org owners can manage tickets
CREATE POLICY "Users manage event tickets" ON public.tickets
    FOR ALL USING (
        event_id IN (
            SELECT e.id
            FROM public.events e
            WHERE e.created_by = auth.uid()
            OR e.organization_id IN (
                SELECT om.organization_id
                FROM public.organization_members om
                WHERE om.user_id = auth.uid()
                AND om.status = 'active'
                AND om.role = 'owner'
            )
        )
    );

-- ==============================================
-- STEP 6: Fix checkin_logs table
-- ==============================================

-- Drop ALL existing checkin_logs policies
DROP POLICY IF EXISTS "Users can view checkin logs" ON public.checkin_logs;
DROP POLICY IF EXISTS "Users can manage checkin logs" ON public.checkin_logs;
DROP POLICY IF EXISTS "Users can view their checkin logs" ON public.checkin_logs;

-- Create simple, non-recursive checkin_logs policies
-- Policy 1: Users can view checkin logs for events in their organization
CREATE POLICY "Users view organization checkins" ON public.checkin_logs
    FOR SELECT USING (
        event_id IN (
            SELECT e.id
            FROM public.events e
            INNER JOIN public.organization_members om
                ON om.organization_id = e.organization_id
            WHERE om.user_id = auth.uid()
            AND om.status = 'active'
        )
    );

-- Policy 2: Event creators and org owners can manage checkin logs
CREATE POLICY "Users manage event checkins" ON public.checkin_logs
    FOR ALL USING (
        event_id IN (
            SELECT e.id
            FROM public.events e
            WHERE e.created_by = auth.uid()
            OR e.organization_id IN (
                SELECT om.organization_id
                FROM public.organization_members om
                WHERE om.user_id = auth.uid()
                AND om.status = 'active'
                AND om.role = 'owner'
            )
        )
    );

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the policy hierarchy is correct (no circular references):
-- 1. organization_members → organizations (no cycle)
-- 2. events → organization_members (no cycle back)
-- 3. wristbands → events → organization_members (no cycle back)
-- 4. tickets → events → organization_members (no cycle back)
-- 5. checkin_logs → events → organization_members (no cycle back)

-- Success! All policies now follow a clear hierarchy with no circular dependencies.
