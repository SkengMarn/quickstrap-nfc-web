# 📋 Event Status & Check-in Window Guide

## Event Status Storage (config.activation)

### 🗂️ **Where Event Status is Stored**
Event status is stored in the `config` JSONB column under the `activation` key:

```sql
-- Event status structure in database
{
  "config": {
    "activation": {
      "status": "draft" | "scheduled" | "active",
      "scheduled_time": "2025-01-17T15:30:00Z"  // Only for scheduled events
    },
    "checkin_window": {
      "enabled": true,
      "start_time": "2 hours",  // Before event starts
      "end_time": "4 hours"     // After event starts
    }
  }
}
```

### 📊 **Event Status Options**

| Status | Description | is_active | Behavior |
|--------|-------------|-----------|----------|
| **draft** | Event saved but not live | `false` | Not visible to attendees, no check-ins |
| **scheduled** | Auto-activate at specific time | `false` → `true` | Becomes active at scheduled_time |
| **active** | Event is live now | `true` | Check-ins enabled, visible to attendees |

### 🔍 **How to Query Event Status**
```sql
-- Get event status
SELECT 
    name,
    is_active,
    config->'activation'->>'status' as status,
    (config->'activation'->>'scheduled_time')::timestamptz as scheduled_for
FROM events;

-- Find scheduled events
SELECT * FROM events 
WHERE config->'activation'->>'status' = 'scheduled';

-- Find active events
SELECT * FROM events WHERE is_active = true;
```

## Check-in Window Configuration

### ⏰ **New Dropdown Interface**
The check-in window now uses intuitive dropdowns:

**Start Time Options:**
- **Digit**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 24, 48, 72
- **Unit**: Hours, Days
- **Meaning**: How long BEFORE event starts should check-ins open

**End Time Options:**
- **Digit**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 24, 48, 72  
- **Unit**: Hours, Days
- **Meaning**: How long AFTER event starts should check-ins close

### 📝 **Storage Format**
Check-in windows are stored as human-readable strings:
```json
{
  "checkin_window": {
    "enabled": true,
    "start_time": "2 hours",    // Opens 2 hours before event
    "end_time": "4 hours"       // Closes 4 hours after event starts
  }
}
```

### 🎯 **Example Scenarios**

**Conference (Multi-day):**
- Start: `1 days` before event
- End: `2 days` after event starts

**Concert (Short event):**
- Start: `2 hours` before event  
- End: `1 hours` after event starts

**Workshop:**
- Start: `30 minutes` before event
- End: `15 minutes` after event starts

## Database Functions Fixed

### ✅ **Functions Now Available**

1. **`refresh_event_activations()`**
   - Activates all due scheduled events
   - Returns: total_checked, newly_activated, active_events
   - Called automatically by frontend

2. **`check_event_activation(event_id)`**
   - Checks if specific event should be activated
   - Returns: boolean (true if activated/active)
   - Used for individual event checks

3. **`get_events_with_activation()`**
   - Returns all events with automatic activation
   - Refreshes activations before returning
   - Used by EventsPage for reliable data

### 🔧 **Frontend Integration**
```typescript
// Automatic activation service
import { eventActivationService } from './services/eventActivationService';

// Auto-refreshes every minute
eventActivationService.startAutoRefresh();

// Manual refresh
const result = await eventActivationService.refreshActivations();
console.log(`Activated ${result.newlyActivated} events`);
```

## User Experience Improvements

### 🎨 **Enhanced Check-in Window UI**
- **Clear Labels**: "How long before/after event starts"
- **Dropdown Selectors**: Easy digit + unit selection
- **Live Summary**: Shows calculated window times
- **Visual Feedback**: Blue info box with summary

### 📱 **Better Event Status Flow**
- **Step 6**: Dedicated activation step at end of wizard
- **Clear Options**: Draft, Scheduled, Active with descriptions
- **Smart Validation**: Prevents past scheduling times
- **Status Summary**: Shows what will happen when created

### 🔄 **Automatic Activation**
- **No Manual Work**: Events activate themselves
- **Multiple Triggers**: Database + frontend + pg_cron
- **Error Recovery**: Fallback systems if one fails
- **Real-time Updates**: Immediate activation when due

## Troubleshooting

### ❓ **Console Errors Gone?**
The `refresh_event_activations` function now exists, so you should no longer see:
```
Could not find the function public.refresh_event_activations
```

### ❓ **Check Event Status**
```sql
-- View current event statuses
SELECT * FROM events_with_status;

-- Manual activation test
SELECT * FROM refresh_event_activations();
```

### ❓ **Check-in Window Issues**
- Values are stored as strings like "2 hours", "1 days"
- Dropdowns parse and reconstruct these values
- Summary shows live preview of settings

## Success! 🎉

Your event system now has:
- ✅ **Proper event status storage** in config.activation
- ✅ **Intuitive check-in window** dropdowns
- ✅ **Working database functions** (no more console errors)
- ✅ **Automatic event activation** system
- ✅ **Enhanced user experience** with clear options

Events will now activate themselves automatically, and the check-in window configuration is much more user-friendly! 🚀
