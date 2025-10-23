# Main Event vs Series - Configuration Comparison

## Overview

**Main Events** are the top-level containers with comprehensive configuration options.  
**Series** are sub-events within a main event with focused, series-specific settings.

---

## Side-by-Side Comparison

| Configuration Area | Main Event | Series | Notes |
|-------------------|------------|---------|-------|
| **Organization** | ✅ Required | ❌ Inherits from main event | Series automatically belongs to main event's organization |
| **Basic Info** | ✅ Name, Description, Location | ✅ Name, Description only | Series uses main event's location |
| **Dates** | ✅ Start/End dates | ✅ Start/End dates | Series can extend main event dates (auto-adjusts) |
| **Capacity** | ✅ Max capacity setting | ⚠️ Optional in config | Main event has primary capacity control |
| **Ticket Linking** | ✅ Full configuration | ✅ Can inherit or override | **NEW**: Series can have different requirements |
| **Gate Settings** | ✅ Auto-create, enforce categories, scan mode | ⚠️ Limited (allowed gates) | Main event controls gate behavior |
| **Capacity Alerts** | ✅ Enable alerts, threshold, recipients | ⚠️ Optional in config | Main event has primary alert system |
| **Check-in Window** | ✅ Enable/disable, start/end times | ✅ Offset-based (hours before/after) | **Different approach** |
| **Activation** | ✅ Draft/Scheduled/Active | ❌ Not applicable | Series are always active when created |
| **Sequence Number** | ❌ Not applicable | ✅ Auto-assigned | Series are ordered chronologically |
| **Series Type** | ❌ Not applicable | ✅ Standard/Knockout/Group/Custom | Categorizes series purpose |
| **Public Visibility** | ✅ is_public flag | ❌ Inherits from main event | Series visibility tied to main event |
| **Logo/Branding** | ✅ Logo URL | ❌ Uses main event branding | Series don't have separate logos |
| **Test Mode** | ✅ test_mode flag | ❌ Inherits from main event | Testing controlled at main event level |

---

## Detailed Breakdown

### 1. Organization Selection

#### Main Event
```typescript
// Step 1: Organization Selection
- Select existing organization OR create new
- Organization slug must be unique
- Sets organization_id for the event
```

#### Series
```typescript
// No organization selection
- Automatically inherits main_event.organization_id
- Cannot change organization
```

---

### 2. Basic Information

#### Main Event
```typescript
{
  name: string;              // Required
  description?: string;      // Optional
  location?: string;         // Optional (e.g., "Stadium XYZ")
  capacity?: number;         // Optional max capacity
  logo_url?: string;         // Optional branding
}
```

#### Series
```typescript
{
  name: string;              // Required (e.g., "Matchday 1", "Semi-Finals")
  description?: string;      // Optional
  // No location - uses main event's location
  // No logo - uses main event's branding
}
```

---

### 3. Date Configuration

#### Main Event
```typescript
{
  start_date: datetime;      // Must be >= 2 hours from now
  end_date: datetime;        // Must be after start_date
  // Max duration: 365 days
  // Cannot be in the past
}
```

#### Series
```typescript
{
  start_date: datetime;      // Can be before main event start
  end_date: datetime;        // Can be after main event end
  // If series extends beyond main event:
  //   → Main event dates auto-adjust
  // Cannot start in the past
  // Auto-sequence based on start_date + name
}
```

**Key Difference**: Series can extend main event dates automatically!

---

### 4. Ticket Linking Configuration ⭐ NEW

#### Main Event
```typescript
config: {
  ticket_linking_mode: 'disabled' | 'optional' | 'required';
  allow_unlinked_entry: boolean;
}

// Also stored at top-level for iOS app compatibility:
ticket_linking_mode: 'disabled' | 'optional' | 'required';
allow_unlinked_entry: boolean;
```

**Options**:
- **Disabled**: No tickets needed
- **Optional**: Tickets recommended but not required
- **Required**: Must have linked ticket

#### Series
```typescript
config: {
  ticket_linking_mode: 'inherit' | 'disabled' | 'optional' | 'required';
  allow_unlinked_entry?: boolean;
}
```

**Options**:
- **Inherit** (default): Use main event's setting
- **Disabled**: Override to allow all (more permissive)
- **Optional**: Override with custom setting
- **Required**: Override to require tickets (more restrictive)

**Key Difference**: Series has "inherit" option + can override main event!

---

### 5. Gate Configuration

