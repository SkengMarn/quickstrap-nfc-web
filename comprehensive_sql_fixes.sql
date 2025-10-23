-- COMPREHENSIVE SQL FIXES FOR QUICKSTRAP DATABASE
-- Run these fixes directly in Supabase SQL Editor
-- These fixes address all the SQL migration issues identified

-- =============================================================================
-- 1. CREATE MISSING GATE_MERGE_SUGGESTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.gate_merge_suggestions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    primary_gate_id text NOT NULL,
    suggested_gate_id text NOT NULL,
    confidence_score decimal NOT NULL DEFAULT 0.0,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    UNIQUE(event_id, primary_gate_id, suggested_gate_id)
);

-- =============================================================================
-- 2. CREATE MISSING SYSTEM_HEALTH_LOGS TABLE (if not exists)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.system_health_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_type text NOT NULL,
    metric_value numeric,
    status text DEFAULT 'normal',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- 3. CREATE MISSING PERFORMANCE TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.query_performance_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    query_type text NOT NULL,
    execution_time_ms numeric NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.performance_schedule (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_name text NOT NULL UNIQUE,
    schedule_expression text NOT NULL,
    is_enabled boolean DEFAULT true,
    last_run timestamptz,
    next_run timestamptz,
    created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- 4. CREATE MISSING ADAPTIVE_THRESHOLDS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.adaptive_thresholds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    min_checkins_for_gate integer DEFAULT 3,
    max_location_variance numeric DEFAULT 50.0,
    duplicate_distance_meters numeric DEFAULT 25.0,
    confidence_threshold numeric DEFAULT 0.7,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(event_id)
);

-- =============================================================================
-- 5. CREATE MISSING SYSTEM_STATUS TABLE (SINGLETON)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.system_status (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    status text DEFAULT 'operational',
    last_updated timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'
);

-- Ensure only one row exists (singleton pattern)
CREATE OR REPLACE FUNCTION ensure_single_system_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.system_status) >= 1 THEN
        RAISE EXCEPTION 'Only one system_status record is allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_status_singleton_trigger ON public.system_status;
CREATE TRIGGER system_status_singleton_trigger
    BEFORE INSERT ON public.system_status
    FOR EACH ROW EXECUTE FUNCTION ensure_single_system_status();

-- Insert initial record if none exists
INSERT INTO public.system_status (status, metadata)
SELECT 'operational', '{}'
WHERE NOT EXISTS (SELECT 1 FROM public.system_status);

-- =============================================================================
-- 6. CREATE MISSING ORGANIZATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert default organization if none exists
INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-4000-8000-000000000001', 'Default Organization')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = now();

-- =============================================================================
-- 7. CREATE HELPER FUNCTION FOR THRESHOLD DEFAULTS
-- =============================================================================
CREATE OR REPLACE FUNCTION get_threshold_with_default(
    p_event_id uuid,
    p_threshold_name text,
    p_default_value numeric
) RETURNS numeric AS $$
DECLARE
    threshold_value numeric;
BEGIN
    CASE p_threshold_name
        WHEN 'min_checkins_for_gate' THEN
            SELECT min_checkins_for_gate INTO threshold_value
            FROM adaptive_thresholds WHERE event_id = p_event_id;
        WHEN 'max_location_variance' THEN
            SELECT max_location_variance INTO threshold_value
            FROM adaptive_thresholds WHERE event_id = p_event_id;
        WHEN 'duplicate_distance_meters' THEN
            SELECT duplicate_distance_meters INTO threshold_value
            FROM adaptive_thresholds WHERE event_id = p_event_id;
        WHEN 'confidence_threshold' THEN
            SELECT confidence_threshold INTO threshold_value
            FROM adaptive_thresholds WHERE event_id = p_event_id;
        ELSE
            threshold_value := NULL;
    END CASE;
    
    RETURN COALESCE(threshold_value, p_default_value);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. CREATE HAVERSINE DISTANCE FUNCTION (if not exists)
-- =============================================================================
CREATE OR REPLACE FUNCTION haversine_distance(
    lat1 numeric, lon1 numeric, 
    lat2 numeric, lon2 numeric
) RETURNS numeric AS $$
DECLARE
    R numeric := 6371000; -- Earth's radius in meters
    dlat numeric;
    dlon numeric;
    a numeric;
    c numeric;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    a := sin(dlat/2) * sin(dlat/2) + 
         cos(radians(lat1)) * cos(radians(lat2)) * 
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 9. CREATE REFRESH FUNCTIONS
-- =============================================================================
CREATE OR REPLACE FUNCTION refresh_event_metrics_cache()
RETURNS void AS $$
BEGIN
    -- Refresh materialized views if they exist
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'event_analytics') THEN
        REFRESH MATERIALIZED VIEW CONCURRENTLY event_analytics;
    END IF;
    
    -- Log the refresh
    INSERT INTO system_health_logs (metric_type, status, metadata)
    VALUES ('cache_refresh', 'completed', '{"type": "event_metrics"}');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_all_performance_caches()
