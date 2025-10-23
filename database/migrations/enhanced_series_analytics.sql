-- =====================================================
-- ENHANCED ANALYTICS FOR MULTI-SERIES EVENTS
-- =====================================================
-- This migration adds comprehensive analytics views and functions
-- for multi-series event analysis
-- =====================================================

-- =====================================================
-- 1. DETAILED SERIES ANALYTICS VIEW
-- =====================================================
CREATE OR REPLACE VIEW public.series_analytics_detailed AS
SELECT
  es.id as series_id,
  es.name as series_name,
  es.main_event_id,
  e.name as main_event_name,
  es.start_date as series_start,
  es.end_date as series_end,
  es.sequence_number,
  es.series_type,

  -- Check-in metrics
  COUNT(DISTINCT cl.wristband_id) as unique_checkins,
  COUNT(cl.id) as total_checkins,
  COUNT(DISTINCT cl.wristband_id) FILTER (WHERE cl.checked_in_at IS NOT NULL) as successful_checkins,

  -- Wristband assignment metrics
  COUNT(DISTINCT swa.wristband_id) as assigned_wristbands,

  -- Staff and gate metrics
  COUNT(DISTINCT cl.staff_id) as staff_count,
  COUNT(DISTINCT cl.gate_id) as gates_used,

  -- Time metrics
  MIN(cl.checked_in_at) as first_checkin,
  MAX(cl.checked_in_at) as last_checkin,

  -- Utilization rate
  CASE
    WHEN COUNT(DISTINCT swa.wristband_id) > 0
    THEN ROUND((COUNT(DISTINCT cl.wristband_id)::numeric / COUNT(DISTINCT swa.wristband_id)::numeric) * 100, 2)
    ELSE 0
  END as utilization_percentage,

  -- Category breakdown (as JSON)
  jsonb_agg(DISTINCT jsonb_build_object(
    'category', w.category,
    'count', COUNT(DISTINCT w.id) FILTER (WHERE w.category IS NOT NULL)
  )) FILTER (WHERE w.category IS NOT NULL) as category_breakdown

FROM public.event_series es
JOIN public.events e ON es.main_event_id = e.id
LEFT JOIN public.checkin_logs cl ON cl.series_id = es.id
LEFT JOIN public.series_wristband_assignments swa ON swa.series_id = es.id AND swa.is_active = true
LEFT JOIN public.wristbands w ON w.id = cl.wristband_id

GROUP BY
  es.id,
  es.name,
  es.main_event_id,
  e.name,
  es.start_date,
  es.end_date,
  es.sequence_number,
  es.series_type;

-- =====================================================
-- 2. MAIN EVENT ROLLUP ANALYTICS VIEW
-- =====================================================
CREATE OR REPLACE VIEW public.main_event_analytics_detailed AS
SELECT
  e.id as event_id,
  e.name as event_name,
  e.start_date as event_start,
  e.end_date as event_end,

  -- Series metrics
  COUNT(DISTINCT es.id) as total_series,
  COUNT(DISTINCT es.id) FILTER (WHERE NOW() BETWEEN es.start_date AND es.end_date) as active_series,
  COUNT(DISTINCT es.id) FILTER (WHERE NOW() > es.end_date) as completed_series,
  COUNT(DISTINCT es.id) FILTER (WHERE NOW() < es.start_date) as upcoming_series,

  -- Overall check-in metrics (from all series + direct event check-ins)
  COUNT(DISTINCT cl_series.wristband_id) + COUNT(DISTINCT cl_direct.wristband_id) as total_unique_checkins,
  COUNT(cl_series.id) + COUNT(cl_direct.id) as total_checkins,

  -- Series-specific check-ins
  COUNT(DISTINCT cl_series.wristband_id) as series_unique_checkins,
  COUNT(cl_series.id) as series_total_checkins,

  -- Direct event check-ins (no series)
  COUNT(DISTINCT cl_direct.wristband_id) as direct_unique_checkins,
  COUNT(cl_direct.id) as direct_total_checkins,

  -- Wristband metrics
  COUNT(DISTINCT w.id) as total_wristbands,
  COUNT(DISTINCT w.id) FILTER (WHERE w.is_active = true) as active_wristbands,

  -- Staff and gate metrics across all series
  COUNT(DISTINCT cl_series.staff_id) + COUNT(DISTINCT cl_direct.staff_id) as total_staff,
  COUNT(DISTINCT cl_series.gate_id) + COUNT(DISTINCT cl_direct.gate_id) as total_gates,

  -- Time metrics
  LEAST(MIN(cl_series.checked_in_at), MIN(cl_direct.checked_in_at)) as first_checkin,
  GREATEST(MAX(cl_series.checked_in_at), MAX(cl_direct.checked_in_at)) as last_checkin,

  -- Average metrics per series
  CASE
    WHEN COUNT(DISTINCT es.id) > 0
    THEN ROUND(COUNT(DISTINCT cl_series.wristband_id)::numeric / COUNT(DISTINCT es.id)::numeric, 2)
    ELSE 0
  END as avg_checkins_per_series

