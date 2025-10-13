-- ============================================================================
-- PHASE 1: FOUNDATION - Critical Architecture Improvements
-- ============================================================================
-- This migration implements:
-- 1. Event Lifecycle State Machine
-- 2. Multi-Tenant Organization Architecture
-- 3. Real-Time Presence & Collaboration
-- 4. API Gateway & Developer Platform
-- ============================================================================

-- ============================================================================
-- 1. EVENT LIFECYCLE STATE MACHINE
-- ============================================================================

-- Create lifecycle status enum
CREATE TYPE lifecycle_status AS ENUM (
  'draft',      -- Being created, not visible to staff
  'published',  -- Visible, can be edited
  'pre_event',  -- 24h before start, final checks
  'live',       -- Event is happening now
  'closing',    -- Event ended, wrapping up
  'closed',     -- Event complete, no more changes
  'archived'    -- Historical, read-only
);

-- Add lifecycle_status to events table
ALTER TABLE public.events
  ADD COLUMN lifecycle_status lifecycle_status DEFAULT 'draft' NOT NULL,
  ADD COLUMN status_changed_at timestamptz DEFAULT now(),
  ADD COLUMN status_changed_by uuid REFERENCES auth.users(id),
  ADD COLUMN auto_transition_enabled boolean DEFAULT true;

-- Create index for lifecycle queries
CREATE INDEX idx_events_lifecycle_status ON public.events(lifecycle_status);
CREATE INDEX idx_events_status_changed_at ON public.events(status_changed_at);

-- Event state transition log
CREATE TABLE public.event_state_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_status lifecycle_status,
  to_status lifecycle_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  reason text,
  automated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_state_transitions_event ON public.event_state_transitions(event_id);
CREATE INDEX idx_state_transitions_created ON public.event_state_transitions(created_at);

-- Function to validate state transitions
CREATE OR REPLACE FUNCTION validate_lifecycle_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transition boolean := false;
BEGIN
  -- Define valid transitions
  valid_transition := (
    (OLD.lifecycle_status = 'draft' AND NEW.lifecycle_status IN ('published', 'archived')) OR
    (OLD.lifecycle_status = 'published' AND NEW.lifecycle_status IN ('pre_event', 'archived')) OR
    (OLD.lifecycle_status = 'pre_event' AND NEW.lifecycle_status IN ('live', 'published')) OR
    (OLD.lifecycle_status = 'live' AND NEW.lifecycle_status = 'closing') OR
    (OLD.lifecycle_status = 'closing' AND NEW.lifecycle_status = 'closed') OR
    (OLD.lifecycle_status = 'closed' AND NEW.lifecycle_status = 'archived')
  );

  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Invalid lifecycle transition from % to %', OLD.lifecycle_status, NEW.lifecycle_status;
  END IF;

  -- Log the transition
  INSERT INTO public.event_state_transitions (event_id, from_status, to_status, changed_by, automated)
  VALUES (NEW.id, OLD.lifecycle_status, NEW.lifecycle_status, NEW.status_changed_by, false);

  NEW.status_changed_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for lifecycle validation
CREATE TRIGGER enforce_lifecycle_transitions
  BEFORE UPDATE OF lifecycle_status ON public.events
  FOR EACH ROW
  WHEN (OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status)
  EXECUTE FUNCTION validate_lifecycle_transition();

-- ============================================================================
-- 2. MULTI-TENANT ORGANIZATION ARCHITECTURE
-- ============================================================================

-- Organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  logo_url text,
  website text,

  -- Branding
  primary_color text DEFAULT '#0EA5E9',
  secondary_color text DEFAULT '#8B5CF6',
  custom_domain text,

  -- Billing & Limits
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  max_events integer DEFAULT 5,
  max_wristbands integer DEFAULT 1000,
  max_team_members integer DEFAULT 5,

  -- Metadata
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_created_by ON public.organizations(created_by);

-- Organization members (user roles within org)
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'manager', 'member', 'viewer');

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role DEFAULT 'member' NOT NULL,

  -- Permissions
  permissions jsonb DEFAULT '{"events": "read", "wristbands": "read", "reports": "read"}',

  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited')),
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_role ON public.organization_members(role);

