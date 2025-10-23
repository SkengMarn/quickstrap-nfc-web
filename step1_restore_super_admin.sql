-- =====================================================
-- STEP 1: RESTORE SUPER ADMIN ACCESS
-- =====================================================
-- This must be run FIRST to ensure you have admin access

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CREATE PROFILES TABLE (Essential for user management)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  organization_id uuid,
  access_level text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. ENABLE ROW LEVEL SECURITY ON PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. CREATE BASIC RLS POLICIES FOR PROFILES
CREATE POLICY "Users can view all profiles" ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own profile" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- 4. GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- 5. CREATE SUPER ADMIN USER DIRECTLY
-- Email: jayssemujju@gmail.com
-- This creates your user account and sets you as super admin

-- First, let's create a user in auth.users (if possible via SQL)
-- Note: Supabase typically handles auth.users through their API, but let's try direct approach

-- Create your organization first
INSERT INTO public.system_settings (key, value, description, is_public) VALUES
('default_org_id', 'gen_random_uuid()', 'Default organization ID', false)
ON CONFLICT (key) DO NOTHING;

-- STEP 1: Go to Supabase Dashboard → Authentication → Users
-- STEP 2: Click "Add User" (not invite)
-- STEP 3: Enter:
--         Email: jayssemujju@gmail.com
--         Password: 123456789
--         Email Confirm: true (check the box)
-- STEP 4: Click "Create User"

-- STEP 5: After creating the user, run this to make yourself super admin:
-- (Replace the UUID below with your actual user ID from the dashboard)

/*
-- Get your user ID first:
SELECT id, email FROM auth.users WHERE email = 'jayssemujju@gmail.com';

-- Then insert your profile (replace YOUR_USER_ID with the actual UUID):
INSERT INTO public.profiles (id, email, full_name, access_level, organization_id)
VALUES (
  'YOUR_USER_ID',  -- Replace with your actual UUID from auth.users
  'jayssemujju@gmail.com',
  'Jaysse Mujju',
  'super_admin',
  gen_random_uuid()
) ON CONFLICT (id) 
DO UPDATE SET 
  access_level = 'super_admin',
  updated_at = now();
*/

-- 6. VERIFY YOUR ADMIN STATUS
-- Run this to check if you're properly set as super admin:
-- SELECT id, email, access_level FROM public.profiles WHERE id = auth.uid();

-- 7. CREATE SYSTEM_SETTINGS TABLE FOR GLOBAL CONFIG
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb,
  description text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow super admins to manage system settings
CREATE POLICY "Super admins can manage system settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND access_level = 'super_admin'
    )
  );

-- Allow everyone to read public settings
CREATE POLICY "Anyone can read public system settings" ON public.system_settings
  FOR SELECT USING (is_public = true);

GRANT ALL ON public.system_settings TO authenticated;

-- 8. INSERT INITIAL SYSTEM CONFIGURATION
INSERT INTO public.system_settings (key, value, description, is_public) VALUES
('app_name', '"QuickStrap NFC Portal"', 'Application name', true),
('version', '"1.0.0"', 'Application version', true),
('maintenance_mode', 'false', 'System maintenance mode', false),
('max_events_per_org', '100', 'Maximum events per organization', false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES (Run these after the above)
-- =====================================================

-- Check if you exist as super admin:
-- SELECT 
--   id, 
--   email, 
--   full_name, 
--   access_level, 
--   organization_id,
--   created_at
-- FROM public.profiles 
-- WHERE id = auth.uid();

-- Check system settings:
-- SELECT key, value, description FROM public.system_settings ORDER BY key;