#### Main Event
```typescript
config: {
  gate_settings: {
    auto_create_gates: boolean;           // Auto-discover gates from app
    enforce_category_assignments: boolean; // Restrict categories to gates
    default_scan_mode: 'single' | 'continuous'; // Check-in behavior
  }
}
```

#### Series
```typescript
config: {
  gate_settings?: {
    allowed_gates?: string[];  // Restrict to specific gate IDs
    auto_create_gates?: boolean; // Optional override
  }
}
```

**Key Difference**: Main event controls gate behavior, series can restrict which gates

---

### 6. Capacity & Alerts

#### Main Event
```typescript
config: {
  capacity_settings: {
    max_capacity: number;           // Total event capacity
    alerts_enabled: boolean;        // Enable capacity alerts
    alert_threshold: number;        // Percentage (1-100)
    alert_recipients: string[];     // Email addresses
  }
}
```

#### Series
```typescript
config: {
  capacity_settings?: {
    max_capacity?: number;      // Optional series-specific capacity
    alerts_enabled?: boolean;   // Optional
    alert_threshold?: number;   // Optional
  }
}
```

**Key Difference**: Main event has full alert system, series has optional capacity limits

---

### 7. Check-in Window ⚠️ DIFFERENT APPROACH

#### Main Event
```typescript
config: {
  checkin_window?: {
    enabled: boolean;
    start_time: datetime;  // Absolute date/time
    end_time: datetime;    // Absolute date/time
  }
}
```

**Approach**: Fixed absolute times

#### Series
```typescript
{
  checkin_window_start_offset: string;  // e.g., "2 hours"
  checkin_window_end_offset: string;    // e.g., "2 hours"
}
```

**Approach**: Relative offsets from series start/end

**Example**:
```
Series: Jan 15, 2025 6:00 PM - 9:00 PM
Start offset: 2 hours
End offset: 2 hours

→ Check-in window: Jan 15, 4:00 PM - 11:00 PM
  (Opens 2 hours before, closes 2 hours after)
```

**Key Difference**: Main event uses absolute times, series uses relative offsets!

---

### 8. Activation & Status

#### Main Event
```typescript
config: {
  activation: {
    status: 'draft' | 'scheduled' | 'active';
    scheduled_time?: datetime;  // For scheduled activation
  }
}

is_active: boolean;  // Derived from activation status
lifecycle_status: 'draft' | 'active' | 'completed' | 'archived';
```

**Workflow**:
1. Create as draft
2. Schedule activation OR activate immediately
3. Auto-activates at scheduled time

#### Series
```typescript
is_active: boolean;  // Always true when created
// No draft mode
// No scheduled activation
// No lifecycle_status
```

**Key Difference**: Main events have complex lifecycle, series are immediately active

---

### 9. Series-Specific Fields

#### Main Event
```typescript
// No series-specific fields
has_series: boolean;  // Flag indicating if event has series (auto-maintained)
```

#### Series
```typescript
{
  main_event_id: uuid;                    // Required - parent event
  sequence_number: number;                // Auto-assigned based on date/time
  series_type: 'standard' | 'knockout' | 'group_stage' | 'custom';
  checkin_window_start_offset: string;    // Hours before start
  checkin_window_end_offset: string;      // Hours after end
}
```

---

## Configuration Storage

