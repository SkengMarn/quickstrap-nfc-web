-- Missing Tables and Columns for Portal
-- Run this in your Supabase SQL editor

-- Add config column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sign_in TIMESTAMP WITH TIME ZONE
);

-- Create event_access table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL CHECK (access_level IN ('owner', 'admin', 'scanner')),
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

-- Create gates table
CREATE TABLE IF NOT EXISTS gates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'inactive')),
    auto_discovered BOOLEAN DEFAULT false,
    discovered_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_event_id ON audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

CREATE INDEX IF NOT EXISTS idx_event_access_user_id ON event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_event_access_event_id ON event_access(event_id);

CREATE INDEX IF NOT EXISTS idx_gates_event_id ON gates(event_id);
CREATE INDEX IF NOT EXISTS idx_gates_status ON gates(status);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_log
CREATE POLICY "Users can view audit logs for their events" ON audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = audit_log.event_id 
            AND ea.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_log
    FOR INSERT WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for event_access
CREATE POLICY "Users can view event access for their events" ON event_access
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = event_access.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level IN ('owner', 'admin')
        )
    );

CREATE POLICY "Event owners/admins can manage access" ON event_access
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = event_access.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level IN ('owner', 'admin')
        )
    );

-- RLS Policies for gates
CREATE POLICY "Event staff can view gates" ON gates
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
            AND ea.access_level IN ('owner', 'admin')
        )
    );

-- RLS Policies for system_settings
CREATE POLICY "Authenticated users can view system settings" ON system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only service role can modify system settings" ON system_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gates_updated_at ON gates;
CREATE TRIGGER update_gates_updated_at
    BEFORE UPDATE ON gates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
    ('onboarding_enabled', 'true', 'Enable onboarding wizard for new users'),
    ('maintenance_mode', 'false', 'Enable maintenance mode'),
    ('max_events_per_user', '10', 'Maximum events per user'),
    ('default_event_capacity', '1000', 'Default event capacity')
ON CONFLICT (key) DO NOTHING;
