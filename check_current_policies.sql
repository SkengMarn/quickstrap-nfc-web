-- Diagnostic: Check current RLS policies on organization tables
-- Run this to see what policies are currently active

SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  LEFT(qual::text, 100) as using_clause_preview,
  LEFT(with_check::text, 100) as with_check_preview
FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_members')
ORDER BY tablename, cmd, policyname;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('organizations', 'organization_members')
GROUP BY tablename;
