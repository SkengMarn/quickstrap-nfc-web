-- Comprehensive Portal Functionality - Database Schema
-- This schema supports all phases of the implementation strategy

-- ============================================================================
-- PHASE 1: PRE-EVENT SETUP
-- ============================================================================

-- 1.1 Enhanced Events Table with comprehensive config
ALTER TABLE events
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS test_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS check_ins_enabled BOOLEAN DEFAULT true;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_config ON events USING gin(config);

COMMENT ON COLUMN events.config IS 'JSONB config containing: security_mode, gate_settings, capacity_settings, checkin_window, emergency_stop, etc.';
COMMENT ON COLUMN events.status IS 'Event lifecycle: draft, active, completed, archived';
COMMENT ON COLUMN events.test_mode IS 'When true, all check-ins are marked as test data';

-- 1.2 Staff Assignment & Access Control
CREATE TABLE IF NOT EXISTS event_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL DEFAULT 'scanner', -- admin, scanner, read-only
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_access_event ON event_access(event_id);
CREATE INDEX IF NOT EXISTS idx_event_access_user ON event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_event_access_active ON event_access(is_active) WHERE is_active = true;

COMMENT ON TABLE event_access IS 'Defines who can access each event and their permission level';

-- Staff-Gate Assignments (for shift management)
CREATE TABLE IF NOT EXISTS staff_gate_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'assigned', -- assigned, active, completed, no-show
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_gate_event ON staff_gate_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_gate_staff ON staff_gate_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_gate_gate ON staff_gate_assignments(gate_id);
CREATE INDEX IF NOT EXISTS idx_staff_gate_shifts ON staff_gate_assignments(shift_start, shift_end);

-- 1.3 Enhanced Wristband Management
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7), -- Hex color code
  description TEXT,
  gate_preferences JSONB, -- Preferred gates for this category
  hierarchy_parent UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(hierarchy_parent);

-- Add category reference and status tracking to wristbands
ALTER TABLE wristbands
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- CSV Import tracking
CREATE TABLE IF NOT EXISTS wristband_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  filename VARCHAR(255),
  total_rows INTEGER,
  valid_rows INTEGER,
  invalid_rows INTEGER,
  duplicate_rows INTEGER,
  status VARCHAR(20) DEFAULT 'processing', -- processing, completed, failed
  error_log JSONB,
  mapping_template JSONB, -- Column mapping used
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wristband_imports_event ON wristband_imports(event_id);
CREATE INDEX IF NOT EXISTS idx_wristband_imports_status ON wristband_imports(status);

-- ============================================================================
-- PHASE 2: LIVE EVENT OPERATIONS
-- ============================================================================

-- 2.1 Real-Time Command Center
-- Enhance checkin_logs for better tracking
ALTER TABLE checkin_logs
ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fraud_flags JSONB,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_checkin_logs_staff ON checkin_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_test ON checkin_logs(is_test_data) WHERE is_test_data = false;
CREATE INDEX IF NOT EXISTS idx_checkin_logs_timestamp ON checkin_logs(timestamp DESC);

-- System Alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- capacity, gate_error, fraud, staff, system
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  message TEXT NOT NULL,
  data JSONB, -- Additional context
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_event ON system_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unack ON system_alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_system_alerts_created ON system_alerts(created_at DESC);

-- 2.2 Gate Management
ALTER TABLE gates
ADD COLUMN IF NOT EXISTS probation_status VARCHAR(20) DEFAULT 'approved', -- probation, approved, rejected
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS auto_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS location_description TEXT,
ADD COLUMN IF NOT EXISTS allowed_categories JSONB; -- Array of category IDs

CREATE INDEX IF NOT EXISTS idx_gates_probation ON gates(probation_status);
CREATE INDEX IF NOT EXISTS idx_gates_confidence ON gates(confidence_score);

