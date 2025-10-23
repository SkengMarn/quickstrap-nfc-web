-- Fix infinite recursion in organization_members RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Organization admins can manage memberships" ON public.organization_members;

-- Create fixed policies without recursion
CREATE POLICY "Users can view organization memberships" ON public.organization_members
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "Organization owners can manage memberships" ON public.organization_members
  FOR ALL USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT o.id FROM public.organizations o
      WHERE o.created_by = auth.uid()
    )
  );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed organization_members RLS policies';
    RAISE NOTICE '🔒 Removed infinite recursion';
    RAISE NOTICE '👥 Users can view their own memberships';
    RAISE NOTICE '🏢 Organization creators can manage all memberships';
END $$;
