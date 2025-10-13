-- Webhook and Notification System Migration
-- This creates the necessary tables for the n8n webhook integration

-- System settings table for webhook configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on category
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event VARCHAR(100) NOT NULL,
    template TEXT NOT NULL,
    channels TEXT[] DEFAULT ARRAY[]::TEXT[],
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on event for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_templates_event ON notification_templates(event);

-- Notification rules table
CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event VARCHAR(100) NOT NULL,
    conditions JSONB DEFAULT '{}',
    actions TEXT[] DEFAULT ARRAY[]::TEXT[],
    enabled BOOLEAN DEFAULT true,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on event for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_rules_event ON notification_rules(event);

-- Audit log table (if not exists)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on action and timestamp for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- Gates table for gate management workflow
CREATE TABLE IF NOT EXISTS gates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    auto_discovered BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gates_event_id ON gates(event_id);
CREATE INDEX IF NOT EXISTS idx_gates_status ON gates(status);

-- Gate bindings table for linking gates to check-ins
CREATE TABLE IF NOT EXISTS gate_bindings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gate_id UUID REFERENCES gates(id) ON DELETE CASCADE,
    checkin_id UUID REFERENCES checkin_logs(id) ON DELETE CASCADE,
    bound_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_gate_bindings_gate_id ON gate_bindings(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_checkin_id ON gate_bindings(checkin_id);

-- Event access table for staff assignments
CREATE TABLE IF NOT EXISTS event_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'scanner' CHECK (role IN ('admin', 'scanner', 'viewer')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(event_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_event_access_event_id ON event_access(event_id);
CREATE INDEX IF NOT EXISTS idx_event_access_user_id ON event_access(user_id);

-- Recent check-ins cache for performance
CREATE TABLE IF NOT EXISTS recent_checkins_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    wristband_id VARCHAR(255) NOT NULL,
    gate_name VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    staff_member VARCHAR(255),
    status VARCHAR(20) DEFAULT 'success',
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_recent_checkins_event_id ON recent_checkins_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_recent_checkins_timestamp ON recent_checkins_cache(timestamp DESC);

-- Categories table for wristband categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, event_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_event_id ON categories(event_id);

-- Insert default webhook configuration
INSERT INTO system_settings (category, settings) 
VALUES ('webhooks', '{
    "endpoints": {},
    "notifications": {
        "telegram": {"enabled": false},
        "slack": {"enabled": false},
        "discord": {"enabled": false},
        "email": {"enabled": false}
    }
}') 
ON CONFLICT (category) DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (name, event, template, channels) VALUES
('Check-in Alert', 'checkin.created', '🎫 New check-in at {{gate_name}}\n👤 Wristband: {{wristband_id}}\n📍 Event: {{event_name}}\n⏰ {{timestamp}}', ARRAY['telegram', 'slack']),
('Capacity Warning', 'capacity.alert', '⚠️ Capacity Alert: {{event_name}}\n📊 {{current_count}}/{{capacity_limit}} ({{percentage}}%)\n🚨 Status: {{alert_level}}', ARRAY['telegram', 'slack', 'email']),
('Security Alert', 'security.alert', '🚨 Security Alert: {{alert_type}}\n🎫 Wristband: {{wristband_id}}\n📝 {{description}}\n⚡ Severity: {{severity}}', ARRAY['telegram', 'slack', 'email']),
('Staff Status Update', 'staff.status', '👤 Staff Update: {{staff_name}}\n📍 Status: {{status}}\n🎪 Event: {{event_name}}\n📍 Location: {{location}}', ARRAY['telegram']),
('Gate Approval Request', 'gate.approval_request', '🚪 New Gate Request\n📝 Name: {{gate_name}}\n👤 Created by: {{created_by}}\n📍 Location: {{location}}\n🤖 Auto-discovered: {{auto_discovered}}', ARRAY['telegram', 'slack']),
('System Health Alert', 'system.health', '🔧 System Health: {{status}}\n📊 Metrics: {{metrics}}\n⚠️ Alerts: {{alerts}}', ARRAY['telegram', 'email'])
ON CONFLICT DO NOTHING;

-- Insert default notification rules
INSERT INTO notification_rules (name, event, conditions, actions, priority) VALUES
('High-frequency check-ins', 'checkin.created', '{"min_interval": 60}', ARRAY['webhook', 'telegram'], 'medium'),
('Capacity threshold alerts', 'capacity.alert', '{"threshold": 80}', ARRAY['webhook', 'telegram', 'email'], 'high'),
('Critical security alerts', 'security.alert', '{"severity": ["high", "critical"]}', ARRAY['webhook', 'telegram', 'slack', 'email'], 'critical'),
('Staff offline alerts', 'staff.status', '{"status": "offline", "duration": 300}', ARRAY['webhook', 'telegram'], 'medium')
ON CONFLICT DO NOTHING;

-- Add RLS policies for security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_checkins_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies (allow authenticated users to read/write for now)
CREATE POLICY "Allow authenticated users to manage system settings" ON system_settings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage notification templates" ON notification_templates
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage notification rules" ON notification_rules
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read audit log" ON audit_log
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert audit log" ON audit_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage gates" ON gates
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage gate bindings" ON gate_bindings
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage event access" ON event_access
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage recent checkins cache" ON recent_checkins_cache
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to manage categories" ON categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at BEFORE UPDATE ON notification_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
