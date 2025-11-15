# ✅ Status Update Validation Rules

## Overview
Status updates now include validation to ensure data integrity and business logic compliance.

## Validation Rules

### 1. Series-Aware Updates
**Rule**: The system automatically detects whether you're updating an event or a series and updates the correct table.

**Implementation**:
- Events → Updates `events` table
- Series → Updates `event_series` table
- Type is determined by the `type` parameter passed to `handleStatusChange`

### 2. Parent Event Dependency
**Rule**: A series cannot be activated unless its parent event is already active.

**Why**: Series are child instances of events. It doesn't make sense to have an active series under an inactive parent event.

**Validation Logic**:
```typescript
if (type === 'series' && newStatus === 'active') {
  // Check parent event status
  if (parentEvent.lifecycle_status !== 'active') {
    // Block the update
    toast.error('Cannot activate series: Parent event must be active first');
    return;
  }
}
```

### 3. Error Messages
Clear, actionable error messages tell users exactly what's wrong:

- ❌ **"Cannot activate series: Parent event '[Name]' must be active first"**
  - Shown when trying to activate a series under a non-active parent
  - Includes parent event name for clarity

- ❌ **"Failed to validate parent event status"**
  - Shown if database query fails during validation

- ❌ **"Failed to update status"**
  - Generic error for other update failures

## User Flow Examples

### ✅ Valid: Activating Series Under Active Event

1. Parent event "Music Festival" is **Active**
2. User double-clicks series "Day 1" status badge
3. Selects "Active" from dropdown
4. ✅ Validation passes
5. ✅ Series status updated to Active
6. ✅ Toast: "Series status updated to Active!"

### ❌ Invalid: Activating Series Under Draft Event

1. Parent event "Music Festival" is **Draft**
2. User double-clicks series "Day 1" status badge
3. Selects "Active" from dropdown
4. ❌ Validation fails
5. ❌ Update blocked
6. ❌ Toast: "Cannot activate series: Parent event 'Music Festival' must be active first"
7. Series remains in current status

### ✅ Valid: Activating Parent Event

1. Parent event "Music Festival" is **Draft**
2. User double-clicks event status badge
3. Selects "Active" from dropdown
4. ✅ No validation needed (events can be activated freely)
5. ✅ Event status updated to Active
6. ✅ Toast: "Event status updated to Active!"
7. Now series can be activated

## Validation Flow

```
User attempts status change
  ↓
Is it a series being activated?
  ↓ Yes
Check parent event status
  ↓
Is parent active?
  ↓ No
  ❌ Show error, block update
  ↓ Yes
  ✅ Proceed with update
```

## Technical Implementation

### Validation Check
```typescript
// VALIDATION: If updating a series to 'active', check parent event status
if (type === 'series' && newStatus === 'active') {
  // Find parent event in current data
  let parentEvent = findParentInCurrentData(id);
  
  if (!parentEvent) {
    // Fetch from database if not in current data
    parentEvent = await fetchParentFromDatabase(id);
  }
  
  // Validate parent status
  if (parentEvent.lifecycle_status !== 'active') {
    toast.error(`Cannot activate series: Parent event "${parentEvent.name}" must be active first`);
    return; // Block the update
  }
}
```

### Two-Step Lookup
1. **First**: Check current events data (fast, no database call)
2. **Fallback**: Query database if not found (ensures accuracy)

This approach optimizes performance while maintaining data integrity.

## Status Transition Matrix

### Events (No Restrictions)
| From      | To        | Allowed |
|-----------|-----------|---------|
| Draft     | Active    | ✅      |
| Draft     | Completed | ✅      |
| Draft     | Cancelled | ✅      |
| Active    | Draft     | ✅      |
| Active    | Completed | ✅      |
| Active    | Cancelled | ✅      |
| Completed | Any       | ✅      |
| Cancelled | Any       | ✅      |

### Series (With Parent Validation)
| From      | To        | Parent Status | Allowed |
|-----------|-----------|---------------|---------|
| Draft     | Active    | Active        | ✅      |
| Draft     | Active    | Draft         | ❌      |
| Draft     | Active    | Completed     | ❌      |
| Draft     | Active    | Cancelled     | ❌      |
| Draft     | Completed | Any           | ✅      |
| Draft     | Cancelled | Any           | ✅      |
| Active    | Any       | Any           | ✅      |
| Completed | Any       | Any           | ✅      |
| Cancelled | Any       | Any           | ✅      |

**Key Rule**: Only activating a series requires parent to be active. All other transitions are allowed.

## Future Enhancements

Potential additional validations:

- [ ] Prevent parent event deactivation if it has active series
- [ ] Warn when completing event with active series
- [ ] Validate date ranges (series dates within parent event dates)
- [ ] Check capacity constraints
- [ ] Validate ticket availability before activation
- [ ] Role-based status change permissions
- [ ] Audit log for status changes

## Testing Scenarios

### Test Case 1: Activate Series Under Active Event
- **Setup**: Parent event is Active
- **Action**: Activate series
- **Expected**: ✅ Success

### Test Case 2: Activate Series Under Draft Event
- **Setup**: Parent event is Draft
- **Action**: Activate series
- **Expected**: ❌ Error message shown, update blocked

### Test Case 3: Activate Series Under Completed Event
- **Setup**: Parent event is Completed
- **Action**: Activate series
- **Expected**: ❌ Error message shown, update blocked

### Test Case 4: Change Series to Completed (Any Parent Status)
- **Setup**: Parent event is Draft/Active/Completed/Cancelled
- **Action**: Change series to Completed
- **Expected**: ✅ Success (no validation for non-active status)

### Test Case 5: Activate Event
- **Setup**: Event is Draft
- **Action**: Activate event
- **Expected**: ✅ Success (no validation for events)

---

**Status**: ✅ Implemented  
**File**: `src/components/events/CompactEventsTable.tsx`  
**Validation Type**: Business logic validation  
**Performance**: Optimized with two-step lookup
