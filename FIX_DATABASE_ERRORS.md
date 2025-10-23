# Fix Database Errors - Quick Guide

## Issue: Column `e.public` does not exist

**Error in Console:**
```
column e.public does not exist
Hint: Perhaps you meant to reference the column "e.is_public"
```

## Solution

Run the fixed SQL file in your Supabase SQL Editor:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Fix
Copy and paste the contents of `fix_missing_functions.sql` and click **Run**

This will:
- ✅ Fix the `get_events_with_activation()` function
- ✅ Remove references to non-existent columns (`public`, `allow_unlinked_entry`, `ticket_linking_mode`, `has_series`)
- ✅ Use only columns that exist in the events table
- ✅ Create/update event activation functions

### Step 3: Verify
After running, refresh your browser and the errors should be gone:
- ❌ `column e.public does not exist` → ✅ Fixed
- ❌ `Error fetching events with activation` → ✅ Fixed

## What Was Fixed

**Before (Broken):**
```sql
SELECT e.id, e.name, ..., e.public, e.allow_unlinked_entry, ...
```

**After (Fixed):**
```sql
SELECT e.id, e.name, ..., e.is_active, e.lifecycle_status, e.config
```

The function now only references columns that actually exist in the `events` table.

## Date Validations Also Added

The Event Creation Wizard now has comprehensive date validations:

✅ **Start date cannot be in the past**
✅ **Start date must be at least 2 hours from now**
✅ **End date must be after start date**
✅ **Event duration cannot exceed 365 days**
✅ **Valid date format checking**

All validations work both in JavaScript and HTML5 date picker constraints.
