-- Create missing organization_members table
-- This table manages which users belong to which organizations and their roles
--
-- ROLE HIERARCHY:
-- 'owner' - Organization owner, automatically becomes owner of ALL events in org
-- 'co_owner' - Same as owner, can belong to multiple organizations  
-- 'scanner' - Staff member, can belong to multiple organizations/events
--
-- AUTOMATIC EVENT ACCESS:
-- When event is created with organization_id:
-- - All org 'owner' and 'co_owner' get automatic 'owner' access to event
-- - All org 'scanner' get automatic 'scanner' access to event

CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'scanner',
  status text NOT NULL DEFAULT 'active',
  invited_by uuid,
  invited_at timestamp with time zone DEFAULT now(),
  joined_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT organization_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id),
  
  -- Ensure unique membership per organization
  CONSTRAINT organization_members_unique_membership UNIQUE (organization_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON public.organization_members(status);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;

-- Create RLS policies
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Users can see memberships for organizations they belong to
CREATE POLICY "Users can view organization memberships" ON public.organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid() 
        AND om.status = 'active'
    )
  );

-- Organization owners/admins can manage memberships
CREATE POLICY "Organization admins can manage memberships" ON public.organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid() 
        AND om.status = 'active' 
        AND om.role IN ('owner', 'co_owner')
    )
  );

-- Create function to automatically grant event access based on organization membership
CREATE OR REPLACE FUNCTION auto_grant_event_access_from_org()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if event has an organization_id
  IF NEW.organization_id IS NOT NULL THEN
    -- Grant access to all organization members based on their org role
    INSERT INTO public.event_access (user_id, event_id, access_level, granted_by, granted_at)
    SELECT 
      om.user_id,
      NEW.id,
      CASE 
        WHEN om.role IN ('owner', 'co_owner') THEN 'owner'
        WHEN om.role = 'scanner' THEN 'scanner'
        ELSE 'scanner'
      END,
      NEW.created_by,
      NOW()
    FROM public.organization_members om
    WHERE om.organization_id = NEW.organization_id 
      AND om.status = 'active'
    ON CONFLICT (user_id, event_id) DO NOTHING; -- Avoid duplicates
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-grant access when event is created
DROP TRIGGER IF EXISTS trigger_auto_grant_event_access ON public.events;
CREATE TRIGGER trigger_auto_grant_event_access
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION auto_grant_event_access_from_org();

-- Create function to auto-grant access when new members join organization
CREATE OR REPLACE FUNCTION auto_grant_existing_events_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process active memberships
  IF NEW.status = 'active' THEN
    -- Grant access to all existing events in this organization
    INSERT INTO public.event_access (user_id, event_id, access_level, granted_by, granted_at)
    SELECT 
      NEW.user_id,
      e.id,
      CASE 
        WHEN NEW.role IN ('owner', 'co_owner') THEN 'owner'
        WHEN NEW.role = 'scanner' THEN 'scanner'
        ELSE 'scanner'
      END,
      NEW.invited_by,
      NOW()
    FROM public.events e
    WHERE e.organization_id = NEW.organization_id
    ON CONFLICT (user_id, event_id) DO NOTHING; -- Avoid duplicates
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-grant access when new org member is added
DROP TRIGGER IF EXISTS trigger_auto_grant_existing_events_access ON public.organization_members;
CREATE TRIGGER trigger_auto_grant_existing_events_access
  AFTER INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_grant_existing_events_access();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ organization_members table created successfully!';
    RAISE NOTICE '📋 Table includes: owner, co_owner, scanner roles';
    RAISE NOTICE '🔒 RLS policies enabled for secure access';
    RAISE NOTICE '⚡ Performance indexes created';
    RAISE NOTICE '🤖 Auto-grant triggers created for event access inheritance';
    RAISE NOTICE '🎯 Organization owners automatically become event owners';
END $$;
