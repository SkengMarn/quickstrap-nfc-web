# Profile Role Fix Instructions

## Problem
You got this error when trying to set your role to `'super_admin'`:
```
ERROR: new row for relation "profiles" violates check constraint "profiles_role_check"
```

## Root Cause
The `profiles` table has a CHECK constraint that doesn't allow `'super_admin'` as a valid role value. The constraint needs to be updated to include all valid roles from your application.

## Solution - Run These SQL Scripts in Order

### Step 1: Fix the Profile Roles Constraint
**Run this script first:** `check_and_fix_profile_roles.sql`

This script will:
1. Check what roles are currently allowed
2. Drop the old constraint
3. Create a new constraint that allows all valid roles:
   - `'super_admin'` ✅
   - `'admin'` ✅
   - `'event_owner'`
   - `'event_admin'`
   - `'staff'`
   - `'read_only'`
4. Set your user (jayssemujju@gmail.com) as `'super_admin'`
5. Verify the change worked

### Step 2: Apply the Admin Bypass RLS Policies
**Run this script second:** `fix_organization_rls_with_admin_bypass.sql`

This script updates the RLS policies so that users with `role = 'super_admin'` or `role = 'admin'` can:
- Access ALL organizations
- Manage ALL organization members
- Full CRUD operations on all organizations

## Quick Start

### In Supabase SQL Editor:

```sql
-- 1. First, fix the constraint and set your role
-- Copy and paste from: check_and_fix_profile_roles.sql

-- 2. Then, apply the admin bypass RLS policies
-- Copy and paste from: fix_organization_rls_with_admin_bypass.sql
```

### After Running Both Scripts:

1. Refresh your browser at http://localhost:3000/
2. You should now see ALL organizations (KCCA FC and Malembe Events)
3. You can access and manage all organizations without being a member

## Valid Roles

### System-Level Roles (in profiles.role)
- **super_admin**: Full system access, can access all organizations
- **admin**: Administrative access, can access all organizations
- **event_owner**: Can create and own events
- **event_admin**: Can administer events they have access to
- **staff**: Event staff member
- **read_only**: Read-only access

### Organization-Level Roles (in organization_members.role)
- **owner**: Organization owner
- **admin**: Organization administrator
- **manager**: Organization manager
- **member**: Organization member

## Code Changes Already Applied

The following files have already been updated in your codebase:

1. ✅ `src/services/organizationService.ts`
   - Now checks `profiles.role` for super_admin/admin
   - Returns ALL organizations for admins
   - Returns member organizations for regular users

2. ✅ `src/contexts/OrganizationContext.tsx`
   - Re-enabled auto-load (was temporarily disabled)
   - Will now load organizations based on your role

3. ✅ `src/components/events/EventCreationWizard.tsx`
   - Added timeout protection for organization loading

4. ✅ `vite.config.ts`
   - Fixed dependency pre-bundling issue

## Testing

After running both SQL scripts:

```sql
-- Verify your role
SELECT id, email, role, full_name
FROM profiles
WHERE email = 'jayssemujju@gmail.com';

-- Should show: role = 'super_admin'

-- Verify you can see all organizations (this respects RLS)
SELECT id, name, created_at
FROM organizations
ORDER BY created_at DESC;

-- Should show: KCCA FC, Malembe Events, and any others
```

## Troubleshooting

### If you still can't see organizations after running the scripts:

1. **Check your role was set:**
   ```sql
   SELECT role FROM profiles WHERE email = 'jayssemujju@gmail.com';
   ```

2. **Check RLS policies exist:**
   ```sql
   SELECT policyname, cmd
   FROM pg_policies
   WHERE tablename = 'organizations'
   ORDER BY policyname;
   ```

3. **Clear browser cache and refresh**

4. **Check browser console for errors** (F12 → Console tab)

### If you get authentication errors:

Make sure you're logged in as jayssemujju@gmail.com in the application.

## Summary

The issue was that the database constraint on `profiles.role` didn't include `'super_admin'` as a valid value. We're fixing this by:

1. ✅ Updating the CHECK constraint to allow all valid roles
2. ✅ Setting your user as super_admin
3. ✅ Updating RLS policies to give super_admins/admins full access
4. ✅ Code already updated to check profile roles

After running both SQL scripts, you'll have full admin access to all organizations! 🚀
