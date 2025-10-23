-- Update existing events to have an organization
-- This fixes events created before organization system was implemented

-- First, create a default "System Organization" if it doesn't exist
INSERT INTO public.organizations (id, name, created_at, updated_at)
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'System Organization',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Update all events that don't have an organization_id
UPDATE public.events 
SET organization_id = '00000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Create organization membership for the event creators
-- This ensures they can still access their events
INSERT INTO public.organization_members (organization_id, user_id, role, status, invited_by, joined_at)
SELECT DISTINCT 
  '00000000-0000-4000-8000-000000000001'::uuid,
  created_by,
  'owner',
  'active',
  created_by,
  NOW()
FROM public.events 
WHERE created_by IS NOT NULL
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Grant event access to the creators through the new organization system
-- This will be handled automatically by the triggers we created, but let's ensure it
INSERT INTO public.event_access (user_id, event_id, access_level, granted_by, granted_at)
SELECT DISTINCT 
  e.created_by,
  e.id,
  'owner',
  e.created_by,
  NOW()
FROM public.events e
WHERE e.created_by IS NOT NULL
  AND e.organization_id = '00000000-0000-4000-8000-000000000001'::uuid
ON CONFLICT (user_id, event_id) DO NOTHING;

-- Success message
DO $$
DECLARE
  updated_events_count INTEGER;
  created_memberships_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_events_count 
  FROM public.events 
  WHERE organization_id = '00000000-0000-4000-8000-000000000001'::uuid;
  
  SELECT COUNT(*) INTO created_memberships_count 
  FROM public.organization_members 
  WHERE organization_id = '00000000-0000-4000-8000-000000000001'::uuid;
  
  RAISE NOTICE '✅ System Organization created/verified';
  RAISE NOTICE '📊 % existing events updated with organization', updated_events_count;
  RAISE NOTICE '👥 % organization memberships created for event creators', created_memberships_count;
  RAISE NOTICE '🔗 Event creators now have automatic access to their events';
  RAISE NOTICE '🎯 Ready for new organization-based event creation!';
END $$;