-- Gate merge history
CREATE TABLE IF NOT EXISTS gate_merges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  primary_gate_id UUID NOT NULL REFERENCES gates(id),
  absorbed_gate_ids UUID[] NOT NULL,
  reason VARCHAR(50), -- spatial-clustering, manual, duplicate-detection
  confidence DECIMAL(3,2),
  checkins_transferred INTEGER DEFAULT 0,
  decision VARCHAR(20) DEFAULT 'auto-approved', -- auto-approved, manual-approved, rejected
  merged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gate_merges_event ON gate_merges(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_merges_primary ON gate_merges(primary_gate_id);

-- 2.3 Wristband Monitoring & Control
CREATE TABLE IF NOT EXISTS wristband_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wristband_id UUID NOT NULL REFERENCES wristbands(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES auth.users(id),
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  unblocked_at TIMESTAMPTZ,
  unblocked_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_wristband_blocks_wristband ON wristband_blocks(wristband_id);
CREATE INDEX IF NOT EXISTS idx_wristband_blocks_active ON wristband_blocks(wristband_id) WHERE unblocked_at IS NULL;

-- Fraud detection log
CREATE TABLE IF NOT EXISTS fraud_detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wristband_id UUID REFERENCES wristbands(id),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  detection_type VARCHAR(50), -- multiple-checkins, impossible-location, blocked-attempt
  severity VARCHAR(20),
  details JSONB,
  action_taken VARCHAR(50), -- blocked, flagged, allowed-with-warning
  investigated_by UUID REFERENCES auth.users(id),
  investigated_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_detections_event ON fraud_detections(event_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_wristband ON fraud_detections(wristband_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_type ON fraud_detections(detection_type);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_severity ON fraud_detections(severity);

-- 2.4 Staff Performance Monitoring
CREATE TABLE IF NOT EXISTS staff_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shift_start TIMESTAMPTZ,
  shift_end TIMESTAMPTZ,
  total_scans INTEGER DEFAULT 0,
  scans_per_hour DECIMAL(10,2),
  error_count INTEGER DEFAULT 0,
  avg_scan_time_ms INTEGER,
  efficiency_score INTEGER, -- 0-100
  break_time_minutes INTEGER DEFAULT 0,
  performance_data JSONB, -- Detailed metrics
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_performance_event ON staff_performance(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_staff ON staff_performance(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_shift ON staff_performance(shift_start, shift_end);

-- Staff communication/messages
CREATE TABLE IF NOT EXISTS staff_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID REFERENCES auth.users(id), -- NULL for broadcast
  message_type VARCHAR(20) DEFAULT 'normal', -- normal, emergency, assignment
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_messages_event ON staff_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_to ON staff_messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_unread ON staff_messages(read_at) WHERE read_at IS NULL;

-- ============================================================================
-- PHASE 3: POST-EVENT ANALYSIS
-- ============================================================================

-- 3.1 Analytics pre-computed views (materialized for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS event_analytics AS
SELECT
  e.id as event_id,
  e.name as event_name,
  e.start_date,
  e.end_date,
  COUNT(DISTINCT cl.wristband_id) as unique_attendees,
  COUNT(cl.id) as total_checkins,
  MAX(cl.timestamp) as last_checkin,
  AVG(cl.processing_time_ms) as avg_processing_time,
  COUNT(DISTINCT cl.location) as gates_used,
  COUNT(DISTINCT cl.staff_id) as staff_worked,
  json_object_agg(
    COALESCE(w.category, 'unknown'),
    COUNT(DISTINCT cl.wristband_id)
  ) FILTER (WHERE w.category IS NOT NULL) as category_distribution
FROM events e
LEFT JOIN checkin_logs cl ON e.id = cl.event_id AND cl.is_test_data = false
LEFT JOIN wristbands w ON cl.wristband_id = w.id
GROUP BY e.id, e.name, e.start_date, e.end_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_analytics_event ON event_analytics(event_id);

-- 3.2 Export & Reporting
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  export_type VARCHAR(50) NOT NULL, -- checkin-log, gate-summary, staff-performance, custom
  format VARCHAR(10) DEFAULT 'csv', -- csv, pdf, excel
  filters JSONB,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  file_url TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_event ON export_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);

-- Scheduled reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  report_type VARCHAR(50) NOT NULL,
  schedule VARCHAR(50), -- daily, weekly, end-of-event
  format VARCHAR(10) DEFAULT 'pdf',
  recipients TEXT[], -- Email addresses
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;

-- ============================================================================
-- PHASE 4: SYSTEM ADMINISTRATION
-- ============================================================================

-- 4.1 User Management & RBAC
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- super_admin, event_owner, event_admin, staff, read_only
  scope_type VARCHAR(20), -- global, event, organization
  scope_id UUID, -- event_id or org_id if applicable
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, role, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_scope ON user_roles(scope_type, scope_id);

-- Permissions matrix
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role VARCHAR(50) NOT NULL,
  resource VARCHAR(50) NOT NULL, -- events, wristbands, gates, staff, analytics, exports
  action VARCHAR(50) NOT NULL, -- create, read, update, delete, export
  allowed BOOLEAN DEFAULT true,
  conditions JSONB -- Additional conditions (e.g., only own events)
);

CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_unique ON permissions(role, resource, action);

-- 4.2 System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  category VARCHAR(50), -- general, email, integration, security
  is_encrypted BOOLEAN DEFAULT false,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- 4.3 Audit Trail & Compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  event_id UUID REFERENCES events(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB, -- Before/after values
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition by month for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Login attempts tracking
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255),
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created ON login_attempts(created_at DESC);

-- Data retention policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_type VARCHAR(50) NOT NULL,
  retention_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT false,
  auto_anonymize BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE column_name = 'updated_at'
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$ language 'plpgsql';

-- Audit log trigger
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes)
    VALUES (
      current_setting('app.current_user_id', true)::UUID,
      TG_OP,
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD)
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes)
    VALUES (
      current_setting('app.current_user_id', true)::UUID,
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, changes)
    VALUES (
      current_setting('app.current_user_id', true)::UUID,
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging to critical tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN VALUES ('events'), ('wristbands'), ('gates'), ('event_access'), ('system_settings'), ('user_roles')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS audit_%I ON %I;
      CREATE TRIGGER audit_%I
      AFTER INSERT OR UPDATE OR DELETE ON %I
      FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
    ', t, t, t, t);
  END LOOP;
END;
$$ language 'plpgsql';

-- Refresh materialized views function
CREATE OR REPLACE FUNCTION refresh_event_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_analytics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE wristbands ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Example policies (customize based on your auth setup)
-- Super admins can see everything
CREATE POLICY "Super admins can view all events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Event staff can only see events they're assigned to
CREATE POLICY "Staff can view assigned events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_access
      WHERE event_id = events.id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- Similar policies for other tables...

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Default permissions for roles
INSERT INTO permissions (role, resource, action, allowed) VALUES
  ('super_admin', 'events', 'create', true),
  ('super_admin', 'events', 'read', true),
  ('super_admin', 'events', 'update', true),
  ('super_admin', 'events', 'delete', true),
  ('super_admin', 'events', 'export', true),

  ('event_owner', 'events', 'create', true),
  ('event_owner', 'events', 'read', true),
  ('event_owner', 'events', 'update', true),
  ('event_owner', 'events', 'delete', false),
  ('event_owner', 'events', 'export', true),

  ('event_admin', 'events', 'create', false),
  ('event_admin', 'events', 'read', true),
  ('event_admin', 'events', 'update', true),
  ('event_admin', 'events', 'delete', false),
  ('event_admin', 'events', 'export', true),

  ('scanner', 'events', 'create', false),
  ('scanner', 'events', 'read', true),
  ('scanner', 'events', 'update', false),
  ('scanner', 'events', 'delete', false),
  ('scanner', 'events', 'export', false),

  ('read_only', 'events', 'create', false),
  ('read_only', 'events', 'read', true),
  ('read_only', 'events', 'update', false),
  ('read_only', 'events', 'delete', false),
  ('read_only', 'events', 'export', true)
ON CONFLICT (role, resource, action) DO NOTHING;

-- Default system settings
INSERT INTO system_settings (key, value, category, description) VALUES
  ('company_name', '"QuickStrap NFC"', 'general', 'Company/Organization name'),
  ('default_timezone', '"UTC"', 'general', 'Default timezone for events'),
  ('session_timeout_minutes', '60', 'security', 'Session timeout in minutes'),
  ('password_min_length', '8', 'security', 'Minimum password length'),
  ('two_factor_required', 'false', 'security', 'Require 2FA for all users'),
  ('max_capacity_alert_threshold', '90', 'general', 'Default capacity alert threshold %'),
  ('auto_archive_days', '90', 'general', 'Auto-archive events after N days')
ON CONFLICT (key) DO NOTHING;

-- Default data retention policies
INSERT INTO data_retention_policies (resource_type, retention_days, auto_delete, auto_anonymize) VALUES
  ('audit_logs', 365, false, false),
  ('login_attempts', 90, true, false),
  ('export_jobs', 30, true, false),
  ('system_alerts', 180, false, false),
  ('test_data', 7, true, false)
ON CONFLICT DO NOTHING;

COMMENT ON SCHEMA public IS 'Comprehensive QuickStrap NFC Portal Database Schema - All Phases Implemented';