RETURNS void AS $$
BEGIN
    -- Refresh all materialized views
    PERFORM refresh_event_metrics_cache();
    
    -- Log the refresh
    INSERT INTO system_health_logs (metric_type, status, metadata)
    VALUES ('performance_cache_refresh', 'completed', '{"timestamp": "' || now() || '"}');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 10. ADD MISSING RLS POLICIES FOR GATES TABLE
-- =============================================================================
-- Enable RLS on gates table
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;

-- Policy for viewing gates
DROP POLICY IF EXISTS "Users can view gates for their events" ON public.gates;
CREATE POLICY "Users can view gates for their events" ON public.gates
    FOR SELECT USING (
        event_id IN (
            SELECT e.id FROM events e 
            LEFT JOIN event_access ea ON e.id = ea.event_id 
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

-- Policy for managing gates
DROP POLICY IF EXISTS "Users can manage gates for their events" ON public.gates;
CREATE POLICY "Users can manage gates for their events" ON public.gates
    FOR ALL USING (
        event_id IN (
            SELECT e.id FROM events e 
            LEFT JOIN event_access ea ON e.id = ea.event_id 
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

-- =============================================================================
-- 11. ADD MISSING RLS POLICY FOR QUERY_PERFORMANCE_LOG
-- =============================================================================
ALTER TABLE public.query_performance_log ENABLE ROW LEVEL SECURITY;

-- Policy for inserting performance logs
DROP POLICY IF EXISTS "Users can insert performance logs for their events" ON public.query_performance_log;
CREATE POLICY "Users can insert performance logs for their events" ON public.query_performance_log
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT e.id FROM events e 
            LEFT JOIN event_access ea ON e.id = ea.event_id 
            WHERE e.created_by = auth.uid() OR ea.user_id = auth.uid()
        )
    );

-- =============================================================================
-- 12. CREATE UNIQUE INDEX FOR MATERIALIZED VIEW (if exists and has suitable columns)
-- =============================================================================
DO $$
DECLARE
    col_exists boolean;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'event_analytics') THEN
        -- Check if the materialized view has an id column
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_analytics' 
            AND column_name = 'id'
        ) INTO col_exists;
        
        IF col_exists THEN
            -- Create unique index if it doesn't exist and id column exists
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'event_analytics_id_idx') THEN
                CREATE UNIQUE INDEX event_analytics_id_idx ON event_analytics (id);
            END IF;
        ELSE
            -- If no id column, try to create index on event_id if it exists
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'event_analytics' 
                AND column_name = 'event_id'
            ) INTO col_exists;
            
            IF col_exists AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'event_analytics_event_id_idx') THEN
                CREATE INDEX event_analytics_event_id_idx ON event_analytics (event_id);
            END IF;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- 13. INSERT DEFAULT PERFORMANCE SCHEDULE ENTRIES
-- =============================================================================
INSERT INTO public.performance_schedule (task_name, schedule_expression, is_enabled)
VALUES 
    ('refresh_event_metrics', '0 */6 * * *', true),
    ('cleanup_old_logs', '0 2 * * *', true),
    ('system_health_check', '*/15 * * * *', true)
ON CONFLICT (task_name) DO UPDATE SET
    schedule_expression = EXCLUDED.schedule_expression,
    is_enabled = EXCLUDED.is_enabled;

-- =============================================================================
-- 14. UPDATE SYSTEM_SETTINGS WITH PROPER DEFAULT_ORG_ID
-- =============================================================================
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'default_org_id', 
    to_jsonb('00000000-0000-4000-8000-000000000001'::text),
    'Default organization ID for new users'
)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = now();

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'All SQL fixes have been applied successfully!';
    RAISE NOTICE 'Tables created: gate_merge_suggestions, system_health_logs, query_performance_log, performance_schedule, adaptive_thresholds, system_status, organizations';
    RAISE NOTICE 'Functions created: get_threshold_with_default, haversine_distance, refresh_event_metrics_cache, refresh_all_performance_caches';
    RAISE NOTICE 'RLS policies added for gates and query_performance_log tables';
    RAISE NOTICE 'Default data inserted for organizations and system_settings';
END $$;
