# Deep Dive: Key Architectural Differences Between Main Events and Series

## Fundamental Conceptual Difference

### Main Event = **Container & Policy Maker**
- **Purpose**: Define the overall event scope, rules, and boundaries
- **Role**: Parent entity that owns all resources (wristbands, tickets, gates)
- **Lifespan**: Has a complete lifecycle (draft → active → completed → archived)
- **Autonomy**: Fully independent, can exist without series

### Series = **Time Slice & Policy Consumer**
- **Purpose**: Represent specific time windows within the main event
- **Role**: Child entity that references parent's resources
- **Lifespan**: Simple on/off state (is_active), no complex lifecycle
- **Dependency**: Cannot exist without a main event

---

## Deep Dive #1: Check-in Window Philosophy

### Why the Difference Matters

#### Main Event: **Absolute Time Windows**
```typescript
checkin_window: {
  enabled: true,
  start_time: "2025-07-15T16:00:00Z",  // Fixed calendar date/time
  end_time: "2025-07-17T23:59:59Z"     // Fixed calendar date/time
}
```

**Design Rationale**:
- Main events are **fixed points in time**
- The event organizer knows exactly when the event runs
- Check-in window is a **business decision** (e.g., "gates open at 4 PM")
- Doesn't change based on event duration

**Real-World Example**:
```
Concert: July 15, 2025, 7:00 PM - 11:00 PM
Check-in window: July 15, 4:00 PM - July 16, 1:00 AM

→ Gates open 3 hours before concert
→ Gates stay open 2 hours after concert ends
→ These are FIXED times regardless of concert duration
```

#### Series: **Relative Time Offsets**
```typescript
checkin_window_start_offset: "2 hours"  // Relative to series start
checkin_window_end_offset: "2 hours"    // Relative to series end
```

**Design Rationale**:
- Series are **repeating patterns** (Matchday 1, 2, 3...)
- Each series has different start times but **same check-in policy**
- Offsets are **operational rules** (e.g., "always open 2 hours before")
- Scales automatically as you add more series

**Real-World Example**:
```
Tournament with 10 matches:
- Match 1: Aug 1, 6:00 PM - 8:00 PM
- Match 2: Aug 2, 6:00 PM - 8:00 PM
- Match 3: Aug 3, 2:00 PM - 4:00 PM  (Different time!)
- ... (7 more matches)

Check-in offset: 2 hours before, 1 hour after

→ Match 1: Check-in 4:00 PM - 9:00 PM
→ Match 2: Check-in 4:00 PM - 9:00 PM
→ Match 3: Check-in 12:00 PM - 5:00 PM  (Auto-adjusts!)

You set the rule ONCE, applies to ALL series automatically.
```

**Why This Is Powerful**:
```typescript
// Without offsets (absolute times) - you'd need to configure each series:
Series 1: { start: "4:00 PM", end: "9:00 PM" }
Series 2: { start: "4:00 PM", end: "9:00 PM" }
Series 3: { start: "12:00 PM", end: "5:00 PM" }  // Manual calculation!
// ... repeat 10 times, error-prone

// With offsets - one rule for all:
All Series: { start_offset: "2 hours", end_offset: "1 hour" }
// System calculates automatically based on each series' actual times
```

---

## Deep Dive #2: Ticket Linking Inheritance vs Override

### The "Inherit" Mode - Why It Exists

#### Problem Without Inheritance:
```typescript
// Main Event: 100 series in a tournament
// If you want all series to require tickets:

// BAD: Manual configuration for each series
Series 1: { ticket_linking_mode: "required" }
Series 2: { ticket_linking_mode: "required" }
Series 3: { ticket_linking_mode: "required" }
// ... repeat 100 times

// What if you change your mind? Update 100 series manually!
```

#### Solution With Inheritance:
```typescript
// Main Event
{ ticket_linking_mode: "required" }

// All 100 Series
{ ticket_linking_mode: "inherit" }  // Default

// Change main event → all series update automatically
// Zero manual updates needed
```

