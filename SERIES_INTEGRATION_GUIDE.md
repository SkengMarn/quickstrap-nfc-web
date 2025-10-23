# Series Integration Guide

## Overview
This guide shows you how to integrate the Series Management system into your existing EventDetailsPage.

---

## Step 1: Import the Components

Add these imports to the top of `src/pages/EventDetailsPage.tsx`:

```typescript
import SeriesManagement from '../components/events/SeriesManagement'
import CreateSeriesDialog from '../components/events/CreateSeriesDialog'
```

---

## Step 2: Add State for Series Dialog

Add this state near your other state declarations (around line 45):

```typescript
const [showCreateSeriesDialog, setShowCreateSeriesDialog] = useState(false)
```

---

## Step 3: Add Series Tab

Find the `tabs` array (search for `const tabs =`) and add the series tab:

```typescript
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'series', label: 'Series' },  // ← Add this
  { id: 'wristbands', label: 'Wristbands' },
  { id: 'gates', label: 'Gates' },
  // ... rest of tabs
]
```

---

## Step 4: Add Series Content Section

Find where the tab content is rendered (search for `activeTab === 'overview'`) and add this section:

```typescript
{/* SERIES TAB */}
{activeTab === 'series' && (
  <div className="space-y-6">
    <SeriesManagement
      eventId={id!}
      eventName={event?.name || ''}
      onCreateSeries={() => setShowCreateSeriesDialog(true)}
    />
  </div>
)}
```

---

## Step 5: Add the Create Series Dialog

Add this at the end of your component, before the closing `</div>` or fragment:

```typescript
{/* Create Series Dialog */}
{showCreateSeriesDialog && (
  <CreateSeriesDialog
    eventId={id!}
    eventName={event?.name || ''}
    isOpen={showCreateSeriesDialog}
    onClose={() => setShowCreateSeriesDialog(false)}
    onSuccess={() => {
      // Refresh the series list by re-rendering
      setActiveTab('series')
    }}
  />
)}
```

---

## Complete Integration Example

Here's a complete example of how your EventDetailsPage should look after integration:

```typescript
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
// ... other imports ...

// ADD THESE IMPORTS
import SeriesManagement from '../components/events/SeriesManagement'
import CreateSeriesDialog from '../components/events/CreateSeriesDialog'

const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>()

  // ... existing state ...
  const [activeTab, setActiveTab] = useState('overview')

  // ADD THIS STATE
  const [showCreateSeriesDialog, setShowCreateSeriesDialog] = useState(false)

  // ... rest of component logic ...

  // MODIFY tabs array to include 'series'
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'series', label: 'Series' },  // ← Add this
    { id: 'wristbands', label: 'Wristbands' },
    { id: 'gates', label: 'Gates' },
    // ... rest of tabs
  ]

  return (
    <div>
      {/* ... existing header and navigation ... */}

      {/* Tab Navigation */}
      <div>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div>
            {/* Overview content */}
          </div>
        )}

        {/* ADD THIS SECTION */}
        {activeTab === 'series' && (
          <div className="space-y-6">
            <SeriesManagement
              eventId={id!}
              eventName={event?.name || ''}
              onCreateSeries={() => setShowCreateSeriesDialog(true)}
            />
          </div>
        )}

        {activeTab === 'wristbands' && (
          <div>
            {/* Wristbands content */}
          </div>
        )}

        {/* ... rest of tabs ... */}
      </div>

      {/* ADD THIS AT THE END */}
      {showCreateSeriesDialog && (
        <CreateSeriesDialog
          eventId={id!}
          eventName={event?.name || ''}
          isOpen={showCreateSeriesDialog}
          onClose={() => setShowCreateSeriesDialog(false)}
          onSuccess={() => {
            setActiveTab('series')
          }}
        />
      )}
    </div>
  )
}

export default EventDetailsPage
```

---

## Step 6: Add "Add to Series" to Wristbands Page

### Option A: Add to Wristbands Bulk Actions

If you have a wristbands page/component with bulk actions:

1. **Import the component:**
```typescript
import AddToSeriesBulkAction from '../components/wristbands/AddToSeriesBulkAction'
```

2. **Add state:**
```typescript
const [selectedWristbandIds, setSelectedWristbandIds] = useState<string[]>([])
const [showAddToSeriesDialog, setShowAddToSeriesDialog] = useState(false)
```

3. **Add checkbox selection to your wristbands table:**
```typescript
<input
  type="checkbox"
  checked={selectedWristbandIds.includes(wristband.id)}
  onChange={(e) => {
    if (e.target.checked) {
      setSelectedWristbandIds([...selectedWristbandIds, wristband.id])
    } else {
      setSelectedWristbandIds(selectedWristbandIds.filter(id => id !== wristband.id))
    }
  }}
/>
```

