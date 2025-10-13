-- Fix for infinite recursion in organization_members RLS policies
-- This error occurs when RLS policies reference each other in a circular manner

-- First, temporarily disable RLS on organization_members to break the cycle
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can manage organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization members can view their organization" ON public.organization_members;

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

-- Create helper function to get user's organization IDs without RLS recursion
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_org_ids() TO authenticated;

CREATE POLICY "Users can view members of their organizations" ON public.organization_members
    FOR SELECT USING (
        organization_id IN (SELECT get_user_org_ids())
    );

-- Re-enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Also ensure wristbands table has proper policies without circular references
DROP POLICY IF EXISTS "Users can view wristbands for their events" ON public.wristbands;

CREATE POLICY "Users can view wristbands for their events" ON public.wristbands
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
            OR id IN (
                SELECT event_id FROM public.event_access 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Temporarily create a simple wristbands policy without event_access reference
-- This breaks the circular dependency
CREATE POLICY "Users can manage wristbands for their events" ON public.wristbands
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

-- Fix event_access table infinite recursion
DROP POLICY IF EXISTS "Users can view event access" ON public.event_access;
DROP POLICY IF EXISTS "Users can manage event access" ON public.event_access;
DROP POLICY IF EXISTS "Event owners can manage access" ON public.event_access;

-- Create simple, non-recursive policies for event_access
CREATE POLICY "Users can view their own access" ON public.event_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Event creators can manage access" ON public.event_access
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Event admins can view access" ON public.event_access
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM public.events e
            WHERE e.created_by = auth.uid()
        )
        OR user_id = auth.uid()
    );

-- Now that event_access policies are fixed, we can safely re-enable the full wristbands policy
DROP POLICY IF EXISTS "Users can manage wristbands for their events" ON public.wristbands;

CREATE POLICY "Users can manage wristbands for their events" ON public.wristbands
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
            OR id IN (
                SELECT event_id FROM public.event_access 
                WHERE user_id = auth.uid() 
                AND access_level IN ('admin', 'owner')
            )
        )
    );
