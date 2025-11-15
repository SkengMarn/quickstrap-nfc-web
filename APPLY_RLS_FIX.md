# Apply RLS Fix to Supabase Database

## Problem
The `organizationService.ts` file was empty, causing infinite loading when the application tries to load organizations. Additionally, there are RLS (Row Level Security) policies causing infinite recursion.

## Solution
I've restored the `organizationService.ts` file and created an RLS fix. You need to apply the RLS fix to your Supabase database.

## Option 1: Apply via Supabase Dashboard (RECOMMENDED)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/pmrxyisasfaimumuobvu

2. Click on **SQL Editor** in the left sidebar

3. Click **New Query**

4. Copy the entire contents of the file: `fix_rls_now.sql`

5. Paste into the SQL editor

6. Click **Run** (or press Cmd/Ctrl + Enter)

7. You should see "RLS policies fixed successfully!" in the results

## Option 2: Apply via Supabase CLI

If you have the Supabase CLI installed with proper credentials:

```bash
# Make sure you're logged in
npx supabase login

# Link your project
npx supabase link --project-ref pmrxyisasfaimumuobvu

# Apply the fix
cat fix_rls_now.sql | npx supabase db execute
```

## What the Fix Does

The RLS fix addresses the infinite recursion issue by:

1. **Dropping problematic recursive policies** - Policies that were querying the same table they were protecting

2. **Creating SECURITY DEFINER functions** - These functions bypass RLS to safely check membership:
   - `user_is_org_member(org_id)` - Check if user is a member
   - `user_organization_ids()` - Get all organization IDs for the user

3. **Creating non-recursive policies** - New policies that use the helper functions to avoid recursion

4. **Adding performance indexes** - Optimized indexes for faster queries

## Verify the Fix

After applying the RLS fix:

1. The dev server is already running at http://localhost:3000

2. Try logging in to the application

3. You should no longer see infinite loading

4. Organizations should load properly

## If You Still Have Issues

Check the browser console for any errors:
1. Open Developer Tools (F12 or Cmd+Option+I)
2. Go to the Console tab
3. Look for any red errors
4. Share those errors if the problem persists

## Files Modified

- ✅ `src/services/organizationService.ts` - Restored with full implementation
- ✅ `fix_rls_now.sql` - RLS fix SQL script (ready to apply)
- ✅ `supabase/migrations/20251105000000_fix_organization_rls_permanent.sql` - Migration version (for future deployments)
