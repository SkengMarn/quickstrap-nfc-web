# Multi-Series Events - Deployment & Integration Guide

## 📦 What's Been Created

This implementation includes:

### ✅ Database Layer
- `database/migrations/multi_series_events_complete.sql` - Complete schema migration
- New tables: `event_series`, `series_wristband_assignments`
- Updated tables: `events`, `wristbands`, `checkin_logs`
- PostgreSQL functions for validation and queries
- Views for analytics
- Row Level Security policies

### ✅ Service Layer
- `src/services/eventSeriesService.ts` - Complete service for series management
- TypeScript interfaces and types
- API wrapper functions
- CSV parsing utilities

### ✅ UI Components
- `src/components/series/SeriesManager.tsx` - Main series management interface
- `src/components/series/SeriesForm.tsx` - Create/edit individual series
- `src/components/series/SeriesCsvUpload.tsx` - Bulk CSV upload
- `src/components/series/SeriesWristbandAssignment.tsx` - Assign wristbands to series
- `src/components/scanner/SeriesAwareScanner.tsx` - Smart scanner with series support

### ✅ Documentation
- `MULTI_SERIES_EVENTS_GUIDE.md` - Complete user guide
- This deployment guide

## 🚀 Deployment Steps

### Step 1: Deploy Database Migration

Choose one of these methods:

#### Option A: Via Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd /Users/jew/Desktop/quickstrap_nfc_web

# Run migration
supabase db execute --file database/migrations/multi_series_events_complete.sql

# Verify migration
supabase db execute --command "SELECT COUNT(*) FROM event_series;"
```

#### Option B: Via Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy contents of `database/migrations/multi_series_events_complete.sql`
6. Paste and click **Run**
7. Check for "Success" message

#### Option C: Via Local Postgres

```bash
psql -h your-db-host -U your-user -d your-database -f database/migrations/multi_series_events_complete.sql
```

### Step 2: Verify Database Changes

Run these queries to verify:

```sql
-- Check if tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('event_series', 'series_wristband_assignments');

-- Check if functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('is_within_checkin_window', 'get_scannable_items', 'verify_wristband_access');

-- Check if views exist
SELECT viewname FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('series_analytics', 'main_event_analytics');
```

Expected: 2 tables, 3 functions, 2 views

### Step 3: Update TypeScript Types

Add to `src/services/supabase.ts`:

```typescript
// Add after existing Event type
export type EventSeries = {
  id: string;
  main_event_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  checkin_window_start_offset?: string;
  checkin_window_end_offset?: string;
  sequence_number?: number;
  series_type?: string;
  config?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  organization_id?: string;
}

// Update Event type to include series fields
export type Event = {
  // ... existing fields ...
  series_id?: string | null;
  parent_event_id?: string | null;
  checkin_window_start_offset?: string | null;
  checkin_window_end_offset?: string | null;
  has_series?: boolean;
}
```

### Step 4: Integrate Series Manager into Event Details

Update `src/pages/EventDetailsPage.tsx`:

```typescript
// Add import at top
import SeriesManager from '../components/series/SeriesManager';

// Add to tab list (around line 44)
const tabs = [
  'overview',
  'analytics',
  'wristbands',
  'gates',
  'series',  // ADD THIS
  // ... other tabs
];

// Add tab button in the tab navigation
<button
  onClick={() => setActiveTab('series')}
  className={`tab-button ${activeTab === 'series' ? 'active' : ''}`}
>
  Series
</button>

// Add tab content in the main content area
{activeTab === 'series' && event && (
  <SeriesManager
    eventId={event.id}
    eventName={event.name}
    organizationId={event.organization_id}
  />
)}
```

### Step 5: Add Scanner to Check-in Flow

Create or update a scanner page (e.g., `src/pages/ScannerPage.tsx`):

```typescript
import SeriesAwareScanner from '../components/scanner/SeriesAwareScanner';

