-- Function to get event metrics
CREATE OR REPLACE FUNCTION get_event_metrics()
RETURNS TABLE (
  total_events bigint,
  upcoming_events bigint,
  active_events bigint,
  avg_capacity numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) as total_events,
    SUM(CASE WHEN start_date > NOW() THEN 1 ELSE 0 END) as upcoming_events,
    SUM(CASE WHEN start_date <= NOW() AND end_date >= NOW() THEN 1 ELSE 0 END) as active_events,
    AVG(capacity) as avg_capacity
  FROM public.events
  WHERE
    -- Only include events the user has access to
    EXISTS (
      SELECT 1 FROM public.event_access
      WHERE event_id = events.id
      AND user_id = auth.uid()
    );
$$;

-- Function to get check-in statistics
CREATE OR REPLACE FUNCTION get_event_checkin_stats()
RETURNS TABLE (
  event_id uuid,
  event_name text,
  total_capacity integer,
  checked_in bigint,
  checkin_percentage numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    e.id as event_id,
    e.name as event_name,
    e.capacity as total_capacity,
    COUNT(DISTINCT cl.wristband_id) as checked_in,
    CASE
      WHEN e.capacity > 0 THEN
        (COUNT(DISTINCT cl.wristband_id)::numeric / e.capacity) * 100
      ELSE 0
    END as checkin_percentage
  FROM
    public.events e
    LEFT JOIN public.checkin_logs cl ON e.id = cl.event_id
  WHERE
    -- Only include events the user has access to
    EXISTS (
      SELECT 1 FROM public.event_access
      WHERE event_id = e.id
      AND user_id = auth.uid()
    )
  GROUP BY
    e.id, e.name, e.capacity
  ORDER BY
    e.start_date DESC;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_event_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_checkin_stats() TO authenticated;
