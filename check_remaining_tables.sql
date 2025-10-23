WITH user_tables AS (
  SELECT tablename
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'sql_%'
)
SELECT
  t.tablename AS table_name,
  COALESCE((
    (xpath(
      '/row/cnt/text()',
      query_to_xml(
        format('SELECT count(*) AS cnt FROM %I', t.tablename),
        true,
        false,
        ''
      )
    ))[1]
  )::text::bigint, 0) AS row_count
FROM user_tables t
ORDER BY t.tablename;
