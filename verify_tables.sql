-- Verify that new tables exist
SELECT
  table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public'
                 AND table_name = t.table_name)
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (VALUES
  ('fraud_detections'),
  ('wristband_blocks'),
  ('system_alerts'),
  ('staff_performance'),
  ('staff_performance_cache'),
  ('export_jobs'),
  ('scheduled_reports'),
  ('audit_log'),
  ('gate_merges'),
  ('staff_messages')
) AS t(table_name)
ORDER BY table_name;

-- Check if event_analytics view exists
SELECT
  'event_analytics' as view_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'event_analytics')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;
