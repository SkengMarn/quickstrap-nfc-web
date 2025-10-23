-- ============================================================================
-- APP SESSION TRACKING ENHANCEMENT
-- ============================================================================
-- This migration extends active_sessions to track both web portal and mobile app logins
-- Created: 2025-10-20

-- Add new columns to active_sessions for app tracking
ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS login_source text DEFAULT 'web' CHECK (login_source IN ('web', 'app')),
  ADD COLUMN IF NOT EXISTS platform text CHECK (platform IN ('web', 'ios', 'android')),
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS device_name text,
  ADD COLUMN IF NOT EXISTS login_method text CHECK (login_method IN ('password', 'biometric', 'token', 'sso')),
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

-- Add index for filtering by login source and platform
CREATE INDEX IF NOT EXISTS idx_active_sessions_login_source ON public.active_sessions(login_source);
CREATE INDEX IF NOT EXISTS idx_active_sessions_platform ON public.active_sessions(platform);
CREATE INDEX IF NOT EXISTS idx_active_sessions_event ON public.active_sessions(event_id);

-- Add comment explaining the new columns
COMMENT ON COLUMN public.active_sessions.login_source IS 'Source of login: web (portal) or app (mobile NFC app)';
COMMENT ON COLUMN public.active_sessions.platform IS 'Platform: web, ios, or android';
COMMENT ON COLUMN public.active_sessions.app_version IS 'Mobile app version (e.g., 1.0.0)';
COMMENT ON COLUMN public.active_sessions.device_id IS 'Unique device identifier';
COMMENT ON COLUMN public.active_sessions.device_name IS 'Device name (e.g., "iPhone 15 Pro")';
COMMENT ON COLUMN public.active_sessions.login_method IS 'Authentication method used';
COMMENT ON COLUMN public.active_sessions.event_id IS 'Current event selected in the app (for mobile sessions)';

-- ============================================================================
-- FUNCTION: Track App Login
-- ============================================================================
-- Creates or updates a session when a user logs in via the mobile app

CREATE OR REPLACE FUNCTION public.track_app_login(
  p_user_id uuid,
  p_organization_id uuid,
  p_platform text,
  p_app_version text DEFAULT NULL,
  p_device_id text DEFAULT NULL,
  p_device_name text DEFAULT NULL,
  p_device_type text DEFAULT 'mobile',
  p_login_method text DEFAULT 'password',
  p_event_id uuid DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Check for existing active session for this user and device
  SELECT id INTO v_session_id
  FROM public.active_sessions
  WHERE user_id = p_user_id
    AND login_source = 'app'
    AND (device_id = p_device_id OR device_id IS NULL)
    AND last_activity_at > (now() - interval '24 hours')
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    -- Update existing session
    UPDATE public.active_sessions
    SET
      organization_id = p_organization_id,
      platform = p_platform,
      app_version = p_app_version,
      device_name = p_device_name,
      device_type = p_device_type,
      login_method = p_login_method,
      event_id = p_event_id,
      user_agent = COALESCE(p_user_agent, user_agent),
      ip_address = COALESCE(p_ip_address, ip_address),
      last_activity_at = now(),
      updated_at = now()
    WHERE id = v_session_id;
  ELSE
    -- Create new session
    INSERT INTO public.active_sessions (
      user_id,
      organization_id,
      login_source,
      platform,
      app_version,
      device_id,
      device_name,
      device_type,
      login_method,
      event_id,
      user_agent,
      ip_address,
      session_started_at,
      last_activity_at
    ) VALUES (
      p_user_id,
      p_organization_id,
      'app',
      p_platform,
      p_app_version,
      p_device_id,
      p_device_name,
      p_device_type,
      p_login_method,
      p_event_id,
      p_user_agent,
      p_ip_address,
      now(),
      now()
    )
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$;

-- ============================================================================
-- FUNCTION: Update App Activity
-- ============================================================================
-- Updates last_activity_at and current event for app sessions

CREATE OR REPLACE FUNCTION public.update_app_activity(
  p_user_id uuid,
  p_event_id uuid DEFAULT NULL,
  p_device_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.active_sessions
  SET
    last_activity_at = now(),
    event_id = COALESCE(p_event_id, event_id),
    updated_at = now()
  WHERE user_id = p_user_id
    AND login_source = 'app'
    AND (device_id = p_device_id OR device_id IS NULL)
    AND last_activity_at > (now() - interval '24 hours');
END;
$$;

-- ============================================================================
-- FUNCTION: End App Session
-- ============================================================================
-- Marks an app session as ended (deletes the session record)

CREATE OR REPLACE FUNCTION public.end_app_session(
  p_user_id uuid,
  p_device_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.active_sessions
  WHERE user_id = p_user_id
    AND login_source = 'app'
    AND (device_id = p_device_id OR device_id IS NULL);
END;
$$;

-- ============================================================================
-- VIEW: All Active Users (Portal + App)
-- ============================================================================
-- Combines web and app sessions with user details

CREATE OR REPLACE VIEW public.all_active_users AS
SELECT
  s.id as session_id,
  s.user_id,
  p.email,
  p.full_name,
  s.organization_id,
  o.name as organization_name,
  s.login_source,
  s.platform,
  s.device_type,
  s.device_name,
  s.app_version,
  s.login_method,
  s.current_route,
  s.event_id,
  e.name as event_name,
  s.session_started_at,
  s.last_activity_at,
  EXTRACT(EPOCH FROM (now() - s.last_activity_at)) as seconds_idle,
  s.ip_address,
  s.user_agent
FROM public.active_sessions s
LEFT JOIN public.profiles p ON s.user_id = p.id
LEFT JOIN public.organizations o ON s.organization_id = o.id
LEFT JOIN public.events e ON s.event_id = e.id
WHERE s.last_activity_at > (now() - interval '15 minutes')
ORDER BY s.last_activity_at DESC;

-- Grant permissions
GRANT SELECT ON public.all_active_users TO authenticated;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Allow users to insert their own app sessions
CREATE POLICY "Users can create their own app sessions"
  ON public.active_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own app sessions
CREATE POLICY "Users can update their own app sessions"
  ON public.active_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own app sessions
CREATE POLICY "Users can delete their own app sessions"
  ON public.active_sessions
  FOR DELETE
  USING (auth.uid() = user_id);
