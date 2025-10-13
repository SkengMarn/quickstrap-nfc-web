-- Fix infinite recursion in event_access table policies

-- ==============================================
-- STEP 1: Drop ALL existing event_access policies
-- ==============================================

DROP POLICY IF EXISTS "Users can view event access" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage event access" ON public.event_access;
DROP POLICY IF EXISTS "Event owners can manage access" ON public.event_access;
DROP POLICY IF EXISTS "Users can view their own access" ON public.event_access;
DROP POLICY IF EXISTS "Users can view their event access" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage their event access" ON public.event_access;

-- ==============================================
-- STEP 2: Create simple, non-recursive policies
-- ==============================================

-- Policy 1: Users can view their own access records
CREATE POLICY "Users can view own access" ON public.event_access
    FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Event owners can view all access for their events
CREATE POLICY "Event owners can view access" ON public.event_access
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

-- Policy 3: Event owners can manage access for their events
CREATE POLICY "Event owners can manage access" ON public.event_access
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

-- ==============================================
-- STEP 3: Ensure RLS is enabled
-- ==============================================

ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;
