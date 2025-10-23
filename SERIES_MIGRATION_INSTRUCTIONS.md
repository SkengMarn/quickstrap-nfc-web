# Series-Aware System Migration Instructions

## ⚠️ Database Migration Required

Your application code is now series-aware, but your database schema needs to be updated to support this functionality.

## Quick Fix

1. **Open Supabase Dashboard**
   - Go to your project at https://supabase.com
   - Navigate to **SQL Editor**

2. **Run the Migration**
   - Open the file: `add_series_awareness_migration.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click **Run**

3. **Verify Success**
   - The migration includes verification queries at the bottom
   - You should see `series_id` columns added to:
     - ✅ `tickets`
     - ✅ `wristbands` (if not already present)
     - ✅ `checkin_logs` (if not already present)
     - ✅ `gates` (if not already present)

4. **Refresh Your Application**
   - After running the migration, refresh your browser
   - All errors should be resolved

## What This Migration Does

### Adds `series_id` Column To:
- **tickets** - Allows tickets to belong to parent event or specific series
- **wristbands** - Allows wristbands to belong to parent event or specific series
- **checkin_logs** - Tracks which series a check-in belongs to
- **gates** - Allows gates to be series-specific or shared

### Creates Indexes For:
- Fast queries filtering by `series_id`
- Efficient queries combining `event_id` and `series_id`

### Data Separation Logic:
- **Parent Event Data**: `series_id IS NULL`
- **Series Data**: `series_id = 'specific-series-id'`

## After Migration

Your system will support:
- ✅ Uploading wristbands to parent event (assignable to any series)
- ✅ Uploading wristbands directly to a series
- ✅ Uploading tickets to parent event or specific series
- ✅ Separate check-in tracking per series
- ✅ Accurate counts for parent vs series in the events table
- ✅ Bulk assignment of parent resources to series

## Troubleshooting

If you still see errors after migration:
1. Verify the migration ran successfully (check verification queries)
2. Clear your browser cache
3. Check Supabase logs for any RLS policy issues
4. Ensure your database user has proper permissions

## Need Help?

If you encounter issues:
- Check the Supabase logs in the Dashboard
- Verify foreign key constraints are satisfied
- Ensure `event_series` table exists with proper structure