### Override Scenarios - When and Why

#### Scenario 1: **More Restrictive Series**
```typescript
Main Event: "Tech Conference 2025"
ticket_linking_mode: "optional"  // Most sessions are flexible

Series 1-20: General Sessions
config: { ticket_linking_mode: "inherit" }  // Uses "optional"

Series 21: "CEO Keynote - Limited Capacity"
config: { ticket_linking_mode: "required" }  // Override to REQUIRED
// Reason: VIP session, must control capacity strictly
```

**Why This Works**:
- Main event policy is lenient (optional)
- Most series inherit the lenient policy
- Special series can be MORE strict when needed
- Doesn't affect other series

#### Scenario 2: **More Permissive Series**
```typescript
Main Event: "Premium Championship"
ticket_linking_mode: "required"  // Paid event, strict control

Series 1-8: Championship Matches
config: { ticket_linking_mode: "inherit" }  // Uses "required"

Series 9: "Fan Meet & Greet"
config: { ticket_linking_mode: "disabled" }  // Override to DISABLED
// Reason: Free community event, open to all
```

**Why This Works**:
- Main event policy is strict (required)
- Championship matches maintain strict policy
- Community event can be MORE lenient
- Doesn't compromise championship ticket requirements

#### Scenario 3: **Mixed Requirements**
```typescript
Main Event: "Music Festival 2025"
ticket_linking_mode: "optional"  // Default flexibility

Friday (Series 1):
config: { ticket_linking_mode: "disabled" }
// Free preview night, attract crowd

Saturday (Series 2):
config: { ticket_linking_mode: "inherit" }  // Uses "optional"
// Main festival day, flexible

Sunday VIP (Series 3):
config: { 
  ticket_linking_mode: "required",
  capacity_settings: { max_capacity: 500 }
}
// Exclusive session, strict control
```

### The Technical Implementation

#### How Inheritance Works in Database:
```sql
-- Function: get_series_ticket_linking_mode(series_id)

-- Step 1: Check series config
SELECT config->>'ticket_linking_mode' FROM event_series WHERE id = series_id;
-- Returns: "inherit" | "disabled" | "optional" | "required" | NULL

-- Step 2: If "inherit" or NULL, fetch from main event
IF result = 'inherit' OR result IS NULL THEN
  SELECT ticket_linking_mode FROM events 
  WHERE id = (SELECT main_event_id FROM event_series WHERE id = series_id);
END IF;

-- Step 3: Return effective mode
RETURN effective_mode;
```

**Example Execution**:
```sql
-- Series with inherit
Series Config: { ticket_linking_mode: "inherit" }
Main Event: { ticket_linking_mode: "required" }
→ Effective Mode: "required"

-- Series with override
Series Config: { ticket_linking_mode: "disabled" }
Main Event: { ticket_linking_mode: "required" }
→ Effective Mode: "disabled"  (override wins!)
```

---

## Deep Dive #3: Date Extension - The Auto-Adjust Magic

### Why Series Can Extend Main Event Dates

#### The Problem:
```
You're planning a tournament:
Main Event: Aug 1-10 (10 days)

You create 8 matches, then realize you need 2 more:
Match 9: Aug 11 (OUTSIDE main event!)
Match 10: Aug 12 (OUTSIDE main event!)

Traditional approach: 
1. Go back to main event
2. Manually change end date to Aug 12
3. Then create series
→ Tedious, error-prone
```

#### The QuickStrap Solution:
```typescript
// You create Series 9 with end_date: Aug 11
// System detects: Series ends AFTER main event (Aug 10)
// System automatically: Updates main event end_date to Aug 11
// You see: Warning message + auto-adjustment confirmation

// You create Series 10 with end_date: Aug 12
// System detects: Series ends AFTER current main event (Aug 11)
// System automatically: Updates main event end_date to Aug 12
// Result: Main event now spans Aug 1-12 automatically
```

