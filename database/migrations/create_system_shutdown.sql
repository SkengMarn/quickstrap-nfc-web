-- ============================================================================
-- SYSTEM SHUTDOWN MANAGEMENT
-- Emergency shutdown system with multi-factor authentication
-- ============================================================================

-- Create shutdown tokens table
CREATE TABLE IF NOT EXISTS public.system_shutdown_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id),
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  revoke_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create shutdown events log
CREATE TABLE IF NOT EXISTS public.system_shutdown_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('shutdown_initiated', 'shutdown_cancelled', 'shutdown_completed', 'token_generated', 'token_used', 'token_revoked')),
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  token_id UUID REFERENCES public.system_shutdown_tokens(id),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'failed')),
  password_verified BOOLEAN DEFAULT false,
  token_verified BOOLEAN DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create system status table
CREATE TABLE IF NOT EXISTS public.system_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status VARCHAR(50) NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'shutting_down', 'shutdown')),
  message TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_restart TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Insert initial system status
INSERT INTO public.system_status (status, message)
VALUES ('operational', 'System is running normally')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shutdown_tokens_expires ON public.system_shutdown_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_shutdown_tokens_used ON public.system_shutdown_tokens(used);
CREATE INDEX IF NOT EXISTS idx_shutdown_events_type ON public.system_shutdown_events(event_type);
CREATE INDEX IF NOT EXISTS idx_shutdown_events_status ON public.system_shutdown_events(status);
CREATE INDEX IF NOT EXISTS idx_shutdown_events_created ON public.system_shutdown_events(created_at);

-- Enable RLS
ALTER TABLE public.system_shutdown_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_shutdown_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shutdown tokens (admin/super admin only)
CREATE POLICY "Admins can view shutdown tokens" ON public.system_shutdown_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can create shutdown tokens" ON public.system_shutdown_tokens
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can update shutdown tokens" ON public.system_shutdown_tokens
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- RLS Policies for shutdown events (admin/super admin only)
CREATE POLICY "Admins can view shutdown events" ON public.system_shutdown_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

CREATE POLICY "Admins can create shutdown events" ON public.system_shutdown_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- RLS Policies for system status (everyone can read, only admins can write)
CREATE POLICY "Everyone can view system status" ON public.system_status
  FOR SELECT USING (true);

CREATE POLICY "Admins can update system status" ON public.system_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Generate shutdown token
CREATE OR REPLACE FUNCTION generate_shutdown_token(
  p_valid_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(token VARCHAR, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token VARCHAR(64);
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = v_user_id
    AND role IN ('owner', 'admin')
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions. Admin access required.';
  END IF;

  -- Generate random token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + (p_valid_minutes || ' minutes')::INTERVAL;

  -- Insert token
  INSERT INTO public.system_shutdown_tokens (
    token,
    generated_by,
    expires_at
  ) VALUES (
    v_token,
    v_user_id,
    v_expires_at
  );

  -- Log event
  INSERT INTO public.system_shutdown_events (
    event_type,
    initiated_by,
    reason,
    status
  ) VALUES (
    'token_generated',
    v_user_id,
    'Shutdown token generated',
    'completed'
  );

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

-- Verify shutdown credentials
CREATE OR REPLACE FUNCTION verify_shutdown_credentials(
  p_token VARCHAR,
  p_password TEXT
)
RETURNS TABLE(verified BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_token_record RECORD;
  v_password_valid BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated';
    RETURN;
  END IF;

  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = v_user_id
    AND role IN ('owner', 'admin')
    AND status = 'active'
  ) THEN
    RETURN QUERY SELECT false, 'Insufficient permissions';
    RETURN;
  END IF;

  -- Verify password
  SELECT (auth.users.encrypted_password = crypt(p_password, auth.users.encrypted_password))
  INTO v_password_valid
  FROM auth.users
  WHERE id = v_user_id;

  IF NOT v_password_valid THEN
    RETURN QUERY SELECT false, 'Invalid password';
    RETURN;
  END IF;

  -- Verify token
  SELECT * INTO v_token_record
  FROM public.system_shutdown_tokens
  WHERE token = p_token
  AND used = false
  AND revoked = false
  AND expires_at > NOW();

  IF v_token_record IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired token';
    RETURN;
  END IF;

  -- Mark token as used
  UPDATE public.system_shutdown_tokens
  SET used = true, used_at = NOW(), used_by = v_user_id
  WHERE id = v_token_record.id;

  -- Log event
  INSERT INTO public.system_shutdown_events (
    event_type,
    initiated_by,
    token_id,
    password_verified,
    token_verified,
    status
  ) VALUES (
    'token_used',
    v_user_id,
    v_token_record.id,
    true,
    true,
    'completed'
  );

  RETURN QUERY SELECT true, 'Credentials verified';
END;
$$;

-- Execute system shutdown
CREATE OR REPLACE FUNCTION execute_system_shutdown(
  p_token VARCHAR,
  p_reason TEXT DEFAULT 'Manual shutdown'
)
RETURNS TABLE(success BOOLEAN, message TEXT, shutdown_event_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_token_record RECORD;
  v_event_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not authenticated', NULL::UUID;
    RETURN;
  END IF;

  -- Verify token was used and not expired
  SELECT * INTO v_token_record
  FROM public.system_shutdown_tokens
  WHERE token = p_token
  AND used = true
  AND used_by = v_user_id
  AND used_at > NOW() - INTERVAL '5 minutes' -- Token must be used within 5 minutes
  AND revoked = false;

  IF v_token_record IS NULL THEN
    RETURN QUERY SELECT false, 'Token verification failed', NULL::UUID;
    RETURN;
  END IF;

  -- Create shutdown event
  INSERT INTO public.system_shutdown_events (
    event_type,
    initiated_by,
    token_id,
    reason,
    status,
    password_verified,
    token_verified
  ) VALUES (
    'shutdown_initiated',
    v_user_id,
    v_token_record.id,
    p_reason,
    'in_progress',
    true,
    true
  )
  RETURNING id INTO v_event_id;

  -- Update system status
  UPDATE public.system_status
  SET
    status = 'shutting_down',
    message = p_reason,
    updated_by = v_user_id,
    updated_at = NOW()
  WHERE id = (SELECT id FROM public.system_status LIMIT 1);

  RETURN QUERY SELECT true, 'Shutdown initiated', v_event_id;
END;
$$;

-- Get system status
CREATE OR REPLACE FUNCTION get_system_status()
RETURNS TABLE(
  status VARCHAR,
  message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.status::VARCHAR,
    s.message,
    s.updated_at
  FROM public.system_status s
  ORDER BY s.updated_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_shutdown_token(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_shutdown_credentials(VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_system_shutdown(VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_status() TO authenticated;

-- Create comments
COMMENT ON TABLE public.system_shutdown_tokens IS 'One-time tokens for system shutdown authentication';
COMMENT ON TABLE public.system_shutdown_events IS 'Audit log of all shutdown-related events';
COMMENT ON TABLE public.system_status IS 'Current system operational status';
COMMENT ON FUNCTION generate_shutdown_token IS 'Generate a one-time shutdown token (admin only)';
COMMENT ON FUNCTION verify_shutdown_credentials IS 'Verify password and shutdown token';
COMMENT ON FUNCTION execute_system_shutdown IS 'Execute system shutdown with verified credentials';

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'system_shutdown_tokens') THEN
    RAISE EXCEPTION 'System shutdown tables not created properly';
  END IF;

  RAISE NOTICE '✅ System shutdown management created successfully';
END $$;
