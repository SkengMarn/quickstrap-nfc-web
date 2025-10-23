# Comprehensive Event Series System Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Installation](#installation)
5. [API Usage](#api-usage)
6. [Use Cases](#use-cases)
7. [Best Practices](#best-practices)

---

## Overview

The **Comprehensive Event Series System** allows you to create sub-events (series) that extend a main event. This is perfect for:

- **Multi-day festivals** (Day 1, Day 2, Day 3)
- **Tournament brackets** (Quarter Finals, Semi Finals, Finals)
- **Season passes** (Home Game 1, Home Game 2, etc.)
- **Recurring events** (Weekly concerts, Monthly meetups)
- **VIP sessions** within larger events

### Key Features

✅ **Full Independence**: Each series has its own gates, categories, capacity, and check-in windows
✅ **Recurring Series**: Automatically generate multiple instances of a series
✅ **Advanced Access Control**: Granular wristband assignments per series
✅ **Real-time Analytics**: Dedicated metrics and analytics per series
✅ **Templates**: Reusable configurations for common series patterns
✅ **Lifecycle Management**: Independent status tracking (draft → scheduled → active → completed)
✅ **Location Override**: Series can have different venues from the main event

---

## Architecture

### Conceptual Model

```
Organization
  └── Main Event (e.g., "2024 Music Festival")
       ├── Event Gates (Main entrance, VIP entrance)
       ├── Event Categories (General, VIP, Staff)
       └── Event Series
            ├── Series 1: "Day 1 - Friday"
            │    ├── Series-specific Gates
            │    ├── Series-specific Categories
            │    ├── Assigned Wristbands
            │    └── Check-in Window
            ├── Series 2: "Day 2 - Saturday"
            └── Series 3: "VIP After Party"
```

### Data Flow

```
1. User creates Main Event
2. User creates Series for Main Event
3. User assigns:
   - Gates to Series (which gates are active for this series)
   - Categories to Series (capacity limits per category)
   - Wristbands to Series (who can access this series)
4. Check-in happens at Series level
5. Analytics computed per Series
```

---

## Database Schema

### Core Tables

#### 1. `event_series`
Main table storing all series data.

```sql
CREATE TABLE public.event_series (
  id uuid PRIMARY KEY,
  main_event_id uuid NOT NULL REFERENCES events(id),
  name text NOT NULL,
  description text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,

  -- Check-in windows
  checkin_window_start_offset interval DEFAULT '2 hours',
  checkin_window_end_offset interval DEFAULT '2 hours',

  -- Lifecycle
  lifecycle_status text DEFAULT 'draft',
  status_changed_at timestamptz,
  status_changed_by uuid,
  auto_transition_enabled boolean DEFAULT true,

  -- Configuration
  sequence_number integer,
  series_type text DEFAULT 'standard',
  location text,
  venue_id uuid REFERENCES venues(id),
  capacity integer,

  -- Recurring support
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,
  parent_series_id uuid REFERENCES event_series(id),

  -- Visibility
  is_public boolean DEFAULT false,
  requires_separate_ticket boolean DEFAULT false,

  organization_id uuid NOT NULL REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
```

#### 2. `series_gates`
Maps gates to specific series.

```sql
CREATE TABLE public.series_gates (
  id uuid PRIMARY KEY,
  series_id uuid NOT NULL REFERENCES event_series(id),
  gate_id uuid NOT NULL REFERENCES gates(id),
  is_active boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(series_id, gate_id)
);
```

#### 3. `series_category_limits`
Category-specific capacity limits for each series.

```sql
CREATE TABLE public.series_category_limits (
  id uuid PRIMARY KEY,
  series_id uuid NOT NULL REFERENCES event_series(id),
  category text NOT NULL,
  max_wristbands integer DEFAULT 1,
  max_capacity integer,
  current_count integer DEFAULT 0,
  requires_ticket boolean DEFAULT false,
  price numeric(10,2),
  UNIQUE(series_id, category)
);
```

#### 4. `series_wristband_assignments`
Assigns wristbands to specific series with validation.

```sql
CREATE TABLE public.series_wristband_assignments (
  id uuid PRIMARY KEY,
  series_id uuid NOT NULL REFERENCES event_series(id),
  wristband_id uuid NOT NULL REFERENCES wristbands(id),
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,

  -- Validation
  validation_status text DEFAULT 'pending',
  validated_at timestamptz,
  validated_by uuid,

  -- Access tracking
  first_checkin_at timestamptz,
  last_checkin_at timestamptz,
  checkin_count integer DEFAULT 0,

  UNIQUE(series_id, wristband_id)
);
```

#### 5. `series_metrics_cache`
Cached analytics for performance.

```sql
CREATE TABLE public.series_metrics_cache (
  id uuid PRIMARY KEY,
  series_id uuid NOT NULL UNIQUE REFERENCES event_series(id),
  total_wristbands integer DEFAULT 0,
  total_checkins integer DEFAULT 0,
  unique_attendees integer DEFAULT 0,
  checkin_rate numeric DEFAULT 0,
  peak_hour timestamptz,
  peak_hour_checkins integer DEFAULT 0,
  last_computed_at timestamptz DEFAULT now()
);
```

#### 6. `series_templates`
Reusable series configurations.

```sql
CREATE TABLE public.series_templates (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  description text,
  template_type text DEFAULT 'single',

  -- Defaults
  default_series_type text DEFAULT 'standard',
  default_checkin_window_start interval DEFAULT '2 hours',
  default_checkin_window_end interval DEFAULT '2 hours',
  default_capacity integer,

  -- Template configurations
  categories jsonb DEFAULT '[]',
  gate_configurations jsonb DEFAULT '[]',
  recurrence_pattern jsonb,

  is_public boolean DEFAULT false,
  usage_count integer DEFAULT 0
);
```

### Helper Functions

#### `is_series_within_checkin_window(series_id)`
Returns `true` if the series is currently within its check-in window.

#### `get_active_series_for_event(event_id)`
Returns all active series for an event that are currently scannable.

#### `compute_series_metrics(series_id)`
Computes and returns real-time metrics for a series.

#### `create_recurring_series_instances(parent_series_id, occurrences)`
Creates N instances of a recurring series.

### Views

#### `series_overview`
Comprehensive view with all series data and aggregated counts.

#### `series_with_metrics`
Combines series data with cached metrics.

---

## Installation

### Step 1: Run the Migration

```bash
# Connect to your database
psql $DATABASE_URL -f database/migrations/comprehensive_event_series_system.sql
```

Or via Supabase:

```bash
supabase db execute --file database/migrations/comprehensive_event_series_system.sql
```

### Step 2: Verify Installation

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%series%';

-- Should return:
-- event_series
-- series_gates
-- series_category_limits
-- series_wristband_assignments
-- series_metrics_cache
-- series_templates
-- series_state_transitions
-- series_tickets
```

### Step 3: Grant Permissions

Permissions are automatically granted during migration, but verify:

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename LIKE '%series%';
```

---

## API Usage

### TypeScript Service

Import the enhanced service:

```typescript
import { enhancedSeriesService } from '@/services/enhancedSeriesService';
import type { CreateSeriesRequest, SeriesLifecycleStatus } from '@/types/series';
```

### 1. Create a Series

```typescript
// Basic series creation
const result = await enhancedSeriesService.createSeries({
  main_event_id: 'event-uuid',
  name: 'Day 1 - Friday',
  description: 'First day of the festival',
  start_date: '2024-06-01T18:00:00Z',
  end_date: '2024-06-02T02:00:00Z',
  checkin_window_start_offset: '2 hours',
  checkin_window_end_offset: '1 hour',
  series_type: 'standard',
  capacity: 5000,
  sequence_number: 1,
});

if (result.error) {
  console.error('Failed to create series:', result.error);
} else {
  console.log('Series created:', result.data);
}
```

### 2. Get All Series for an Event

```typescript
const result = await enhancedSeriesService.getSeriesForEvent(
  'event-uuid',
  {
    lifecycle_status: ['scheduled', 'active'],
    series_type: 'standard',
  },
  {
    order_by: 'sequence_number',
    order_direction: 'asc',
  }
);

console.log('Series:', result.data);
```

### 3. Assign Gates to Series

```typescript
const result = await enhancedSeriesService.assignGatesToSeries(
  'series-uuid',
  ['gate-1-uuid', 'gate-2-uuid', 'gate-3-uuid']
);

console.log('Gates assigned:', result.data);
```

### 4. Set Category Limits

```typescript
const result = await enhancedSeriesService.setSeriesCategoryLimits('series-uuid', [
  {
    category: 'General Admission',
    max_wristbands: 4000,
    max_capacity: 4000,
    requires_ticket: true,
  },
  {
    category: 'VIP',
    max_wristbands: 1000,
    max_capacity: 1000,
    requires_ticket: true,
    price: 199.99,
  },
]);
```

### 5. Assign Wristbands to Series

```typescript
// Individual assignment
const result1 = await enhancedSeriesService.assignWristbandsToSeries({
  series_id: 'series-uuid',
  wristband_ids: ['wb-1', 'wb-2', 'wb-3'],
});

// Bulk assignment by category
const result2 = await enhancedSeriesService.bulkAssignByCategory({
  series_id: 'series-uuid',
  event_id: 'event-uuid',
  categories: ['VIP', 'Press'],
});

// Bulk assignment by ticket numbers
const result3 = await enhancedSeriesService.bulkAssignByTickets({
  series_id: 'series-uuid',
  event_id: 'event-uuid',
  ticket_numbers: ['TKT-001', 'TKT-002', 'TKT-003'],
});
```

### 6. Create Recurring Series

```typescript
// First, create a parent series with recurrence pattern
const parentResult = await enhancedSeriesService.createSeries({
  main_event_id: 'event-uuid',
  name: 'Weekly Concert Series',
  start_date: '2024-06-01T20:00:00Z',
  end_date: '2024-06-01T23:00:00Z',
  is_recurring: true,
  recurrence_pattern: {
    type: 'weekly',
    interval: 1,
    end_after_occurrences: 12,
  },
});

// Then create instances
if (parentResult.data) {
  const instancesResult = await enhancedSeriesService.createRecurringInstances({
    parent_series_id: parentResult.data.id,
    occurrences: 12,
  });

  console.log('Created instances:', instancesResult.data);
}
```

### 7. Change Series Status

```typescript
const result = await enhancedSeriesService.changeSeriesStatus(
  'series-uuid',
  'active',
  'Event started, activating series'
);
```

### 8. Get Series Metrics

```typescript
// Get cached metrics
const metricsResult = await enhancedSeriesService.getSeriesMetrics('series-uuid');

// Compute fresh metrics
const computeResult = await enhancedSeriesService.computeSeriesMetrics('series-uuid');

// Get series with metrics
const withMetricsResult = await enhancedSeriesService.getSeriesWithMetrics('series-uuid');
```

### 9. Check Access During Scan

```typescript
// Check if wristband can access series
const verification = await enhancedSeriesService.verifyWristbandAccess(
  'wristband-uuid',
  'series-uuid'
);

if (verification.data?.valid) {
  console.log('Access granted:', verification.data.message);
  // Proceed with check-in
} else {
  console.log('Access denied:', verification.data?.message);
  console.log('Reason:', verification.data?.reason);
}
```

### 10. Get Scannable Items

```typescript
// Get all currently scannable items (events + series within check-in window)
const result = await enhancedSeriesService.getScannableItems('org-uuid');

result.data?.forEach((item) => {
  console.log(`${item.item_type}: ${item.item_name}`);
  console.log(`Window: ${item.window_start} to ${item.window_end}`);
});
```

---

## Use Cases

### Use Case 1: Multi-Day Music Festival

```typescript
// Create main event
const mainEvent = await createEvent({
  name: '2024 Summer Music Festival',
  start_date: '2024-07-01T00:00:00Z',
  end_date: '2024-07-03T23:59:59Z',
});

// Create series for each day
const day1 = await enhancedSeriesService.createSeries({
  main_event_id: mainEvent.id,
  name: 'Day 1 - Friday',
  start_date: '2024-07-01T12:00:00Z',
  end_date: '2024-07-02T02:00:00Z',
  sequence_number: 1,
});

const day2 = await enhancedSeriesService.createSeries({
  main_event_id: mainEvent.id,
  name: 'Day 2 - Saturday',
  start_date: '2024-07-02T12:00:00Z',
  end_date: '2024-07-03T02:00:00Z',
  sequence_number: 2,
});

const day3 = await enhancedSeriesService.createSeries({
  main_event_id: mainEvent.id,
  name: 'Day 3 - Sunday',
  start_date: '2024-07-03T12:00:00Z',
  end_date: '2024-07-03T23:00:00Z',
  sequence_number: 3,
});

// Assign wristbands
// 3-day pass holders get access to all series
await enhancedSeriesService.bulkAssignByCategory({
  series_id: day1.data!.id,
  event_id: mainEvent.id,
  categories: ['3-Day Pass', 'VIP 3-Day'],
});
// ... repeat for day2, day3

// Single day pass holders get access to specific day
await enhancedSeriesService.bulkAssignByCategory({
  series_id: day1.data!.id,
  event_id: mainEvent.id,
  categories: ['Friday Only'],
});
```

### Use Case 2: Tournament with Knockout Rounds

```typescript
// Quarter Finals
const quarterFinals = await enhancedSeriesService.createSeries({
  main_event_id: tournament.id,
  name: 'Quarter Finals',
  series_type: 'knockout',
  start_date: '2024-08-15T10:00:00Z',
  end_date: '2024-08-15T18:00:00Z',
  sequence_number: 1,
});

// Semi Finals
const semiFinals = await enhancedSeriesService.createSeries({
  main_event_id: tournament.id,
  name: 'Semi Finals',
  series_type: 'knockout',
  start_date: '2024-08-16T10:00:00Z',
  end_date: '2024-08-16T18:00:00Z',
  sequence_number: 2,
});

// Finals
const finals = await enhancedSeriesService.createSeries({
  main_event_id: tournament.id,
  name: 'Finals',
  series_type: 'knockout',
  start_date: '2024-08-17T14:00:00Z',
  end_date: '2024-08-17T20:00:00Z',
  sequence_number: 3,
});
```

### Use Case 3: VIP Sessions within Main Event

```typescript
// VIP Pre-Party
const vipPreParty = await enhancedSeriesService.createSeries({
  main_event_id: mainEvent.id,
  name: 'VIP Pre-Party',
  start_date: '2024-06-01T17:00:00Z',
  end_date: '2024-06-01T20:00:00Z',
  requires_separate_ticket: true,
  capacity: 200,
});

// Set VIP-only category
await enhancedSeriesService.setSeriesCategoryLimits(vipPreParty.data!.id, [
  {
    category: 'VIP',
    max_wristbands: 200,
    requires_ticket: true,
  },
]);

// Assign only VIP wristbands
await enhancedSeriesService.bulkAssignByCategory({
  series_id: vipPreParty.data!.id,
  event_id: mainEvent.id,
  categories: ['VIP'],
});
```

### Use Case 4: Recurring Weekly Events

```typescript
// Create recurring parent
const weeklyEvent = await enhancedSeriesService.createSeries({
  main_event_id: season.id,
  name: 'Thursday Night Games',
  start_date: '2024-09-05T19:00:00Z',
  end_date: '2024-09-05T22:00:00Z',
  is_recurring: true,
  recurrence_pattern: {
    type: 'weekly',
    interval: 1,
    days_of_week: [4], // Thursday
    end_after_occurrences: 16, // 16 weeks
  },
});

// Generate all instances
const instances = await enhancedSeriesService.createRecurringInstances({
  parent_series_id: weeklyEvent.data!.id,
  occurrences: 16,
});

console.log(`Created ${instances.successful_count} weekly instances`);
```

---

## Best Practices

### 1. Series Naming Convention

Use clear, descriptive names:
- ✅ "Day 1 - Friday"
- ✅ "Quarter Finals - Match 1"
- ✅ "VIP After Party"
- ❌ "Series 1"
- ❌ "Event Part A"

### 2. Check-in Window Configuration

Set appropriate windows based on event type:

```typescript
// Large festivals - wide windows
checkin_window_start_offset: '4 hours',  // Can check in 4h early
checkin_window_end_offset: '2 hours',    // Grace period of 2h

// Strict events - narrow windows
checkin_window_start_offset: '30 minutes',
checkin_window_end_offset: '0 minutes',
```

### 3. Lifecycle Management

Always transition series through proper lifecycle:

```typescript
// When creating
lifecycle_status: 'draft'

// When ready and tested
await changeSeriesStatus(id, 'scheduled', 'Series is ready');

// When check-in window opens (can be automatic)
await changeSeriesStatus(id, 'active', 'Check-in window opened');

// When event ends
await changeSeriesStatus(id, 'completed', 'Event finished');
```

### 4. Wristband Assignment Strategy

**Option A: Pre-assign everything**
- Assign all wristbands to series during event setup
- Faster check-ins (no real-time lookups)
- Better for large events

**Option B: Dynamic assignment**
- Assign wristbands as tickets are sold
- More flexible
- Better for evolving events

### 5. Gate Configuration

Assign gates strategically:

```typescript
// Main event gates - used for all series
await createGate({ event_id: mainEvent.id, name: 'Main Entrance' });

// Series-specific gates
await createGate({
  event_id: mainEvent.id,
  series_id: vipSeries.id,
  name: 'VIP Entrance'
});

// Then assign to series
await enhancedSeriesService.assignGatesToSeries(series.id, [gate1, gate2]);
```

### 6. Analytics & Monitoring

Compute metrics regularly:

```typescript
// Schedule a job to update metrics every 5 minutes during active events
setInterval(async () => {
  const activeSeries = await getActiveSeries();
  for (const series of activeSeries) {
    await enhancedSeriesService.computeSeriesMetrics(series.id);
  }
}, 5 * 60 * 1000);
```

### 7. Template Usage

Create templates for common patterns:

```typescript
// Create a "multi-day festival" template once
const template = await createTemplate({
  name: 'Multi-Day Festival Day',
  categories: [
    { name: 'General', max: 5000 },
    { name: 'VIP', max: 500 },
  ],
  gate_configurations: [
    { name: 'Main Gate', type: 'entry' },
    { name: 'VIP Gate', type: 'entry' },
  ],
});

// Reuse for each day
const day1 = await enhancedSeriesService.createFromTemplate(template.id, {
  main_event_id: event.id,
  name: 'Day 1',
  start_date: '...',
  end_date: '...',
});
```

### 8. Error Handling

Always handle errors gracefully:

```typescript
const result = await enhancedSeriesService.createSeries(data);

if (result.error) {
  // Log error
  console.error('Series creation failed:', result.error);

  // Show user-friendly message
  toast.error('Failed to create series. Please try again.');

  // Optionally retry with exponential backoff
  return;
}

// Success
toast.success('Series created successfully!');
navigate(`/series/${result.data.id}`);
```

### 9. Performance Optimization

Use cached metrics when possible:

```typescript
// ✅ Fast - uses cached data
const metrics = await enhancedSeriesService.getSeriesMetrics(seriesId);

// ❌ Slow - computes on-demand
const metrics = await enhancedSeriesService.computeSeriesMetrics(seriesId);

// ✅ Best - get series with metrics in one call
const seriesWithMetrics = await enhancedSeriesService.getSeriesWithMetrics(seriesId);
```

### 10. Security & Access Control

RLS policies are automatically applied, but verify permissions in your UI:

```typescript
// Check user role before allowing series creation
if (userRole === 'owner' || userRole === 'admin') {
  // Allow series management
} else {
  // Read-only access
}
```

---

## Conclusion

The Comprehensive Event Series System provides everything you need to manage complex multi-series events with full independence, granular control, and powerful analytics.

For questions or support, please refer to the main system documentation or contact your administrator.

**Happy event management! 🎉**