### The Technical Flow

```typescript
// In SeriesForm.tsx - handleSubmit()

// 1. User submits series with dates
const seriesStart = new Date("2025-08-11T18:00");
const seriesEnd = new Date("2025-08-11T20:00");

// 2. System fetches main event
const mainEvent = {
  start_date: "2025-08-01T00:00",
  end_date: "2025-08-10T23:59"  // Series extends beyond this!
};

// 3. System detects extension needed
const needsEndAdjustment = seriesEnd > new Date(mainEvent.end_date);
// → true

// 4. System shows warning BEFORE creating
setDateWarning(
  "This series extends beyond the main event end date. " +
  "Main event will be automatically extended to Aug 11, 8:00 PM"
);

// 5. User confirms and submits

// 6. System creates series FIRST
await eventSeriesService.createSeries(seriesData);

// 7. System updates main event SECOND
await supabase
  .from('events')
  .update({ end_date: seriesEnd.toISOString() })
  .eq('id', mainEventId);

// 8. User sees success message
toast.success(
  "Series created successfully! Main event adjusted: ends Aug 11"
);
```

### Why This Matters

**Without Auto-Extension**:
```
User workflow:
1. Create main event (Aug 1-10)
2. Create 8 series (all within Aug 1-10) ✓
3. Try to create series 9 (Aug 11) ✗ ERROR: "Series outside event dates"
4. Go back to main event
5. Edit end date to Aug 11
6. Save main event
7. Go back to series
8. Create series 9 ✓
9. Try to create series 10 (Aug 12) ✗ ERROR again!
10. Repeat steps 4-7...

→ Frustrating, time-consuming
```

**With Auto-Extension**:
```
User workflow:
1. Create main event (Aug 1-10)
2. Create 8 series (all within Aug 1-10) ✓
3. Create series 9 (Aug 11) ✓ Auto-extends to Aug 11
4. Create series 10 (Aug 12) ✓ Auto-extends to Aug 12

→ Seamless, intuitive
```

---

## Deep Dive #4: Sequence Number Auto-Assignment

### The Problem It Solves

#### Without Auto-Sequencing:
```typescript
// Manual sequence assignment
Series 1: { name: "Matchday 1", sequence: 1, start: "Aug 1, 6 PM" }
Series 2: { name: "Matchday 2", sequence: 2, start: "Aug 2, 6 PM" }
Series 3: { name: "Matchday 3", sequence: 3, start: "Aug 3, 6 PM" }

// Oops! Need to insert a series between 2 and 3
Series 2.5: { name: "Special Match", sequence: ?, start: "Aug 2, 9 PM" }

// Now you need to:
1. Set new series sequence to 3
2. Update old series 3 to sequence 4
3. Update all subsequent series...
→ Nightmare!
```

#### With Auto-Sequencing:
```typescript
// System assigns based on start_date + name (alphabetically)
Series 1: { name: "Matchday 1", start: "Aug 1, 6 PM" }  → Sequence: 1
Series 2: { name: "Matchday 2", start: "Aug 2, 6 PM" }  → Sequence: 2
Series 3: { name: "Matchday 3", start: "Aug 3, 6 PM" }  → Sequence: 3

// Insert new series
Series 2.5: { name: "Special Match", start: "Aug 2, 9 PM" }

// System automatically calculates:
Aug 1, 6 PM: Matchday 1 → Sequence: 1
Aug 2, 6 PM: Matchday 2 → Sequence: 2
Aug 2, 9 PM: Special Match → Sequence: 3  (Auto-assigned!)
Aug 3, 6 PM: Matchday 3 → Sequence: 4  (Auto-updated!)

→ Zero manual work!
```

### The Algorithm

