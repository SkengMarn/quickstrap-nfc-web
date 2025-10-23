# Multi-Series Event System - Complete Guide

## Overview

The Multi-Series Event System allows you to create and manage complex event structures such as:
- Multi-day festivals (Day 1, Day 2, Day 3)
- Sports tournaments (Matchday 1-38, Semi-Finals, Finals)
- Conference tracks (Workshop Series, Keynote Series)
- Any event with multiple related sessions

## 🚀 Quick Start

### 1. Deploy the Database Migration

Run the database migration to set up the multi-series tables and functions:

```bash
# Using Supabase CLI
supabase db execute --file database/migrations/multi_series_events_complete.sql

# Or via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Paste the contents of multi_series_events_complete.sql
# 3. Click "Run"
```

### 2. Enable Series for an Event

1. Navigate to **Events** page
2. Click on your event
3. Click **Edit Event**
4. Check the "Enable Series" option (coming in EventForm update)
5. Save the event

### 3. Create Event Series

You have two options:

#### Option A: Manual Creation
1. Go to Event Details page
2. Click the **Series** tab
3. Click **Add Series**
4. Fill in:
   - Series Name (e.g., "Matchday 1")
   - Description
   - Start Date/Time
   - End Date/Time
   - Sequence Number (for ordering)
   - Check-in Window settings

#### Option B: Bulk Upload via CSV
1. Go to Event Details > Series tab
2. Click **Bulk Upload**
3. Download the CSV template
4. Fill in your series data:
   ```csv
   name,description,start_date,end_date,sequence_number,series_type
   Matchday 1,Opening match,2025-01-15 19:00,2025-01-15 21:00,1,standard
   Matchday 2,Second round,2025-01-22 19:00,2025-01-22 21:00,2,standard
   ```
5. Upload the CSV file

## 📋 Portal (Admin) Features

### Event Series Management

**Creating a Series:**
- Each series has its own check-in window configuration
- Series can be ordered using sequence numbers
- Types: Standard, Knockout, Group Stage, Custom

**Check-in Window Configuration:**
- **Start Offset**: How many hours before the series starts check-in is allowed
- **End Offset**: How many hours after the series ends check-in stays open
- Default: 2 hours before and after

### Wristband Management

**Assigning Wristbands to Series:**

Three methods available:

1. **By Category**
   - Select one or more categories (VIP, General, Staff)
   - All wristbands in those categories get assigned to the series

2. **By Ticket Number**
   - Enter ticket numbers (comma or newline separated)
   - Wristbands linked to those tickets get assigned

3. **Individual Assignment**
   - Coming soon: Select specific wristbands

**Important Logic:**
- Wristbands uploaded to the main event remain tied to the main event
- They won't work for series unless explicitly assigned
- You can assign the same wristband to multiple series
- Wristband assignments are tracked for audit purposes

### Viewing Series Analytics

Each series has its own analytics dashboard showing:
- Unique check-ins
- Total check-ins
- Staff count
- Gates used
- First and last check-in times

Main events show aggregated analytics across all series.

## 📱 App (Scanner) Features

### Smart Event/Series Selection

When a scanner opens the app:

1. **Auto-Filtering**: Only shows events/series within their check-in window
2. **Time-Aware**: List updates automatically as windows open/close
3. **Clear Labeling**: Shows which items are events vs. series
4. **Countdown**: Displays time remaining in check-in window

### Scanning Flow

1. Scanner selects an event or series from the list
2. App locks to that selection
3. Scanner can now scan wristbands
4. Each scan verifies:
   - Wristband is valid and active
   - Wristband is assigned to the selected event/series
   - Wristband isn't blocked

### Verification Messages

**Success Messages:**
```
✅ Access granted to [Name] for Matchday 3 (Premier League 2025)
✅ Access granted to [Name] for Day 1 Sessions
```

**Error Messages:**
```
❌ Wristband not valid for this series
❌ Wristband valid for main event only - not linked to selected series
❌ This wristband is blocked
❌ Wristband not found
```

## 🔄 Complete Workflow Example

### Scenario: 38-Match Football Season

**Step 1: Create Main Event**
- Name: "Premier League 2025 Season"
- Dates: Season start to season end
- Enable series: Yes

**Step 2: Bulk Upload Matchdays**
- Create CSV with 38 matchdays
- Each matchday has specific date and time
- Upload via Bulk Upload

**Step 3: Manage Wristbands**

For Season Ticket Holders:
- Upload wristbands to main event
- Assign to ALL series (1-38) using categories

For Single Match Tickets:
- Upload wristbands for specific matchday
- Assign only to relevant series

For VIP Pass:
- Create VIP category wristbands
- Assign to all series plus special events

