-- Create the check_rls_enabled function for system health checks
-- This function verifies that RLS is properly enabled on critical tables

CREATE OR REPLACE FUNCTION check_rls_enabled()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rls_status boolean;
BEGIN
  -- Check if RLS is enabled on critical tables
  -- We'll check the events table as a representative critical table
  SELECT relrowsecurity INTO rls_status
  FROM pg_class
  WHERE relname = 'events'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Return true if RLS is enabled
  RETURN COALESCE(rls_status, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_rls_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION check_rls_enabled() TO anon;

-- Test the function
SELECT check_rls_enabled();
