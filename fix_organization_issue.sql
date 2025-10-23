-- Fix organization issue for event creation
-- This ensures the default organization exists and all users are members

-- First, check if the organization exists
DO $$
DECLARE
  org_exists INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_exists FROM public.organizations WHERE id = '00000000-0000-4000-8000-000000000001';
  
  IF org_exists = 0 THEN
    RAISE NOTICE 'Creating default organization...';
    
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
    );
    
    RAISE NOTICE '✅ Default organization created';
  ELSE
    RAISE NOTICE '✅ Default organization already exists';
  END IF;
END $$;

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

-- Create organization settings if they don't exist
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

-- Verification and summary
DO $$
DECLARE
  org_count INTEGER;
  member_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM public.organizations WHERE id = '00000000-0000-4000-8000-000000000001';
  SELECT COUNT(*) INTO member_count FROM public.organization_members WHERE organization_id = '00000000-0000-4000-8000-000000000001';
  SELECT COUNT(*) INTO user_count FROM auth.users;

  RAISE NOTICE '';
  RAISE NOTICE '=== ORGANIZATION SETUP COMPLETE ===';
  RAISE NOTICE 'Organization ID: 00000000-0000-4000-8000-000000000001';
  RAISE NOTICE 'Organization exists: %', (org_count > 0);
  RAISE NOTICE 'Total users in auth.users: %', user_count;
  RAISE NOTICE 'Users added to organization: %', member_count;
  RAISE NOTICE '';
  
  IF org_count = 0 THEN
    RAISE EXCEPTION 'Failed to create default organization';
  END IF;
  
  IF member_count = 0 AND user_count > 0 THEN
    RAISE WARNING 'No users were added to the organization, but users exist in auth.users';
  END IF;
  
  RAISE NOTICE '✅ Ready for event creation';
END $$;