export default function ScannerPage() {
  const handleScanComplete = (result: any) => {
    console.log('Scan completed:', result);
    // Handle post-scan actions
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Event Scanner</h1>
      <SeriesAwareScanner onScanComplete={handleScanComplete} />
    </div>
  );
}
```

Or integrate into existing check-in modal by replacing the current scanner logic.

### Step 6: Update Event Form (Optional)

To add "Enable Series" checkbox in Event Form:

Update `src/components/EventForm.tsx`:

```typescript
// Add to formData state
const [formData, setFormData] = useState({
  // ... existing fields ...
  has_series: false,
});

// Add checkbox in form
<div className="flex items-center">
  <input
    type="checkbox"
    name="has_series"
    checked={formData.has_series}
    onChange={handleChange}
    className="h-4 w-4 rounded"
  />
  <label className="ml-2 text-sm">Enable multi-series for this event</label>
</div>
```

### Step 7: Add Routes (If Needed)

If you want a dedicated scanner page:

Update `src/App.tsx` or your router configuration:

```typescript
import ScannerPage from './pages/ScannerPage';

// In your routes
<Route path="/scanner" element={<ScannerPage />} />
```

## 🧪 Testing the Implementation

### Test 1: Database Functions

```sql
-- Test check-in window function
SELECT is_within_checkin_window(
  NULL::uuid,
  (SELECT id FROM event_series LIMIT 1)
);

-- Test scannable items
SELECT * FROM get_scannable_items(NULL);

-- Should return events/series within check-in windows
```

### Test 2: Create a Test Series

1. Go to any event details page
2. Click **Series** tab
3. Click **Add Series**
4. Fill form with test data
5. Save
6. Verify series appears in list

### Test 3: Bulk Upload

1. Go to Series tab
2. Click **Bulk Upload**
3. Download template
4. Add 3-5 test series
5. Upload
6. Verify all series created

### Test 4: Wristband Assignment

1. Create some wristbands for the event
2. Go to a series
3. Click **Manage Wristbands**
4. Assign by category
5. Verify assignment count increases

### Test 5: Scanner Flow

1. Create a series with current date/time within check-in window
2. Assign some wristbands to it
3. Go to scanner page
4. Verify series appears in list
5. Select series
6. Scan a wristband
7. Verify success message

## 🔍 Verification Checklist

- [ ] Database migration ran successfully
- [ ] All tables created (event_series, series_wristband_assignments)
- [ ] Functions available (is_within_checkin_window, etc.)
- [ ] Views created (series_analytics, main_event_analytics)
- [ ] RLS policies active
- [ ] TypeScript types updated
- [ ] Series Manager appears in Event Details
- [ ] Can create individual series
- [ ] Can bulk upload series via CSV
- [ ] Can assign wristbands to series
- [ ] Scanner shows scannable items
- [ ] Scanner can verify series access
- [ ] Check-ins logged with series_id

## 🐛 Troubleshooting

### Migration Errors

**Error: "relation already exists"**
- Some tables may already exist
- Safe to ignore or use `CREATE TABLE IF NOT EXISTS`

**Error: "column already exists"**
- Columns may have been added previously
- Safe to ignore or use conditional creation

**Error: "function already exists"**
- Use `CREATE OR REPLACE FUNCTION` (already in migration)

### Component Not Showing

**Series tab not appearing:**
1. Check import path
2. Verify tab is added to tabs array
3. Check activeTab state management
4. Look for console errors

**Scanner not working:**
1. Verify getScannableItems function exists
2. Check organization context is available
3. Look at network tab for API errors
4. Check browser console

### Verification Failures

**Wristband always denied:**
1. Check wristband is assigned to series
2. Verify series check-in window is open
3. Check wristband is active
4. Look at verification function logic

**No scannable items:**
1. Check current time vs. series dates
2. Verify check-in window offsets
3. Confirm series is for correct organization
4. Check database timezone settings

## 📊 Monitoring

### Database Queries for Monitoring

```sql
-- Active series count
SELECT COUNT(*) FROM event_series;