**Step 4: Scanning**

Scanner on Matchday 5:
1. Opens app
2. Sees only "Matchday 5" in list (only one within window)
3. Selects it
4. Scans wristbands
5. System verifies each wristband is assigned to Matchday 5
6. Season ticket holders: ✅ Access granted
7. Single match (wrong day): ❌ Not valid for this series

## 📊 Database Schema

### Key Tables

**event_series**
- Stores series information
- Links to main_event_id
- Has own check-in window configuration

**series_wristband_assignments**
- Maps wristbands to series
- Tracks who assigned and when
- Can be active/inactive

**Updated Tables:**
- `events`: Added series_id, parent_event_id, check-in window fields
- `wristbands`: Added series_id
- `checkin_logs`: Added series_id to track which series was scanned

### Key Functions

**is_within_checkin_window(event_id, series_id)**
- Returns boolean if current time is within check-in window

**get_scannable_items(organization_id)**
- Returns all events/series currently scannable
- Filtered by check-in window and organization

**verify_wristband_access(wristband_id, event_id, series_id)**
- Comprehensive verification function
- Checks validity, assignment, and blocks

## 🔒 Security & Permissions

**Row Level Security (RLS):**
- All series tables have RLS enabled
- Users can only see/modify series for their organization
- Policies inherit from organization membership

**Audit Trail:**
- All wristband assignments are logged
- Check-ins record which series was scanned
- Staff member is tracked for each operation

## 🎯 Best Practices

1. **Check-in Window Configuration**
   - For concerts: 2 hours before, 1 hour after
   - For sports: 3 hours before, 2 hours after
   - For conferences: 1 day before, same day after

2. **Wristband Assignment**
   - Assign wristbands AFTER creating all series
   - Use categories for bulk assignment
   - Review assignments before event day

3. **Series Naming**
   - Use clear, descriptive names
   - Include sequence numbers for ordering
   - Keep names short for mobile display

4. **Testing**
   - Test scanning flow before first event
   - Verify check-in windows are correct
   - Confirm wristband assignments

## 🐛 Troubleshooting

### Wristband Won't Scan

1. Check wristband is assigned to the series
2. Verify series check-in window is open
3. Confirm wristband is active and not blocked
4. Check scanner selected correct event/series

### Series Not Appearing in Scanner

1. Verify current time is within check-in window
2. Check series dates are correct
3. Confirm scanner has access to organization
4. Refresh the scanner app

### Analytics Not Showing

1. Verify check-ins were logged with series_id
2. Check database views are created
3. Refresh analytics dashboard
4. Check for any database errors

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review database migration logs
3. Check browser console for errors
4. Verify Supabase connection

## 🔄 Migration Notes

**From Existing Events:**

If you have existing events and want to add series:

1. Existing wristbands remain tied to main event
2. Create series under the event
3. Manually assign existing wristbands to series
4. Use bulk assignment by category for efficiency

**Database Compatibility:**

The migration is designed to be non-destructive:
- Adds new tables
- Adds new columns to existing tables
- All changes are optional (nullable fields)
- Existing events continue to work as before

## 📈 Analytics & Reporting

**Series-Level Reports:**
- Individual series performance
- Category breakdown per series
- Peak times per series
- Staff efficiency per series

**Main Event Reports:**
- Aggregated across all series
- Series-by-series comparison
- Overall attendance trends
- Cross-series insights

## 🎓 Advanced Features

### Custom Series Types

Create your own series types in the config:
```json
{
  "series_type": "custom",
  "custom_config": {
    "allow_early_entry": true,
    "vip_only": false,
    "requires_approval": true
  }
}
```

### Dynamic Check-in Windows

Modify check-in windows programmatically:
```sql
UPDATE event_series
SET checkin_window_end_offset = '4 hours'::interval
WHERE id = 'series-id';
```

### Bulk Operations

SQL examples for bulk operations:

```sql
-- Assign all VIP wristbands to a series
INSERT INTO series_wristband_assignments (series_id, wristband_id)
SELECT 'series-id', id
FROM wristbands
WHERE event_id = 'event-id' AND category = 'VIP';

-- Get all check-ins for a series
SELECT cl.*, w.nfc_id, w.category
FROM checkin_logs cl
JOIN wristbands w ON cl.wristband_id = w.id
WHERE cl.series_id = 'series-id';
```

## 🎉 Success Metrics

Track these KPIs:
- ✅ Successful check-ins per series
- ⏱️ Average check-in time
- 🚫 Rejection rate (wrong series)
- 👥 Unique attendees across all series
- 📊 Series popularity ranking

---

**Version:** 1.0
**Last Updated:** 2025-10-18
**Compatible With:** PostgreSQL 14+, Supabase
