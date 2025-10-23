# Series Lifecycle Status - Correction

## What Was Wrong

My initial implementation was **INCORRECT**. I said series only had a simple `is_active` boolean, but your actual schema shows series have **full lifecycle management** just like main events!

## Actual Schema (From Your Database)

```sql
CREATE TABLE public.event_series (
  ...
  lifecycle_status text DEFAULT 'draft'::text CHECK (lifecycle_status = ANY (ARRAY[
    'draft'::text,       -- Not active, can edit freely
    'scheduled'::text,   -- Will activate at start time
    'active'::text,      -- Currently active
    'completed'::text,   -- Finished
    'cancelled'::text    -- Cancelled
  ])),
  status_changed_at timestamp with time zone DEFAULT now(),
  status_changed_by uuid,
  auto_transition_enabled boolean DEFAULT true,
  ...
)
```

## What I Fixed

### 1. **SeriesForm.tsx** ✅
Added lifecycle status management:
- Added `lifecycle_status` field to form state
- Added UI section for status selection (Draft/Scheduled/Active)
- Added dynamic help text for each status
- Added info boxes showing what each status means
- Saves `lifecycle_status` to database

### 2. **series_ticket_linking_config.sql** ✅
Fixed the view to use correct column:
```sql
-- BEFORE (WRONG):
WHERE es.is_active = true;  -- ❌ This column doesn't exist!

-- AFTER (CORRECT):
WHERE es.lifecycle_status IN ('active', 'scheduled');  -- ✅ Uses actual column
```

## Series Lifecycle States

### 1. **Draft** (Default)
```typescript
lifecycle_status: 'draft'
```
- Series is saved but not operational
- Can edit all settings freely
- Not visible to attendees
- Check-ins disabled
- **Use case**: Planning phase, still configuring

### 2. **Scheduled**
```typescript
lifecycle_status: 'scheduled'
auto_transition_enabled: true
```
- Series will auto-activate at `start_date`
- Visible but not yet operational
- Check-ins disabled until activation
- **Use case**: Pre-announce series, auto-start at event time

### 3. **Active**
```typescript
lifecycle_status: 'active'
```
- Series is fully operational
- Check-ins enabled (if within check-in window)
- Visible to attendees
- Limited editing (safety)
- **Use case**: Event is happening now

### 4. **Completed**
```typescript
lifecycle_status: 'completed'
```
- Series has ended
- Check-ins disabled
- Data preserved for analytics
- Cannot reactivate
- **Use case**: Event finished, reviewing data

### 5. **Cancelled**
```typescript
lifecycle_status: 'cancelled'
```
- Series was cancelled
- Check-ins disabled
- Marked as cancelled in UI
- Data preserved
- **Use case**: Event didn't happen

## Auto-Transition System

Your schema includes `auto_transition_enabled` which means series can automatically transition states:

```sql
-- When auto_transition_enabled = true:
draft → scheduled → active → completed
         (at scheduled time)  (at start_date)  (at end_date)
```

## UI Flow

### Creating a New Series:

1. **Fill in basic info** (name, dates, type)
2. **Configure ticket linking** (inherit/disabled/optional/required)
3. **Set check-in window** (hours before/after)
4. **Choose lifecycle status**:
   - **Draft**: Save for later, keep editing
   - **Scheduled**: Auto-activate at start time
   - **Active**: Go live immediately

### Status Selection UI:

```typescript
<select name="lifecycle_status">
  <option value="draft">Draft - Not visible, can edit freely</option>
  <option value="scheduled">Scheduled - Will activate at start time</option>
  <option value="active">Active Now - Immediately available</option>
</select>

// Dynamic help text shows based on selection
{formData.lifecycle_status === 'scheduled' && (
  <Info>
    This series will automatically transition to "active" status 
    at {start_date}
  </Info>
)}
```

## Comparison: Main Event vs Series Lifecycle

| Feature | Main Event | Series | Notes |
|---------|-----------|---------|-------|
| **Lifecycle States** | ✅ 5 states | ✅ 5 states | Same states! |
| **Draft Mode** | ✅ Yes | ✅ Yes | Both support drafts |
| **Scheduled Activation** | ✅ Yes | ✅ Yes | Both auto-activate |
| **Auto-Transition** | ✅ Yes | ✅ Yes | Both have auto_transition_enabled |
| **Status History** | ✅ Tracked | ✅ Tracked | Both have status_changed_at/by |
| **Completed State** | ✅ Yes | ✅ Yes | Both track completion |
| **Cancelled State** | ✅ Yes | ✅ Yes | Both can be cancelled |

**They're identical!** Series have the same lifecycle management as main events.

## Why This Matters

### Before (My Wrong Assumption):
```typescript
// I thought series were simple:
series.is_active = true;  // Just on/off

// This was WRONG!
```

### After (Actual Schema):
```typescript
// Series have full lifecycle:
series.lifecycle_status = 'draft';      // Planning
series.lifecycle_status = 'scheduled';  // Queued for auto-start
series.lifecycle_status = 'active';     // Live now
series.lifecycle_status = 'completed';  // Finished
series.lifecycle_status = 'cancelled';  // Didn't happen

// Much more sophisticated!
```

## Benefits of Lifecycle Management

### 1. **Draft Mode**
- Plan series without activating
- Test configurations
- Prepare in advance

### 2. **Scheduled Activation**
- Set it and forget it
- Series auto-starts at the right time
- No manual intervention needed

### 3. **Status Tracking**
- Know which series are active
- Track completion
- Audit status changes

### 4. **Safety**
- Can't accidentally activate
- Clear state transitions
- Prevents data loss

## Database Query Examples

### Get all active series:
```sql
SELECT * FROM event_series 
WHERE lifecycle_status = 'active';
```

### Get series ready to activate:
```sql
SELECT * FROM event_series 
WHERE lifecycle_status = 'scheduled'
AND start_date <= NOW()
AND auto_transition_enabled = true;
```

### Get series ticket linking summary (active only):
```sql
SELECT * FROM series_ticket_linking_summary;
-- Now correctly filters by lifecycle_status IN ('active', 'scheduled')
```

## Migration Notes

If you have existing series data:
- Old series without `lifecycle_status` will default to `'draft'`
- You may need to manually activate them:
  ```sql
  UPDATE event_series 
  SET lifecycle_status = 'active' 
  WHERE start_date < NOW() AND end_date > NOW();
  ```

## Summary

✅ **Fixed**: Series now have proper lifecycle status management  
✅ **Fixed**: SQL view uses correct column (`lifecycle_status` not `is_active`)  
✅ **Added**: UI for selecting Draft/Scheduled/Active  
✅ **Added**: Dynamic help text and info boxes  
✅ **Corrected**: Documentation to reflect actual schema  

Your schema is much more sophisticated than I initially thought! Series have the same enterprise-grade lifecycle management as main events. 🎉