-- Wristband assignments
SELECT series_id, COUNT(*) as wristband_count
FROM series_wristband_assignments
WHERE is_active = true
GROUP BY series_id;

-- Recent check-ins by series
SELECT
  es.name,
  COUNT(cl.id) as checkins,
  COUNT(DISTINCT cl.wristband_id) as unique_wristbands
FROM event_series es
LEFT JOIN checkin_logs cl ON cl.series_id = es.id
WHERE cl.checked_in_at > NOW() - INTERVAL '24 hours'
GROUP BY es.id, es.name;
```

### Application Logging

Add logging in key areas:

```typescript
// In eventSeriesService.ts
console.log('[SeriesService] Fetching scannable items for org:', organizationId);
console.log('[SeriesService] Verifying wristband:', wristbandId, 'for series:', seriesId);

// In SeriesAwareScanner.tsx
console.log('[Scanner] Selected item:', selectedItem);
console.log('[Scanner] Scan result:', lastScanResult);
```

## 🔄 Rollback Plan

If you need to rollback:

```sql
-- Drop new tables
DROP TABLE IF EXISTS public.series_wristband_assignments CASCADE;
DROP TABLE IF EXISTS public.event_series CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.verify_wristband_access;
DROP FUNCTION IF EXISTS public.get_scannable_items;
DROP FUNCTION IF EXISTS public.is_within_checkin_window;

-- Drop views
DROP VIEW IF EXISTS public.series_analytics;
DROP VIEW IF EXISTS public.main_event_analytics;

-- Remove columns from events
ALTER TABLE public.events DROP COLUMN IF EXISTS series_id;
ALTER TABLE public.events DROP COLUMN IF EXISTS parent_event_id;
ALTER TABLE public.events DROP COLUMN IF EXISTS checkin_window_start_offset;
ALTER TABLE public.events DROP COLUMN IF EXISTS checkin_window_end_offset;

-- Remove columns from wristbands
ALTER TABLE public.wristbands DROP COLUMN IF EXISTS series_id;

-- Remove column from checkin_logs
ALTER TABLE public.checkin_logs DROP COLUMN IF EXISTS series_id;
```

## 📈 Performance Considerations

### Indexes

The migration includes these indexes:
- `idx_event_series_main_event` - Fast series lookup by event
- `idx_event_series_dates` - Efficient date filtering
- `idx_events_series` - Quick event-to-series joins
- `idx_checkin_logs_series` - Fast series analytics

### Query Optimization

For large datasets:
1. Use pagination in series list
2. Add caching for scannable items (30s)
3. Index check-in logs by timestamp
4. Use materialized views for analytics

### Scaling

Expected performance:
- Up to 100 series per event: Excellent
- Up to 1000 wristbands per series: Excellent
- Up to 10,000 check-ins per series: Good
- Beyond 10,000: Consider partitioning

## 🎯 Next Steps

After successful deployment:

1. **Train Staff**
   - Share MULTI_SERIES_EVENTS_GUIDE.md
   - Run through test scenarios
   - Explain check-in window concept

2. **Create Templates**
   - Save CSV templates for common series patterns
   - Document wristband assignment workflows
   - Create testing checklists

3. **Monitor Usage**
   - Track series creation patterns
   - Monitor scan success rates
   - Collect user feedback

4. **Optimize**
   - Adjust check-in windows based on usage
   - Refine wristband assignment processes
   - Update UI based on feedback

## 🎉 You're Done!

Your multi-series event system is now ready. Start by creating a test event with 2-3 series and walk through the complete flow.

---

**Questions or Issues?**
- Check the troubleshooting section
- Review the user guide
- Check database logs
- Verify all files are in place

**Version:** 1.0
**Deployment Date:** 2025-10-18