```typescript
// From SeriesForm.tsx - useEffect for auto-sequencing

// 1. Get all ACTIVE/UPCOMING series (exclude completed)
const activeSeries = existingSeries.filter(s => {
  const endDate = new Date(s.end_date);
  return endDate >= now;  // Only future/ongoing series
});

// 2. Add current form data as temporary series
activeSeries.push({
  id: 'temp',
  name: formData.name,
  start_date: formData.start_date,
  end_date: formData.end_date
});

// 3. Sort by start_date, then by name
activeSeries.sort((a, b) => {
  const dateA = new Date(a.start_date).getTime();
  const dateB = new Date(b.start_date).getTime();
  
  if (dateA !== dateB) {
    return dateA - dateB;  // Earlier date = lower sequence
  }
  
  // Same date/time? Sort alphabetically by name
  return a.name.localeCompare(b.name);
});

// 4. Find position of temp series
const position = activeSeries.findIndex(s => s.id === 'temp');
const calculatedSequence = position + 1;

// 5. Display to user (read-only)
setAutoSequenceNumber(calculatedSequence);
```

### Real-World Example

```typescript
// Tournament with matches at different times
Existing Series:
1. "Quarter Final 1" - Aug 5, 2:00 PM → Sequence: 1
2. "Quarter Final 2" - Aug 5, 6:00 PM → Sequence: 2
3. "Semi Final 1" - Aug 8, 6:00 PM → Sequence: 3
4. "Semi Final 2" - Aug 8, 6:00 PM → Sequence: 4 (same time, alphabetical)
5. "Final" - Aug 10, 7:00 PM → Sequence: 5

// User creates new series:
Name: "Quarter Final 3"
Start: Aug 5, 10:00 PM

// System calculates:
Aug 5, 2:00 PM: Quarter Final 1 → 1
Aug 5, 6:00 PM: Quarter Final 2 → 2
Aug 5, 10:00 PM: Quarter Final 3 → 3  ← NEW (auto-assigned)
Aug 8, 6:00 PM: Semi Final 1 → 4  (bumped up)
Aug 8, 6:00 PM: Semi Final 2 → 5  (bumped up)
Aug 10, 7:00 PM: Final → 6  (bumped up)

// User sees: "Sequence Number: #3 (Auto-assigned)"
```

### Why Alphabetical Sorting for Same Time?

```typescript
// Scenario: Multiple matches at same time (parallel events)
Aug 5, 6:00 PM:
- "Match A vs B"
- "Match C vs D"
- "Match E vs F"

// Without alphabetical: Random order, inconsistent
// With alphabetical: Predictable, consistent order
→ Match A vs B (Sequence: 2)
→ Match C vs D (Sequence: 3)
→ Match E vs F (Sequence: 4)
```

---

## Deep Dive #5: Resource Ownership

### Main Event = Resource Owner

```sql
-- Wristbands belong to MAIN EVENT, not series
CREATE TABLE wristbands (
  id uuid PRIMARY KEY,
  event_id uuid REFERENCES events(id),  -- Main event!
  series_id uuid REFERENCES event_series(id),  -- Optional assignment
  nfc_id text,
  category text,
  ...
);

-- Tickets belong to MAIN EVENT
CREATE TABLE tickets (
  id uuid PRIMARY KEY,
  event_id uuid REFERENCES events(id),  -- Main event!
  ticket_number text,
  linked_wristband_id uuid,
  ...
);

-- Gates belong to MAIN EVENT
CREATE TABLE gates (
  id uuid PRIMARY KEY,
  event_id uuid REFERENCES events(id),  -- Main event!
  name text,
  ...
);
```

**Why This Design?**

#### Wristbands are Reusable Across Series
```typescript
// Festival Scenario:
Main Event: "Summer Fest 2025" (3 days)
Wristband: NFC-12345 (belongs to main event)

// Same wristband can check into multiple series:
Friday Night (Series 1): ✓ Check-in with NFC-12345
Saturday Day (Series 2): ✓ Check-in with NFC-12345
Sunday VIP (Series 3): ✓ Check-in with NFC-12345

// If wristbands belonged to series:
→ You'd need 3 separate wristbands per person
→ Defeats the purpose of multi-day wristbands
```

