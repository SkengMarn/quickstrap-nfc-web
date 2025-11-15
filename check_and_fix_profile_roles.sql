-- Check and Fix Profile Roles Constraint
-- This script checks what roles are currently allowed and updates if needed

-- ============================================================================
-- STEP 1: Check current constraint
-- ============================================================================

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
  AND conname LIKE '%role%';

-- ============================================================================
-- STEP 2: Drop existing check constraint
-- ============================================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ============================================================================
-- STEP 3: Create new constraint with all valid roles
-- ============================================================================

-- Add constraint that allows: super_admin, admin, event_owner, event_admin, staff, read_only
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IS NULL OR role IN (
  'super_admin',
  'admin',
  'event_owner',
  'event_admin',
  'staff',
  'read_only'
));

-- ============================================================================
-- STEP 4: Verify the new constraint
-- ============================================================================

SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
  AND conname = 'profiles_role_check';

-- ============================================================================
-- STEP 5: Now set your user as super_admin
-- ============================================================================

-- Replace with your email
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'jayssemujju@gmail.com';

-- Verify it worked
SELECT id, email, role, full_name
FROM profiles
WHERE email = 'jayssemujju@gmail.com';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profile Roles Constraint Updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Valid roles are now:';
  RAISE NOTICE '  - super_admin (full system access)';
  RAISE NOTICE '  - admin (administrative access)';
  RAISE NOTICE '  - event_owner (can own events)';
  RAISE NOTICE '  - event_admin (can admin events)';
  RAISE NOTICE '  - staff (event staff)';
  RAISE NOTICE '  - read_only (read-only access)';
  RAISE NOTICE '========================================';
END $$;
