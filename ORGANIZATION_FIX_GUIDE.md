# Organization RLS Policy Fix Guide

## Problem

You're experiencing:
1. ❌ Can't create organizations (RLS blocking inserts)
2. ❌ Organization selection list is empty (RLS blocking selects)
3. ❌ Duplicate RLS policies causing conflicts

## Root Cause

**Duplicate RLS Policies:**
- You have 2x policies for each operation (organizations_*, orgs_*)
- You have 3x policies on organization_members
- These duplicates are conflicting with each other

## Solution

### Step 1: Fix RLS Policies (5 minutes)

Run the migration to clean up and fix policies:

```bash
supabase db execute --file database/migrations/fix_organization_rls_policies.sql
```

**What this does:**
1. ✅ Drops ALL duplicate policies
2. ✅ Creates clean, non-conflicting policies
3. ✅ Adds auto-trigger to add creator as owner
4. ✅ Grants proper permissions to authenticated users

### Step 2: Update OrganizationContext (2 minutes)

Replace your `src/contexts/OrganizationContext.tsx` with the fixed version:

```bash
# Backup your current file
cp src/contexts/OrganizationContext.tsx src/contexts/OrganizationContext.backup.tsx

# Replace with fixed version
cp src/contexts/OrganizationContext.fixed.tsx src/contexts/OrganizationContext.tsx
```

**What this fixes:**
1. ✅ Removes hardcoded DEFAULT_ORG_ID
2. ✅ Actually fetches user's organizations from database
3. ✅ Handles empty state (no organizations yet)
4. ✅ Stores user's organization preference
5. ✅ Proper error handling for RLS issues

### Step 3: Verify Fix (3 minutes)

```sql
-- 1. Check policies are clean (should show 4 for each table)
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'organization_members')
GROUP BY tablename;

-- Expected output:
-- organizations: 4 policies
-- organization_members: 4 policies

-- 2. Test creating an organization manually
INSERT INTO organizations (name, slug, description, created_by)
VALUES (
  'Test Organization',
  'test-org',
  'Test description',
  (SELECT auth.uid())
)
RETURNING *;

-- Should succeed and return the new organization

-- 3. Check if you were auto-added as owner
SELECT * FROM organization_members
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'test-org' LIMIT 1);

-- Should show you as owner with status 'active'
```

### Step 4: Test in UI (2 minutes)

1. **Refresh your app** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. **Try creating an organization:**
   - Go to Organization page
   - Click "Create Organization"
   - Fill in name and slug
   - Submit

3. **Check organization list:**
   - Should now show your organizations
   - Should be able to switch between them

## What the Fix Does

### New RLS Policies

**Organizations Table:**

```sql
-- SELECT: See orgs you created or are a member of
organizations_select_policy

-- INSERT: Any authenticated user can create
organizations_insert_policy

-- UPDATE: Creators and admins can update
organizations_update_policy

-- DELETE: Only creators and owners can delete
organizations_delete_policy
```

**Organization Members Table:**

```sql
-- SELECT: See memberships for your orgs
organization_members_select_policy

-- INSERT: Admins can add members (or auto-add on create)
organization_members_insert_policy

-- UPDATE: Admins can update member roles
organization_members_update_policy

-- DELETE: Admins can remove members, users can leave
organization_members_delete_policy
```

### Auto-Add Creator Trigger

When you create an organization, a trigger automatically:
1. Adds you to `organization_members` as `owner`
2. Sets your status to `active`
3. Updates your profile with organization_id

This means **no manual membership creation needed!**

## Troubleshooting

### Issue: Still can't create organizations

**Check authentication:**
```sql
SELECT auth.uid();
-- Should return your user ID, not null
```

**Check user exists:**
```sql
SELECT * FROM auth.users WHERE id = auth.uid();
-- Should return your user record
```

**Try creating manually:**
```sql
INSERT INTO organizations (name, slug, created_by)
VALUES ('My Org', 'my-org', auth.uid())
RETURNING *;
-- Note any error message
```

### Issue: Organizations not showing in list

**Check if organizations exist:**
```sql
SELECT * FROM organizations WHERE created_by = auth.uid();
-- Should show your organizations
```

**Check RLS is working:**
```sql
-- This uses RLS (as authenticated user)
SELECT * FROM organizations;

-- This bypasses RLS (as superuser)
SELECT * FROM organizations;
-- If second works but first doesn't, RLS issue
```

**Force refresh organizations in UI:**
```javascript
// In browser console
localStorage.removeItem('currentOrganizationId');
window.location.reload();
```

### Issue: "Already exists" error when creating

**Check for existing organization:**
```sql
SELECT * FROM organizations WHERE slug = 'your-slug';
-- Slug must be unique
```

**Try different slug or delete old:**
```sql
DELETE FROM organizations WHERE slug = 'your-slug' AND created_by = auth.uid();
```

### Issue: Trigger not adding membership

**Check if trigger exists:**
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'on_organization_created';
-- Should return the trigger
```

**Manually add yourself as owner:**
```sql
INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
VALUES (
  'your-org-id',
  auth.uid(),
  'owner',
  'active',
  NOW()
);
```

## Testing Checklist

After applying the fix:

- [ ] Can create organization via UI
- [ ] Organization appears in selection list
- [ ] Can switch between organizations (if you have multiple)
- [ ] Automatically added as owner when creating
- [ ] Can see organization details
- [ ] Can invite other members
- [ ] Can update organization settings
- [ ] No duplicate policy errors in logs

## Verification Queries

```sql
-- Count your organizations
SELECT COUNT(*) as my_orgs
FROM organizations
WHERE created_by = auth.uid();

-- See your memberships
SELECT
  o.name as organization,
  om.role,
  om.status
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id
WHERE om.user_id = auth.uid();

-- Check policy conflicts (should be 0)
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'organization_members')
GROUP BY tablename
HAVING COUNT(*) != 4;
```

## Clean Slate Option

If nothing works, nuclear option:

```sql
-- WARNING: This deletes ALL organizations and memberships!
-- Only use if you're okay losing this data

-- Delete all memberships
DELETE FROM organization_members;

-- Delete all organizations
DELETE FROM organizations;

-- Now try creating fresh with the fixed policies
```

## Success Indicators

✅ **You've fixed it when:**
1. Can create organization without errors
2. Organization shows in dropdown/list
3. Shows you as owner in members list
4. Can create events under the organization
5. No policy conflicts in database logs

## Migration Summary

**Before:**
- 18 policies (many duplicates)
- Conflicts between policies
- Manual membership creation needed
- Hardcoded organization in context

**After:**
- 8 clean policies (4 per table)
- No conflicts
- Auto-membership on creation
- Dynamic organization loading

---

**Status:** Ready to deploy
**Estimated fix time:** 10 minutes
**Risk:** Low (only affects organizations table)