FROM public.events e
LEFT JOIN public.event_series es ON es.main_event_id = e.id
LEFT JOIN public.checkin_logs cl_series ON cl_series.series_id = es.id
LEFT JOIN public.checkin_logs cl_direct ON cl_direct.event_id = e.id AND cl_direct.series_id IS NULL
LEFT JOIN public.wristbands w ON w.event_id = e.id

WHERE e.has_series = true

GROUP BY
  e.id,
  e.name,
  e.start_date,
  e.end_date;

-- =====================================================
-- 3. SERIES COMPARISON VIEW
-- =====================================================
CREATE OR REPLACE VIEW public.series_comparison AS
SELECT
  es.id as series_id,
  es.name as series_name,
  es.main_event_id,
  es.sequence_number,

  -- Check-in metrics for comparison
  COUNT(DISTINCT cl.wristband_id) as unique_checkins,
  COUNT(cl.id) as total_checkins,
  COUNT(DISTINCT swa.wristband_id) as assigned_wristbands,

  -- Utilization for comparison
  CASE
    WHEN COUNT(DISTINCT swa.wristband_id) > 0
    THEN ROUND((COUNT(DISTINCT cl.wristband_id)::numeric / COUNT(DISTINCT swa.wristband_id)::numeric) * 100, 2)
    ELSE 0
  END as utilization_rate,

  -- Revenue potential (if price data exists)
  SUM(COALESCE(t.price_paid, 0)) as total_revenue,

  -- Average check-in time (minutes after start)
  CASE
    WHEN COUNT(cl.id) > 0
    THEN ROUND(AVG(EXTRACT(EPOCH FROM (cl.checked_in_at - es.start_date)) / 60), 2)
    ELSE NULL
  END as avg_checkin_minutes_after_start,

  -- Peak hour
  MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM cl.checked_in_at)) as peak_hour,

  -- Staff efficiency (check-ins per staff member)
  CASE
    WHEN COUNT(DISTINCT cl.staff_id) > 0
    THEN ROUND(COUNT(cl.id)::numeric / COUNT(DISTINCT cl.staff_id)::numeric, 2)
    ELSE 0
  END as checkins_per_staff

FROM public.event_series es
LEFT JOIN public.checkin_logs cl ON cl.series_id = es.id
LEFT JOIN public.series_wristband_assignments swa ON swa.series_id = es.id AND swa.is_active = true
LEFT JOIN public.wristbands w ON w.id = cl.wristband_id
LEFT JOIN public.tickets t ON t.linked_wristband_id = w.id

GROUP BY
  es.id,
  es.name,
  es.main_event_id,
  es.sequence_number,
  es.start_date;

