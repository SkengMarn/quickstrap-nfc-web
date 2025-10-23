-- =====================================================
-- QUICKSTRAP COMPLETE SCHEMA RECONSTRUCTION - PART 5
-- =====================================================
-- Materialized Views and Performance Optimizations

-- 1. EVENT METRICS CACHE (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.event_metrics_cache AS
SELECT 
  e.id as event_id,
  e.name as event_name,
  e.organization_id,
  COUNT(DISTINCT w.id) as total_wristbands,
  COUNT(DISTINCT cl.id) as total_checkins,
  COUNT(DISTINCT CASE WHEN w.is_active = true THEN w.id END) as active_wristbands,
  COUNT(DISTINCT CASE WHEN w.is_blocked = true THEN w.id END) as blocked_wristbands,
  COUNT(DISTINCT CASE WHEN w.linked_ticket_id IS NOT NULL THEN w.id END) as linked_wristbands,
  COUNT(DISTINCT cl.staff_id) as unique_staff,
  COUNT(DISTINCT cl.gate_id) as unique_gates,
  COALESCE(ROUND((COUNT(DISTINCT cl.id)::decimal / NULLIF(COUNT(DISTINCT w.id), 0)) * 100, 2), 0) as checkin_rate,
  MIN(cl.checked_in_at) as first_checkin,
  MAX(cl.checked_in_at) as last_checkin,
  COUNT(DISTINCT DATE(cl.checked_in_at)) as active_days,
  now() as last_updated
FROM public.events e
LEFT JOIN public.wristbands w ON e.id = w.event_id
LEFT JOIN public.checkin_logs cl ON e.id = cl.event_id
WHERE e.is_active = true
GROUP BY e.id, e.name, e.organization_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_metrics_cache_event_id ON public.event_metrics_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_event_metrics_cache_org ON public.event_metrics_cache(organization_id);

-- 2. RECENT CHECKINS CACHE (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.recent_checkins_cache AS
SELECT 
  cl.id,
  cl.event_id,
  cl.wristband_id,
  cl.gate_id,
  cl.staff_id,
  cl.checked_in_at,
  cl.location_lat,
  cl.location_lng,
  w.nfc_id,
  w.category as wristband_category,
  p.full_name as staff_name,
  p.email as staff_email,
  e.name as event_name,
  EXTRACT(EPOCH FROM (now() - cl.checked_in_at)) as seconds_ago
FROM public.checkin_logs cl
JOIN public.wristbands w ON cl.wristband_id = w.id
JOIN public.events e ON cl.event_id = e.id
LEFT JOIN public.profiles p ON cl.staff_id = p.id
WHERE cl.checked_in_at >= (now() - INTERVAL '24 hours')
ORDER BY cl.checked_in_at DESC;

-- Create indexes on recent checkins cache
CREATE INDEX IF NOT EXISTS idx_recent_checkins_cache_event ON public.recent_checkins_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_recent_checkins_cache_time ON public.recent_checkins_cache(checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_checkins_cache_staff ON public.recent_checkins_cache(staff_id);

-- 3. GATE PERFORMANCE CACHE (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.gate_performance_cache AS
SELECT 
  cl.event_id,
  cl.gate_id,
  e.name as event_name,
  e.organization_id,
  COUNT(*) as total_checkins,
  COUNT(DISTINCT cl.wristband_id) as unique_wristbands,
  COUNT(DISTINCT cl.staff_id) as staff_count,
  COUNT(DISTINCT DATE(cl.checked_in_at)) as active_days,
  MIN(cl.checked_in_at) as first_checkin,
  MAX(cl.checked_in_at) as last_checkin,
  NULL::decimal as avg_interval_seconds,  -- Simplified - can be calculated separately if needed
  COUNT(*) FILTER (WHERE cl.checked_in_at >= CURRENT_DATE) as today_checkins,
  COUNT(*) FILTER (WHERE cl.checked_in_at >= (now() - INTERVAL '1 hour')) as last_hour_checkins,
  ag.status as gate_status,
  ag.approval_status,
  ag.location_lat,
  ag.location_lng,
  now() as last_updated
FROM public.checkin_logs cl
JOIN public.events e ON cl.event_id = e.id
LEFT JOIN public.autonomous_gates ag ON cl.gate_id = ag.gate_id AND cl.event_id = ag.event_id
WHERE cl.gate_id IS NOT NULL
GROUP BY cl.event_id, cl.gate_id, e.name, e.organization_id, ag.status, ag.approval_status, ag.location_lat, ag.location_lng;

-- Create indexes on gate performance cache
CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_event ON public.gate_performance_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_gate ON public.gate_performance_cache(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_performance_cache_org ON public.gate_performance_cache(organization_id);

-- 4. STAFF ACTIVITY CACHE (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.staff_activity_cache AS
SELECT 
  cl.staff_id,
  cl.event_id,
  p.full_name as staff_name,
  p.email as staff_email,
  e.name as event_name,
  e.organization_id,
  COUNT(*) as total_checkins,
  COUNT(DISTINCT cl.wristband_id) as unique_wristbands,
  COUNT(DISTINCT cl.gate_id) as gates_used,
  COUNT(DISTINCT DATE(cl.checked_in_at)) as active_days,
  MIN(cl.checked_in_at) as first_activity,
  MAX(cl.checked_in_at) as last_activity,
  NULL::decimal as avg_processing_time,  -- Simplified - can be calculated separately if needed
  COUNT(*) FILTER (WHERE cl.checked_in_at >= CURRENT_DATE) as today_checkins,
  COUNT(*) FILTER (WHERE cl.checked_in_at >= (now() - INTERVAL '1 hour')) as last_hour_checkins,
  ea.access_level,
  now() as last_updated
FROM public.checkin_logs cl
JOIN public.profiles p ON cl.staff_id = p.id
JOIN public.events e ON cl.event_id = e.id
LEFT JOIN public.event_access ea ON cl.staff_id = ea.user_id AND cl.event_id = ea.event_id
WHERE cl.staff_id IS NOT NULL
GROUP BY cl.staff_id, cl.event_id, p.full_name, p.email, e.name, e.organization_id, ea.access_level;

-- Create indexes on staff activity cache
CREATE INDEX IF NOT EXISTS idx_staff_activity_cache_staff ON public.staff_activity_cache(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_cache_event ON public.staff_activity_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_activity_cache_org ON public.staff_activity_cache(organization_id);

-- 5. CATEGORY PERFORMANCE CACHE (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.category_performance_cache AS
SELECT 
  w.event_id,
  w.category,
  e.name as event_name,
  e.organization_id,
  COUNT(DISTINCT w.id) as total_wristbands,
  COUNT(DISTINCT cl.id) as total_checkins,
  COUNT(DISTINCT CASE WHEN w.is_active = true THEN w.id END) as active_wristbands,
  COUNT(DISTINCT CASE WHEN w.is_blocked = true THEN w.id END) as blocked_wristbands,
  COUNT(DISTINCT CASE WHEN w.linked_ticket_id IS NOT NULL THEN w.id END) as linked_wristbands,
  COALESCE(ROUND((COUNT(DISTINCT cl.id)::decimal / NULLIF(COUNT(DISTINCT w.id), 0)) * 100, 2), 0) as checkin_rate,
  COUNT(DISTINCT cl.gate_id) as gates_used,
  MIN(cl.checked_in_at) as first_checkin,
  MAX(cl.checked_in_at) as last_checkin,
  COUNT(*) FILTER (WHERE cl.checked_in_at >= CURRENT_DATE) as today_checkins,
  ecl.max_limit,
  ecl.current_count,
  CASE 
    WHEN ecl.max_limit > 0 THEN ROUND((ecl.current_count::decimal / ecl.max_limit) * 100, 2)
    ELSE 0
  END as capacity_percentage,
  now() as last_updated
FROM public.wristbands w
JOIN public.events e ON w.event_id = e.id
LEFT JOIN public.checkin_logs cl ON w.id = cl.wristband_id
LEFT JOIN public.event_category_limits ecl ON w.event_id = ecl.event_id AND w.category = ecl.category
WHERE w.category IS NOT NULL
GROUP BY w.event_id, w.category, e.name, e.organization_id, ecl.max_limit, ecl.current_count;

-- Create indexes on category performance cache
CREATE INDEX IF NOT EXISTS idx_category_performance_cache_event ON public.category_performance_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_category_performance_cache_category ON public.category_performance_cache(category);
CREATE INDEX IF NOT EXISTS idx_category_performance_cache_org ON public.category_performance_cache(organization_id);

-- 6. HOURLY CHECKIN TRENDS CACHE (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.hourly_checkin_trends_cache AS
SELECT 
  cl.event_id,
  e.name as event_name,
  e.organization_id,
  DATE(cl.checked_in_at) as checkin_date,
  EXTRACT(HOUR FROM cl.checked_in_at) as checkin_hour,
  COUNT(*) as checkin_count,
  COUNT(DISTINCT cl.wristband_id) as unique_wristbands,
  COUNT(DISTINCT cl.gate_id) as active_gates,
  COUNT(DISTINCT cl.staff_id) as active_staff,
  AVG(COUNT(*)) OVER (
    PARTITION BY cl.event_id, EXTRACT(HOUR FROM cl.checked_in_at) 
    ORDER BY DATE(cl.checked_in_at) 
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as rolling_avg,
  now() as last_updated
FROM public.checkin_logs cl
JOIN public.events e ON cl.event_id = e.id
WHERE cl.checked_in_at >= (CURRENT_DATE - INTERVAL '30 days')
GROUP BY cl.event_id, e.name, e.organization_id, DATE(cl.checked_in_at), EXTRACT(HOUR FROM cl.checked_in_at)
ORDER BY checkin_date DESC, checkin_hour;

-- Create indexes on hourly trends cache
CREATE INDEX IF NOT EXISTS idx_hourly_checkin_trends_cache_event ON public.hourly_checkin_trends_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_hourly_checkin_trends_cache_date ON public.hourly_checkin_trends_cache(checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_checkin_trends_cache_org ON public.hourly_checkin_trends_cache(organization_id);

-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
CREATE OR REPLACE FUNCTION refresh_event_metrics_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.event_metrics_cache;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_recent_checkins_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.recent_checkins_cache;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_all_performance_caches()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.event_metrics_cache;
  REFRESH MATERIALIZED VIEW public.recent_checkins_cache;
  REFRESH MATERIALIZED VIEW public.gate_performance_cache;
  REFRESH MATERIALIZED VIEW public.staff_activity_cache;
  REFRESH MATERIALIZED VIEW public.category_performance_cache;
  REFRESH MATERIALIZED VIEW public.hourly_checkin_trends_cache;
END;
$$ LANGUAGE plpgsql;

-- GRANT PERMISSIONS ON MATERIALIZED VIEWS
GRANT SELECT ON public.event_metrics_cache TO authenticated;
GRANT SELECT ON public.recent_checkins_cache TO authenticated;
GRANT SELECT ON public.gate_performance_cache TO authenticated;
GRANT SELECT ON public.staff_activity_cache TO authenticated;
GRANT SELECT ON public.category_performance_cache TO authenticated;
GRANT SELECT ON public.hourly_checkin_trends_cache TO authenticated;

-- GRANT EXECUTE ON REFRESH FUNCTIONS
GRANT EXECUTE ON FUNCTION refresh_event_metrics_cache TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_recent_checkins_cache TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_all_performance_caches TO authenticated;
