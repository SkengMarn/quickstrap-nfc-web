-- Complete fix for infinite recursion in event_access RLS policies
-- Run this in Supabase SQL Editor

-- First, disable RLS temporarily to avoid conflicts
ALTER TABLE public.event_access DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on event_access table
DROP POLICY IF EXISTS "Users can view event access" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage event access" ON public.event_access;
DROP POLICY IF EXISTS "Event owners can manage access" ON public.event_access;
DROP POLICY IF EXISTS "Users can view their own access" ON public.event_access;
DROP POLICY IF EXISTS "Event creators can manage access" ON public.event_access;
DROP POLICY IF EXISTS "Event admins can view access" ON public.event_access;
DROP POLICY IF EXISTS "Users can view access for their events" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage access for their events" ON public.event_access;
DROP POLICY IF EXISTS "Event access select policy" ON public.event_access;
DROP POLICY IF EXISTS "Event access insert policy" ON public.event_access;
DROP POLICY IF EXISTS "Event access update policy" ON public.event_access;
DROP POLICY IF EXISTS "Event access delete policy" ON public.event_access;

-- Create new, simple, non-recursive policies
CREATE POLICY "event_access_select_policy" ON public.event_access
    FOR SELECT USING (
        auth.uid() = user_id 
        OR 
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "event_access_insert_policy" ON public.event_access
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "event_access_update_policy" ON public.event_access
    FOR UPDATE USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "event_access_delete_policy" ON public.event_access
    FOR DELETE USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

-- Re-enable RLS
ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_access';