-- Organization settings
CREATE TABLE public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,

  -- Feature flags
  features jsonb DEFAULT '{
    "fraud_detection": true,
    "ai_insights": false,
    "api_access": false,
    "white_label": false,
    "custom_workflows": false
  }',

  -- Notification preferences
  notifications jsonb DEFAULT '{
    "email_enabled": true,
    "sms_enabled": false,
    "push_enabled": true
  }',

  -- Security
  require_2fa boolean DEFAULT false,
  allowed_ip_ranges text[],
  session_timeout_minutes integer DEFAULT 480,

  -- Data retention
  data_retention_days integer DEFAULT 365,
  auto_archive_enabled boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add organization_id to events table
ALTER TABLE public.events
  ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_events_organization ON public.events(organization_id);

-- ============================================================================
-- 3. REAL-TIME PRESENCE & COLLABORATION
-- ============================================================================

-- Active sessions (who's online, where)
CREATE TABLE public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Location in portal
  current_route text,
  current_resource_type text, -- 'event', 'gate', 'wristband', etc.
  current_resource_id uuid,

  -- Session info
  ip_address text,
  user_agent text,
  device_type text,

  -- Activity
  last_activity_at timestamptz DEFAULT now(),
  session_started_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_active_sessions_user ON public.active_sessions(user_id);
CREATE INDEX idx_active_sessions_resource ON public.active_sessions(current_resource_type, current_resource_id);
CREATE INDEX idx_active_sessions_last_activity ON public.active_sessions(last_activity_at);

-- Resource locks (prevent simultaneous editing)
CREATE TABLE public.resource_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL, -- 'event', 'gate', 'wristband', etc.
  resource_id uuid NOT NULL,

  -- Lock owner
  locked_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_by_session_id uuid REFERENCES active_sessions(id) ON DELETE CASCADE,

  -- Lock info
  lock_reason text DEFAULT 'editing',
  acquired_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '15 minutes'),

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),

  UNIQUE(resource_type, resource_id)
);

CREATE INDEX idx_resource_locks_resource ON public.resource_locks(resource_type, resource_id);
CREATE INDEX idx_resource_locks_user ON public.resource_locks(locked_by_user_id);
CREATE INDEX idx_resource_locks_expires ON public.resource_locks(expires_at);

-- Function to auto-release expired locks
CREATE OR REPLACE FUNCTION release_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM public.resource_locks
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Collaboration comments/activity feed
CREATE TABLE public.collaboration_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Activity details
  activity_type text NOT NULL, -- 'comment', 'mention', 'edit', 'status_change'
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,

  -- User who performed action
  user_id uuid NOT NULL REFERENCES auth.users(id),

  -- Content
  content text,
  mentions uuid[], -- Array of mentioned user IDs
  metadata jsonb DEFAULT '{}',

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_collab_activity_resource ON public.collaboration_activity(resource_type, resource_id);
CREATE INDEX idx_collab_activity_org ON public.collaboration_activity(organization_id);
CREATE INDEX idx_collab_activity_user ON public.collaboration_activity(user_id);
CREATE INDEX idx_collab_activity_created ON public.collaboration_activity(created_at);

-- ============================================================================
-- 4. API GATEWAY & DEVELOPER PLATFORM
-- ============================================================================

-- API Keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Key info
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE, -- bcrypt hash of actual key
  key_prefix text NOT NULL, -- First 8 chars for identification (e.g., 'sk_live_abcd1234')

  -- Permissions
  scopes text[] DEFAULT ARRAY['read:events', 'read:wristbands', 'read:checkins'],
  allowed_origins text[], -- CORS origins

  -- Status
  status text DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),

  -- Usage limits
  rate_limit_per_hour integer DEFAULT 1000,
  rate_limit_per_day integer DEFAULT 10000,

  -- Metadata
  last_used_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_api_keys_org ON public.api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix);

-- API Rate Limits (per key tracking)
CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,

  -- Time window
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,

  -- Usage
  requests_count integer DEFAULT 0,
  requests_allowed integer,

  -- First/last request in window
  first_request_at timestamptz,
  last_request_at timestamptz,

  created_at timestamptz DEFAULT now(),

  UNIQUE(api_key_id, window_start)
);

CREATE INDEX idx_rate_limits_key ON public.api_rate_limits(api_key_id);
CREATE INDEX idx_rate_limits_window ON public.api_rate_limits(window_start, window_end);

