-- Check what tables exist in your database
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if specific tables exist
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') 
    THEN 'EXISTS' ELSE 'MISSING' END as events_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wristbands' AND table_schema = 'public') 
    THEN 'EXISTS' ELSE 'MISSING' END as wristbands_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkin_logs' AND table_schema = 'public') 
    THEN 'EXISTS' ELSE 'MISSING' END as checkin_logs_table,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') 
    THEN 'EXISTS' ELSE 'MISSING' END as profiles_table;
