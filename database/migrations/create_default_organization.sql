-- ============================================================================
-- CREATE DEFAULT ORGANIZATION FOR ADMIN PORTAL
-- This portal is for service providers only (not multi-tenant)
-- All admins belong to ONE organization
-- ============================================================================

-- Insert default organization for the admin portal
INSERT INTO public.organizations (
  id,
  name,
  slug,
  description,
  subscription_tier,
  max_events,
  max_wristbands,
  max_team_members,
  primary_color,
  secondary_color,
  settings,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'QuickStrap Admin',
  'quickstrap-admin',
  'Admin portal organization',
  'enterprise',
  999999,
  999999,
  999999,
  '#3B82F6',
  '#1E40AF',
  '{}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Add all existing users to the default organization as admins
INSERT INTO public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  joined_at,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-4000-8000-000000000001',
  au.id,
  'admin',
  'active',
  NOW(),
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.user_id = au.id
  AND om.organization_id = '00000000-0000-4000-8000-000000000001'
)
ON CONFLICT (organization_id, user_id) DO UPDATE SET
  status = 'active',
  updated_at = NOW();

-- Create organization settings
INSERT INTO public.organization_settings (
  organization_id,
  features,
  notifications,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  '{"api_access": true, "ai_insights": true, "white_label": false, "fraud_detection": true, "custom_workflows": true}'::jsonb,
  '{"sms_enabled": true, "push_enabled": true, "email_enabled": true}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (organization_id) DO UPDATE SET
  features = EXCLUDED.features,
  updated_at = NOW();

-- Verification
DO $$
DECLARE
  org_count INTEGER;
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM public.organizations WHERE id = '00000000-0000-4000-8000-000000000001';
  SELECT COUNT(*) INTO member_count FROM public.organization_members WHERE organization_id = '00000000-0000-4000-8000-000000000001';

  IF org_count = 0 THEN
    RAISE EXCEPTION 'Default organization not created';
  END IF;

  RAISE NOTICE '✅ Admin organization created successfully';
  RAISE NOTICE '   Organization ID: 00000000-0000-4000-8000-000000000001';
  RAISE NOTICE '   Admin users: %', member_count;
  RAISE NOTICE '   All portal users are admins in this single organization';
END $$;
