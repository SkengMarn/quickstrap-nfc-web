-- ============================================================================
-- FIX: Infinite Recursion in RLS Policies
-- ============================================================================
-- The organization_members RLS policy was causing infinite recursion
-- because it queries organization_members within its own policy check
-- ============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;

-- Create a simpler, non-recursive policy
-- Users can see their own membership records
CREATE POLICY "Users can view their own org memberships"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Create a separate policy for viewing other members in same org
-- This uses a SECURITY DEFINER function to bypass RLS in the subquery
CREATE OR REPLACE FUNCTION user_is_org_member(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view other members in their orgs"
  ON public.organization_members FOR SELECT
  USING (user_is_org_member(organization_id));

-- ============================================================================
-- COMMENT
-- ============================================================================
COMMENT ON FUNCTION user_is_org_member IS 'Helper function to check if current user is active member of organization (bypasses RLS)';