-- =====================================================
-- 4. CATEGORY ANALYTICS PER SERIES
-- =====================================================
CREATE OR REPLACE VIEW public.series_category_analytics AS
SELECT
  es.id as series_id,
  es.name as series_name,
  w.category,

  -- Metrics per category
  COUNT(DISTINCT swa.wristband_id) as assigned_wristbands,
  COUNT(DISTINCT cl.wristband_id) as checked_in_wristbands,
  COUNT(cl.id) as total_checkins,

  -- Utilization per category
  CASE
    WHEN COUNT(DISTINCT swa.wristband_id) > 0
    THEN ROUND((COUNT(DISTINCT cl.wristband_id)::numeric / COUNT(DISTINCT swa.wristband_id)::numeric) * 100, 2)
    ELSE 0
  END as category_utilization,

  -- Average check-ins per wristband in this category
  CASE
    WHEN COUNT(DISTINCT cl.wristband_id) > 0
    THEN ROUND(COUNT(cl.id)::numeric / COUNT(DISTINCT cl.wristband_id)::numeric, 2)
    ELSE 0
  END as avg_checkins_per_wristband

FROM public.event_series es
LEFT JOIN public.series_wristband_assignments swa ON swa.series_id = es.id AND swa.is_active = true
LEFT JOIN public.wristbands w ON w.id = swa.wristband_id
LEFT JOIN public.checkin_logs cl ON cl.wristband_id = w.id AND cl.series_id = es.id

WHERE w.category IS NOT NULL

GROUP BY
  es.id,
  es.name,
  w.category;

-- =====================================================
-- 5. TIME-BASED ANALYTICS (HOURLY BREAKDOWN)
-- =====================================================
CREATE OR REPLACE VIEW public.series_hourly_analytics AS
SELECT
  es.id as series_id,
  es.name as series_name,
  EXTRACT(HOUR FROM cl.checked_in_at) as hour_of_day,
  DATE(cl.checked_in_at) as check_date,

  COUNT(DISTINCT cl.wristband_id) as unique_checkins,
  COUNT(cl.id) as total_checkins,

  -- Calculate what percentage of the day's check-ins this hour represents
  ROUND(
    (COUNT(cl.id)::numeric /
    SUM(COUNT(cl.id)) OVER (PARTITION BY es.id, DATE(cl.checked_in_at))) * 100,
  2) as percentage_of_day

FROM public.event_series es
JOIN public.checkin_logs cl ON cl.series_id = es.id

WHERE cl.checked_in_at IS NOT NULL

GROUP BY
  es.id,
  es.name,
  EXTRACT(HOUR FROM cl.checked_in_at),
  DATE(cl.checked_in_at);

-- =====================================================
-- 6. FUNCTIONS FOR ANALYTICS QUERIES
-- =====================================================

