-- Portal Enhancement Database Schema
-- Run this in your Supabase SQL editor

-- 1. Add config JSONB column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- 2. Create event_access table for staff assignments
CREATE TABLE IF NOT EXISTS event_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_level TEXT CHECK (access_level IN ('admin', 'scanner', 'read_only')) DEFAULT 'scanner',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(event_id, user_id)
);

-- 3. Create categories table for wristband categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#10B981',
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(name)
);

-- 4. Create gates table for gate management
CREATE TABLE IF NOT EXISTS gates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_description TEXT,
    status TEXT CHECK (status IN ('probation', 'approved', 'rejected', 'active', 'inactive')) DEFAULT 'probation',
    auto_created BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- 5. Create gate_bindings table for category-gate relationships
CREATE TABLE IF NOT EXISTS gate_bindings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gate_id UUID REFERENCES gates(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    binding_type TEXT CHECK (binding_type IN ('allowed', 'preferred', 'restricted')) DEFAULT 'allowed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gate_id, category)
);

-- 6. Create audit_log table for compliance
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_access_event_id ON event_access(event_id);
CREATE INDEX IF NOT EXISTS idx_event_access_user_id ON event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_gates_event_id ON gates(event_id);
CREATE INDEX IF NOT EXISTS idx_gates_status ON gates(status);
CREATE INDEX IF NOT EXISTS idx_gate_bindings_gate_id ON gate_bindings(gate_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_id ON audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- 9. Insert default categories
INSERT INTO categories (name, color, description, is_default) VALUES
    ('General', '#10B981', 'Standard admission', true),
    ('VIP', '#7B61FF', 'VIP access with premium benefits', false),
    ('Staff', '#06B6D4', 'Event staff and crew', false),
    ('Press', '#F59E0B', 'Media and press personnel', false)
ON CONFLICT (name) DO NOTHING;

-- 10. Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
    ('company_name', '"Quickstrap NFC"', 'Company name for branding'),
    ('default_event_config', '{
        "security_mode": "optional",
        "gate_settings": {
            "auto_create": true,
            "enforce_categories": false,
            "scan_mode": "single"
        },
        "capacity_settings": {
            "alerts_enabled": true,
            "alert_threshold": 90,
            "max_capacity": null
        },
        "checkin_window": {
            "enabled": false,
            "start_time": null,
            "end_time": null
        }
    }', 'Default configuration for new events'),
    ('email_settings', '{
        "smtp_enabled": false,
        "from_email": "noreply@quickstrap.com",
        "from_name": "Quickstrap NFC"
    }', 'Email configuration settings')
ON CONFLICT (key) DO NOTHING;

-- 11. Enable Row Level Security
ALTER TABLE event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies (basic - can be refined later)
-- Event access policies
CREATE POLICY "Users can view their own event access" ON event_access
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Event admins can manage event access" ON event_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = event_access.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level = 'admin'
        )
    );

-- Categories policies
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage categories" ON categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Gates policies
CREATE POLICY "Users can view gates for their events" ON gates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = gates.event_id 
            AND ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Event admins can manage gates" ON gates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = gates.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level IN ('admin', 'scanner')
        )
    );

-- Audit log policies
CREATE POLICY "Users can view their own audit logs" ON audit_log
    FOR SELECT USING (user_id = auth.uid());

-- System settings policies
CREATE POLICY "Authenticated users can view system settings" ON system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only service role can modify system settings" ON system_settings
    FOR ALL USING (auth.role() = 'service_role');
