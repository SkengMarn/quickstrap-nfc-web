# Super Admin & Admin Bypass Setup

## Overview
This setup allows super admins and admins to access ALL organizations without needing to be explicitly added as members. Regular users can only access organizations they are members of.

## What Was Fixed

### 1. RLS Policies Updated
**File**: `fix_organization_rls_with_admin_bypass.sql`

The RLS policies now check the user's `role` in the `profiles` table:
- Users with `role = 'super_admin'` or `role = 'admin'` can:
  - View ALL organizations
  - View ALL organization members
  - Add/update/delete any organization member
  - Update any organization
  - Delete any organization (admins only for deletions)

- Regular users (no admin role) can:
  - View only organizations they are members of
  - View only members of organizations they belong to
  - Manage only their own organizations

### 2. Organization Service Updated
**File**: `src/services/organizationService.ts`

The `getUserOrganizations()` method now:
1. Checks the user's role in the `profiles` table
2. If `super_admin` or `admin`: Returns ALL organizations
3. If regular user: Returns only organizations they created or are members of

### 3. Context Still Works
**File**: `src/contexts/OrganizationContext.tsx`

The OrganizationContext was re-enabled and will now properly load organizations for both admins and regular users.

## How to Apply

### Step 1: Run the SQL Script
1. Open your Supabase SQL Editor
2. Copy and paste the contents of `fix_organization_rls_with_admin_bypass.sql`
3. Click "Run"
4. Verify you see success messages

### Step 2: Set Your User Role
Make sure your user has the correct role in the `profiles` table:

```sql
-- Check your current role
SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';

-- Set yourself as super_admin (if needed)
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your-email@example.com';

-- Or set as admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Step 3: Restart Your Dev Server
The code changes are already applied. Just refresh your browser or restart the dev server:
```bash
npm run dev
```

## Role Hierarchy

1. **super_admin**: Full access to everything, can delete any organization
2. **admin**: Full access to everything, can delete organizations
3. **owner** (org-level): Full control over their organization
4. **admin** (org-level): Can manage their organization
5. **manager** (org-level): Limited management permissions
6. **member** (org-level): Basic access to their organization

## Testing

After applying the fix:

1. **As Super Admin/Admin**:
   - You should see ALL organizations (KCCA FC and Malembe Events)
   - You should be able to access any organization without being a member
   - You should be able to manage all organizations

2. **As Regular User**:
   - You should only see organizations you created or are a member of
   - You cannot access other organizations

## Verification Query

Run this in Supabase to verify your setup:

```sql
-- Check how many organizations exist
SELECT COUNT(*) as total_orgs FROM organizations;

-- Check your role
SELECT email, role FROM profiles WHERE id = auth.uid();

-- Check what organizations you can see (this respects RLS)
SELECT * FROM organizations;
```

If you're a super_admin/admin, the last query should return all organizations.
If you're a regular user, it should only return organizations you're a member of.

## Files Modified

1. ✅ `fix_organization_rls_with_admin_bypass.sql` - New SQL script with admin bypass
2. ✅ `src/services/organizationService.ts` - Updated getUserOrganizations()
3. ✅ `src/contexts/OrganizationContext.tsx` - Re-enabled auto-load
4. ✅ `src/components/events/EventCreationWizard.tsx` - Added timeout protection
5. ✅ `vite.config.ts` - Fixed dependency pre-bundling issue

## Notes

- The system uses the `profiles.role` column to determine admin status
- This is separate from organization-level roles (`organization_members.role`)
- Super admins bypass ALL organization RLS restrictions
- This is the recommended approach for multi-tenant applications with super admins