#### Series Assignment is Optional and Flexible
```typescript
// Wristband lifecycle:

// 1. Upload wristbands to main event
POST /wristbands
{
  event_id: "main-event-id",
  nfc_id: "NFC-12345",
  category: "VIP"
  // No series_id yet
}

// 2. Optionally assign to specific series
PATCH /wristbands/NFC-12345
{
  series_id: "series-3-id"  // Restrict to Sunday VIP only
}

// 3. Or leave unassigned (can access all series)
// series_id: null → Can check into any series
```

### Series = Resource Filter

```typescript
// Series doesn't OWN resources, it FILTERS them

// Example: Get wristbands for a series
SELECT * FROM wristbands 
WHERE event_id = 'main-event-id'  -- Main event owns them
AND (
  series_id = 'series-id'  -- Explicitly assigned to this series
  OR series_id IS NULL     -- Or available to all series
);

// Example: Check-in validation
function canCheckInToSeries(wristband, series) {
  // 1. Wristband must belong to main event
  if (wristband.event_id !== series.main_event_id) return false;
  
  // 2. If wristband assigned to specific series, must match
  if (wristband.series_id && wristband.series_id !== series.id) {
    return false;
  }
  
  // 3. Check ticket linking requirements (series-specific!)
  const ticketMode = getSeriesTicketLinkingMode(series.id);
  if (ticketMode === 'required' && !wristband.has_ticket) {
    return false;
  }
  
  return true;
}
```

---

## Deep Dive #6: Lifecycle Complexity

### Main Event: Complex State Machine

```typescript
// Main Event Lifecycle States
type LifecycleStatus = 'draft' | 'active' | 'completed' | 'archived';

// State Transitions:
draft → active → completed → archived
  ↓       ↓
  └───────┴──→ cancelled (from any state)

// Each state has different behaviors:
{
  draft: {
    visible_to_public: false,
    check_ins_enabled: false,
    can_edit: true,
    can_delete: true
  },
  active: {
    visible_to_public: true,
    check_ins_enabled: true,
    can_edit: limited,  // Can't change critical settings
    can_delete: false
  },
  completed: {
    visible_to_public: true,
    check_ins_enabled: false,
    can_edit: false,
    can_delete: false,
    can_archive: true
  },
  archived: {
    visible_to_public: false,
    check_ins_enabled: false,
    can_edit: false,
    can_delete: false,
    data_retention: apply_policy
  }
}
```

**Why This Complexity?**

```typescript
// Real-world event workflow:

// Week 1: Planning
Event: { lifecycle_status: 'draft' }
→ Configure settings
→ Upload wristbands
→ Test check-ins
→ Not visible to public
→ Can delete if cancelled

// Week 2: Event goes live
Event: { lifecycle_status: 'active' }
→ Public can see event
→ Check-ins enabled
→ Can't delete (data integrity)
→ Limited edits (safety)

// Week 3: Event ends
Event: { lifecycle_status: 'completed' }
→ Check-ins disabled
→ Analytics available
→ Can't edit (historical record)
→ Can archive after review

// Month 2: Archive old data
Event: { lifecycle_status: 'archived' }
→ Hidden from main views
→ Data retention policies apply
→ Can restore if needed
```

### Series: Simple Active/Inactive

```typescript
// Series only has:
is_active: boolean

// Why so simple?

// 1. Series lifecycle tied to main event
if (mainEvent.lifecycle_status === 'draft') {
  // Series exists but not operational
}
if (mainEvent.lifecycle_status === 'active') {
  // Series can accept check-ins if within time window
}

// 2. Series time window determines availability
function isSeriesAvailable(series) {
  const now = new Date();
  const windowStart = series.start_date - series.checkin_window_start_offset;
  const windowEnd = series.end_date + series.checkin_window_end_offset;
  
  return now >= windowStart && now <= windowEnd;
}

// 3. Deactivation is just a flag
series.is_active = false;  // Soft delete, can reactivate
// vs
mainEvent.lifecycle_status = 'archived';  // Complex state change
```