### Main Event
```sql
CREATE TABLE events (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),
  name text NOT NULL,
  description text,
  location text,
  capacity integer,
  logo_url text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_public boolean DEFAULT true,
  is_active boolean DEFAULT false,
  test_mode boolean DEFAULT false,
  lifecycle_status text,
  
  -- Top-level ticket linking (iOS app compatibility)
  ticket_linking_mode text,
  allow_unlinked_entry boolean,
  
  -- JSONB config for all settings
  config jsonb,
  
  has_series boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Series
```sql
CREATE TABLE event_series (
  id uuid PRIMARY KEY,
  main_event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  sequence_number integer,
  series_type text,
  
  -- Check-in window offsets
  checkin_window_start_offset text,  -- e.g., "2 hours"
  checkin_window_end_offset text,
  
  -- JSONB config for series-specific settings
  config jsonb,
  
  is_active boolean DEFAULT true,
  organization_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## UI Wizard Comparison

### Main Event Creation Wizard (7 Steps)

1. **Organization Selection**
   - Select or create organization
   
2. **Basic Information**
   - Name, location, description
   - Start/end dates
   
3. **Security Settings (Ticket Linking)**
   - Disabled/Optional/Required
   - Confirmation dialog for "Required" mode
   
4. **Gate Configuration**
   - Auto-create gates
   - Enforce category bindings
   - Scan mode (single/continuous)
   
5. **Capacity & Alerts**
   - Max capacity
   - Alert threshold
   - Enable/disable alerts
   
6. **Check-in Window**
   - Enable/disable
   - Absolute start/end times
   
7. **Activation & Launch**
   - Draft/Scheduled/Active
   - Configuration summary

### Series Creation Form (Single Page)

1. **Series Name** (required)
2. **Description** (optional)
3. **Start/End Dates** (required)
   - Auto-extends main event if needed
4. **Sequence Number** (auto-assigned, read-only)
5. **Series Type** (standard/knockout/group/custom)
6. **Ticket Linking Requirement** ⭐
   - Inherit/Disabled/Optional/Required
   - Override main event setting
7. **Check-in Window Offsets**
   - Hours before start
   - Hours after end

---

## When to Use What

### Use Main Event When:
- ✅ Creating a standalone event
- ✅ Event doesn't have multiple sessions/matches
- ✅ Single date range covers everything
- ✅ All attendees have same access rules

### Use Series When:
- ✅ Multi-day festival (Day 1, Day 2, Day 3)
- ✅ Tournament (Qualifiers, Semi-Finals, Finals)
- ✅ Conference (different sessions/tracks)
- ✅ Different ticket requirements per session
- ✅ Need separate analytics per session

---

## Example Configurations

### Example 1: Simple Concert (Main Event Only)
```typescript
{
  name: "Summer Concert 2025",
  location: "City Stadium",
  start_date: "2025-07-15 19:00",
  end_date: "2025-07-15 23:00",
  ticket_linking_mode: "required",
  capacity: 5000,
  // No series needed
}
```

### Example 2: 3-Day Festival (Main Event + Series)
```typescript
// Main Event
{
  name: "Summer Fest 2025",
  location: "Festival Grounds",
  start_date: "2025-07-15 00:00",
  end_date: "2025-07-17 23:59",
  ticket_linking_mode: "optional",
  capacity: 15000
}

// Series 1
{
  name: "Friday Night",
  main_event_id: "...",
  start_date: "2025-07-15 18:00",
  end_date: "2025-07-15 23:00",
  config: { ticket_linking_mode: "inherit" }  // Uses "optional"
}

// Series 2
{
  name: "Saturday All Day",
  main_event_id: "...",
  start_date: "2025-07-16 12:00",
  end_date: "2025-07-16 23:00",
  config: { ticket_linking_mode: "inherit" }  // Uses "optional"
}

// Series 3
{
  name: "Sunday VIP Only",
  main_event_id: "...",
  start_date: "2025-07-17 18:00",
  end_date: "2025-07-17 22:00",
  config: { ticket_linking_mode: "required" }  // Override to required!
}
```

### Example 3: Tournament (Main Event + Series)
```typescript
// Main Event
{
  name: "Championship 2025",
  location: "Sports Arena",
  start_date: "2025-08-01 00:00",
  end_date: "2025-08-10 23:59",
  ticket_linking_mode: "optional",
  capacity: 10000
}

// Series 1-8: Group Stage
{
  name: "Matchday 1",
  series_type: "group_stage",
  config: { ticket_linking_mode: "disabled" }  // Free entry
}

// Series 9-10: Semi-Finals
{
  name: "Semi-Final 1",
  series_type: "knockout",
  config: { ticket_linking_mode: "optional" }  // Inherit
}

// Series 11: Finals
{
  name: "Championship Final",
  series_type: "knockout",
  config: { 
    ticket_linking_mode: "required",  // Override to required
    capacity_settings: { max_capacity: 8000 }  // Reduced capacity
  }
}
```

---

## Key Takeaways

1. **Main Events** = Comprehensive configuration, full control
2. **Series** = Focused configuration, inherits most from main event
3. **Ticket Linking** = Series can now override main event setting ⭐
4. **Check-in Windows** = Different approaches (absolute vs relative)
5. **Dates** = Series can auto-extend main event dates
6. **Activation** = Main events have lifecycle, series are always active
7. **Sequence** = Series auto-order by date/time, main events don't have sequence

---

## Migration Path

If you have existing events without series:
1. ✅ Keep them as-is (no changes needed)
2. ✅ Add series later if needed
3. ✅ Series automatically inherit ticket linking settings
4. ✅ Override only where necessary

If you're creating a new multi-session event:
1. ✅ Create main event with default settings
2. ✅ Create series for each session
3. ✅ Set series to "inherit" for most
4. ✅ Override ticket linking only for special sessions