-- API Audit Log
CREATE TABLE public.api_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,

  -- Request info
  method text NOT NULL,
  endpoint text NOT NULL,
  query_params jsonb,
  request_body jsonb,

  -- Response info
  status_code integer,
  response_time_ms integer,
  error_message text,

  -- Client info
  ip_address text,
  user_agent text,

  -- Timestamps
  requested_at timestamptz DEFAULT now()
);

CREATE INDEX idx_api_audit_key ON public.api_audit_log(api_key_id);
CREATE INDEX idx_api_audit_org ON public.api_audit_log(organization_id);
CREATE INDEX idx_api_audit_requested ON public.api_audit_log(requested_at);
CREATE INDEX idx_api_audit_endpoint ON public.api_audit_log(endpoint);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_state_transitions ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can see orgs they're members of
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update their own organizations if admin/owner"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- Organization Members: Members can view other members in same org
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Active Sessions: Users can view sessions in their orgs
CREATE POLICY "Users can view sessions in their orgs"
  ON public.active_sessions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Resource Locks: Users can view locks in their orgs
CREATE POLICY "Users can view locks in their orgs"
  ON public.resource_locks FOR SELECT
  USING (
    resource_type = 'event' AND resource_id IN (
      SELECT id FROM public.events
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- API Keys: Users can manage API keys for their orgs
CREATE POLICY "Users can view org API keys"
  ON public.api_keys FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
  );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically create first organization for new users
CREATE OR REPLACE FUNCTION create_default_organization_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id uuid;
  user_email text;
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  -- Create organization
  INSERT INTO public.organizations (name, slug, created_by)
  VALUES (
    COALESCE(NEW.full_name, split_part(user_email, '@', 1)) || '''s Organization',
    'org-' || substring(gen_random_uuid()::text, 1, 8),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (new_org_id, NEW.id, 'owner', 'active');

  -- Create default settings
  INSERT INTO public.organization_settings (organization_id)
  VALUES (new_org_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create org on profile creation
CREATE TRIGGER on_profile_created_create_org
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_organization_for_user();

-- Function to update organization updated_at
CREATE OR REPLACE FUNCTION update_organization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_timestamp
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_timestamp();

-- ============================================================================
-- MIGRATION HELPERS
-- ============================================================================

-- Migrate existing events to first organization
DO $$
DECLARE
  first_org_id uuid;
BEGIN
  -- Get or create a default organization
  SELECT id INTO first_org_id FROM public.organizations LIMIT 1;

  IF first_org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug, created_by)
    VALUES ('Default Organization', 'default-org', (SELECT id FROM auth.users LIMIT 1))
    RETURNING id INTO first_org_id;
  END IF;

  -- Assign all existing events to this org
  UPDATE public.events
  SET organization_id = first_org_id
  WHERE organization_id IS NULL;
END $$;

-- Make organization_id required after migration
ALTER TABLE public.events
  ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, UPDATE ON public.organization_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_locks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.collaboration_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;
GRANT SELECT ON public.api_rate_limits TO authenticated;
GRANT SELECT ON public.api_audit_log TO authenticated;
GRANT SELECT ON public.event_state_transitions TO authenticated;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_org_members_org_role ON public.organization_members(organization_id, role);
CREATE INDEX idx_org_members_user_status ON public.organization_members(user_id, status);
CREATE INDEX idx_active_sessions_user_org ON public.active_sessions(user_id, organization_id);
CREATE INDEX idx_collab_activity_resource_created ON public.collaboration_activity(resource_type, resource_id, created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.organizations IS 'Multi-tenant organization management';
COMMENT ON TABLE public.organization_members IS 'User membership and roles within organizations';
COMMENT ON TABLE public.active_sessions IS 'Real-time presence tracking';
COMMENT ON TABLE public.resource_locks IS 'Prevent simultaneous editing conflicts';
COMMENT ON TABLE public.collaboration_activity IS 'Activity feed and comments';
COMMENT ON TABLE public.api_keys IS 'API authentication keys';
COMMENT ON TABLE public.event_state_transitions IS 'Event lifecycle audit trail';

COMMENT ON COLUMN public.events.lifecycle_status IS 'Current state in event lifecycle';
COMMENT ON COLUMN public.events.auto_transition_enabled IS 'Allow automatic status changes at start/end times';
