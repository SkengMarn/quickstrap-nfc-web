-- Final cleanup - Remove all conflicting policies and keep only simple ones
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily
ALTER TABLE public.event_access DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (including the problematic circular ones)
DROP POLICY IF EXISTS "Admins and owners can manage all access" ON public.event_access;
DROP POLICY IF EXISTS "Event owners can view access" ON public.event_access;
DROP POLICY IF EXISTS "Users can view own access" ON public.event_access;
DROP POLICY IF EXISTS "event_access_delete" ON public.event_access;
DROP POLICY IF EXISTS "event_access_insert" ON public.event_access;
DROP POLICY IF EXISTS "event_access_select" ON public.event_access;
DROP POLICY IF EXISTS "event_access_update" ON public.event_access;
DROP POLICY IF EXISTS "manage_event_access_for_own_events" ON public.event_access;
DROP POLICY IF EXISTS "view_own_event_access" ON public.event_access;

-- Keep only the new simple policies (these should already exist from previous run)
-- DROP POLICY IF EXISTS "event_access_select_policy" ON public.event_access;
-- DROP POLICY IF EXISTS "event_access_insert_policy" ON public.event_access;
-- DROP POLICY IF EXISTS "event_access_update_policy" ON public.event_access;
-- DROP POLICY IF EXISTS "event_access_delete_policy" ON public.event_access;

-- Re-enable RLS
ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;

-- Verify only our simple policies remain
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'event_access'
ORDER BY policyname;
