# 🔧 Series Status Update Fix

## Problem
Series status updates were failing with two errors:
1. ❌ `Could not find the 'is_active' column of 'event_series'` - Series table doesn't have this column
2. ❌ `new row violates row-level security policy for table "series_state_transitions"` - RLS blocking state transition inserts

## Solution

### Step 1: Run SQL Migration
Run the SQL file in your Supabase SQL Editor:

**File**: `fix_series_status_update.sql`

This creates a database function `update_series_status()` that:
- ✅ Updates series lifecycle_status
- ✅ Creates state transition records
- ✅ Bypasses RLS using SECURITY DEFINER
- ✅ Properly handles permissions

### Step 2: Hard Refresh Browser
After the SQL runs, hard refresh your browser:
- **Mac**: `Cmd + Shift + R`
- **Windows**: `Ctrl + Shift + R`

Or:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

## What Changed

### Before (Failed):
```typescript
// Direct update to event_series table
await supabase
  .from('event_series')
  .update({ 
    lifecycle_status: newStatus,
    is_active: newStatus === 'active' // ❌ Column doesn't exist
  })
  .eq('id', id);
```

### After (Works):
```typescript
// For series: Use RPC function
if (type === 'series') {
  await supabase.rpc('update_series_status', {
    p_series_id: id,
    p_new_status: newStatus
  });
}

// For events: Direct update (has is_active column)
else {
  await supabase
    .from('events')
    .update({ 
      lifecycle_status: newStatus,
      is_active: newStatus === 'active'
    })
    .eq('id', id);
}
```

## How It Works

### Database Function Flow:
```
update_series_status(series_id, new_status)
  ↓
1. Get current status
  ↓
2. Update event_series table
   - lifecycle_status
   - status_changed_at
   - status_changed_by
   - updated_at
  ↓
3. Insert into series_state_transitions
   - series_id
   - from_status
   - to_status
   - changed_by
   - automated: false
  ↓
4. Return success JSON
```

### Security:
- Function runs with `SECURITY DEFINER` - elevated privileges
- Bypasses RLS for state transition inserts
- Still respects user authentication (uses auth.uid())
- Only accessible to authenticated users

## Validation Still Works

The parent event validation happens BEFORE calling the function:
```typescript
// Validation check (in TypeScript)
if (type === 'series' && newStatus === 'active') {
  if (parentEvent.lifecycle_status !== 'active') {
    toast.error('Cannot activate series: Parent event must be active first');
    return; // Don't call function
  }
}

// Only if validation passes
await supabase.rpc('update_series_status', {...});
```

## Testing

### Test Case 1: Update Series Status (Parent Active)
1. Ensure parent event is Active
2. Double-click series status badge
3. Select new status
4. ✅ Should update successfully
5. ✅ Should show success toast
6. ✅ Should refresh data in background

### Test Case 2: Activate Series (Parent Draft)
1. Ensure parent event is Draft
2. Double-click series status badge
3. Select "Active"
4. ❌ Should show validation error
5. ❌ Should NOT update status

### Test Case 3: Update Event Status
1. Double-click event status badge
2. Select new status
3. ✅ Should update successfully
4. ✅ Should update is_active field

## Files Modified

1. **fix_series_status_update.sql** (NEW)
   - Database function for series status updates
   - Handles RLS and state transitions

2. **src/components/events/CompactEventsTable.tsx**
   - Uses RPC function for series
   - Direct update for events
   - Maintains validation logic

## Troubleshooting

### Still getting errors?
1. ✅ Confirm SQL migration ran successfully in Supabase
2. ✅ Hard refresh browser (clear cache)
3. ✅ Check browser console for new errors
4. ✅ Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'update_series_status';`

### Function not found?
- Run the SQL migration again
- Check for SQL errors in Supabase SQL Editor
- Verify you're in the correct project

### RLS still blocking?
- Function should have `SECURITY DEFINER`
- Check function definition: `\df+ update_series_status`
- Verify GRANT statement executed

---

**Status**: ✅ Ready to Deploy  
**Priority**: High (Blocks series status updates)  
**Impact**: Fixes all series status update issues