4. **Add "Add to Series" button** (show when items are selected):
```typescript
{selectedWristbandIds.length > 0 && (
  <button
    onClick={() => setShowAddToSeriesDialog(true)}
    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  >
    Add {selectedWristbandIds.length} to Series
  </button>
)}
```

5. **Add the dialog:**
```typescript
{showAddToSeriesDialog && (
  <AddToSeriesBulkAction
    eventId={eventId}
    selectedWristbandIds={selectedWristbandIds}
    isOpen={showAddToSeriesDialog}
    onClose={() => setShowAddToSeriesDialog(false)}
    onSuccess={() => {
      setSelectedWristbandIds([])
      // Refresh wristbands list
    }}
  />
)}
```

### Option B: Add to Wristbands Actions Menu

If you have an actions dropdown menu per wristband:

```typescript
<button onClick={() => {
  setSelectedWristbandIds([wristband.id])
  setShowAddToSeriesDialog(true)
}}>
  Add to Series
</button>
```

---

## Step 7: Verify Integration

### Test Checklist:

1. ✅ Navigate to any event
2. ✅ Click the "Series" tab
3. ✅ See "No Series Yet" message if none exist
4. ✅ Click "Create Your First Series"
5. ✅ Fill out the form and create a series
6. ✅ See the series appear in the nested table with smaller font
7. ✅ Expand/collapse series to see details
8. ✅ Go to Wristbands tab
9. ✅ Select wristbands
10. ✅ Click "Add to Series" bulk action
11. ✅ Select a series and assign
12. ✅ Verify wristbands are assigned

---

## Visual Structure

After integration, your event detail page will look like this:

```
┌─────────────────────────────────────────────┐
│ EVENT NAME                                  │
│ [Overview] [Series] [Wristbands] [Gates]... │
└─────────────────────────────────────────────┘

When "Series" tab is clicked:
┌─────────────────────────────────────────────┐
│ Event Series                    [+ Add Series]│
│ ───────────────────────────────────────────  │
│                                               │
│ ▼ #1  Day 1 - Friday    [active] [standard]  │
│       June 1, 2024 6:00 PM - 2:00 AM         │
│       📍 Main Stage  👥 Capacity: 5,000      │
│                                               │
│       [Expanded View Showing Details]        │
│       Check-in Window: 2 hours before...     │
│       [Manage Gates] [Manage Categories]...  │
│                                               │
│ ▶ #2  Day 2 - Saturday  [scheduled] [...]    │
│       June 2, 2024 6:00 PM - 2:00 AM         │
│                                               │
│ ▶ #3  VIP After Party   [scheduled] [...]    │
│       June 3, 2024 10:00 PM - 2:00 AM        │
└─────────────────────────────────────────────┘
```

---

## Important Notes

### Font Size Hierarchy
The components are already styled with proper font hierarchy:
- **Main Event Title**: `text-xl` or `text-2xl` (large)
- **Series Names**: `text-base` (medium - smaller than parent)
- **Series Details**: `text-sm` and `text-xs` (smaller)

### Independent Access Control
- ✅ Adding wristbands to the main event does **NOT** grant access to series
- ✅ You must explicitly assign wristbands to each series using "Add to Series"
- ✅ This is by design for granular access control

### Check-in Behavior
When scanning a wristband:
1. Scanner shows all active series (within check-in window)
2. Staff selects which series to check into
3. System verifies wristband is assigned to that series
4. If not assigned → Access denied with clear message
5. If assigned → Check-in successful

---

## Next Steps

After integration, you may want to:

1. **Add Series Analytics** - Show check-in stats per series
2. **Add Gates to Series** - Assign specific gates to series
3. **Add Category Limits to Series** - Set capacity per category per series
4. **Create Series Templates** - Save and reuse series configurations
5. **Enable Recurring Series** - Auto-generate weekly/monthly series

Refer to the [Comprehensive Event Series Guide](./COMPREHENSIVE_EVENT_SERIES_GUIDE.md) for advanced features!

---

## Troubleshooting

### Series tab is blank
- Check browser console for errors
- Verify the migration ran successfully
- Ensure `eventId` is being passed correctly

### Can't create series
- Check RLS policies with: `SELECT * FROM pg_policies WHERE tablename = 'event_series'`
- Verify user is member of the organization

### Wristbands not appearing in "Add to Series"
- Ensure wristbands belong to the same event
- Check that series is active or scheduled (not draft)

### Series not showing in scanner
- Verify series is within check-in window
- Check `lifecycle_status` is 'active'
- Use `is_series_within_checkin_window()` function to debug

---

## Support

For more help:
- See [Quick Start Guide](./EVENT_SERIES_QUICK_START.md)
- See [Comprehensive Guide](./COMPREHENSIVE_EVENT_SERIES_GUIDE.md)
- See [Architecture Docs](./EVENT_SERIES_ARCHITECTURE.md)

**You're all set! 🎉**