-- Function to get series performance ranking
CREATE OR REPLACE FUNCTION public.get_series_performance_ranking(p_main_event_id uuid)
RETURNS TABLE (
  series_id uuid,
  series_name text,
  rank integer,
  unique_checkins bigint,
  utilization_rate numeric,
  score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.series_id,
    sc.series_name,
    RANK() OVER (ORDER BY
      (sc.unique_checkins * 0.5) + (sc.utilization_rate * 0.5) DESC
    )::integer as rank,
    sc.unique_checkins,
    sc.utilization_rate,
    ROUND((sc.unique_checkins * 0.5) + (sc.utilization_rate * 0.5), 2) as score
  FROM public.series_comparison sc
  WHERE sc.main_event_id = p_main_event_id
  ORDER BY rank;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get real-time series stats
CREATE OR REPLACE FUNCTION public.get_realtime_series_stats(p_series_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'series_id', es.id,
    'series_name', es.name,
    'current_checkins', COUNT(DISTINCT cl.wristband_id),
    'total_capacity', COUNT(DISTINCT swa.wristband_id),
    'utilization_percentage', CASE
      WHEN COUNT(DISTINCT swa.wristband_id) > 0
      THEN ROUND((COUNT(DISTINCT cl.wristband_id)::numeric / COUNT(DISTINCT swa.wristband_id)::numeric) * 100, 2)
      ELSE 0
    END,
    'active_gates', COUNT(DISTINCT cl.gate_id),
    'active_staff', COUNT(DISTINCT cl.staff_id),
    'last_checkin', MAX(cl.checked_in_at),
    'checkins_last_hour', COUNT(cl.id) FILTER (WHERE cl.checked_in_at > NOW() - INTERVAL '1 hour'),
    'checkins_last_15min', COUNT(cl.id) FILTER (WHERE cl.checked_in_at > NOW() - INTERVAL '15 minutes'),
    'is_within_window', public.is_within_checkin_window(NULL, es.id),
    'time_until_window_close',
      CASE
        WHEN NOW() < es.end_date + es.checkin_window_end_offset
        THEN EXTRACT(EPOCH FROM (es.end_date + es.checkin_window_end_offset - NOW()))
        ELSE 0
      END
  ) INTO v_result
  FROM public.event_series es
  LEFT JOIN public.checkin_logs cl ON cl.series_id = es.id
  LEFT JOIN public.series_wristband_assignments swa ON swa.series_id = es.id AND swa.is_active = true
  WHERE es.id = p_series_id
  GROUP BY es.id, es.name, es.end_date, es.checkin_window_end_offset;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to compare series performance
CREATE OR REPLACE FUNCTION public.compare_series_performance(
  p_series_ids uuid[]
)
RETURNS TABLE (
  series_id uuid,
  series_name text,
  metric_name text,
  metric_value numeric,
  percentile numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    SELECT
      sc.series_id,
      sc.series_name,
      sc.unique_checkins,
      sc.utilization_rate,
      sc.checkins_per_staff,
      sc.total_revenue
    FROM public.series_comparison sc
    WHERE sc.series_id = ANY(p_series_ids)
  )
  SELECT series_id, series_name, 'unique_checkins'::text, unique_checkins::numeric,
    PERCENT_RANK() OVER (ORDER BY unique_checkins) * 100 as percentile
  FROM metrics
  UNION ALL
  SELECT series_id, series_name, 'utilization_rate'::text, utilization_rate,
    PERCENT_RANK() OVER (ORDER BY utilization_rate) * 100
  FROM metrics
  UNION ALL
  SELECT series_id, series_name, 'checkins_per_staff'::text, checkins_per_staff,
    PERCENT_RANK() OVER (ORDER BY checkins_per_staff) * 100
  FROM metrics
  UNION ALL
  SELECT series_id, series_name, 'total_revenue'::text, total_revenue,
    PERCENT_RANK() OVER (ORDER BY total_revenue) * 100
  FROM metrics;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_checkin_logs_series_time
  ON public.checkin_logs(series_id, checked_in_at);

CREATE INDEX IF NOT EXISTS idx_checkin_logs_wristband_series
  ON public.checkin_logs(wristband_id, series_id);

CREATE INDEX IF NOT EXISTS idx_series_wristband_active
  ON public.series_wristband_assignments(series_id, is_active)
  WHERE is_active = true;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON VIEW public.series_analytics_detailed IS 'Comprehensive analytics for individual series including utilization and category breakdown';
COMMENT ON VIEW public.main_event_analytics_detailed IS 'Aggregated analytics for main events with series rollup';
COMMENT ON VIEW public.series_comparison IS 'Comparative metrics across series for ranking and analysis';
COMMENT ON VIEW public.series_category_analytics IS 'Category-level breakdown for each series';
COMMENT ON VIEW public.series_hourly_analytics IS 'Time-based analytics showing hourly check-in patterns';
COMMENT ON FUNCTION public.get_series_performance_ranking IS 'Returns series ranked by performance score';
COMMENT ON FUNCTION public.get_realtime_series_stats IS 'Returns real-time statistics for a series';
COMMENT ON FUNCTION public.compare_series_performance IS 'Compares multiple series across key metrics';