---

## Deep Dive #7: Configuration Inheritance Chain

### The Full Inheritance Hierarchy

```typescript
// Level 1: System Defaults (hardcoded)
const SYSTEM_DEFAULTS = {
  ticket_linking_mode: 'disabled',
  allow_unlinked_entry: true,
  checkin_window_offset: '2 hours',
  auto_create_gates: true
};

// Level 2: Organization Settings (optional)
const ORGANIZATION_CONFIG = {
  default_ticket_linking: 'optional',
  default_capacity_alerts: true
};

// Level 3: Main Event Config (explicit)
const MAIN_EVENT_CONFIG = {
  ticket_linking_mode: 'required',  // Overrides org default
  gate_settings: {
    auto_create_gates: false,  // Overrides system default
    enforce_categories: true
  }
};

// Level 4: Series Config (selective override)
const SERIES_CONFIG = {
  ticket_linking_mode: 'inherit',  // Uses main event's 'required'
  // gate_settings not specified → inherits from main event
};

// Effective Series Configuration:
{
  ticket_linking_mode: 'required',  // From main event (inherited)
  allow_unlinked_entry: false,  // Derived from 'required' mode
  gate_settings: {
    auto_create_gates: false,  // From main event (inherited)
    enforce_categories: true  // From main event (inherited)
  },
  checkin_window_offset: '2 hours'  // From system default
}
```

### Resolution Algorithm

```typescript
function getEffectiveSeriesConfig(seriesId) {
  // 1. Get series config
  const series = await db.event_series.findById(seriesId);
  const seriesConfig = series.config || {};
  
  // 2. Get main event config
  const mainEvent = await db.events.findById(series.main_event_id);
  const mainEventConfig = mainEvent.config || {};
  
  // 3. Get organization config
  const org = await db.organizations.findById(mainEvent.organization_id);
  const orgConfig = org.default_config || {};
  
  // 4. Resolve ticket linking (special case)
  let ticketLinkingMode;
  if (seriesConfig.ticket_linking_mode === 'inherit' || !seriesConfig.ticket_linking_mode) {
    ticketLinkingMode = mainEventConfig.ticket_linking_mode 
      || mainEvent.ticket_linking_mode 
      || orgConfig.default_ticket_linking 
      || 'disabled';
  } else {
    ticketLinkingMode = seriesConfig.ticket_linking_mode;
  }
  
  // 5. Merge configs (series → main event → org → system)
  return {
    ...SYSTEM_DEFAULTS,
    ...orgConfig,
    ...mainEventConfig,
    ...seriesConfig,
    ticket_linking_mode: ticketLinkingMode,  // Resolved value
    allow_unlinked_entry: resolveUnlinkedEntry(ticketLinkingMode, seriesConfig, mainEventConfig)
  };
}
```

---

## Summary: The Core Philosophical Differences

### Main Event Philosophy
- **"I am the source of truth"**
- Owns all resources (wristbands, tickets, gates)
- Defines default policies
- Has complex lifecycle management
- Independent existence
- Configuration is comprehensive and explicit

### Series Philosophy
- **"I am a lens through which to view the main event"**
- References resources, doesn't own them
- Inherits policies, overrides when necessary
- Simple active/inactive state
- Dependent on main event
- Configuration is minimal and relative

### Why This Design Works

1. **Scalability**: Create 100 series without 100x configuration overhead
2. **Flexibility**: Override when needed, inherit by default
3. **Consistency**: Changes to main event propagate automatically
4. **Simplicity**: Series configuration focuses on what's different, not what's the same
5. **Reusability**: Same wristband works across all series
6. **Maintainability**: Update policy once (main event), affects all series

This architectural separation allows QuickStrap to handle both simple single-session events and complex multi-series tournaments with the same elegant data model.
