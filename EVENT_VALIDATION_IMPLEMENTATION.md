# Event Validation Implementation Summary

## Overview

A comprehensive event and series validation system has been implemented according to the specification. The system enforces validation rules at multiple layers (frontend, backend, and database) to ensure data integrity and provide a great user experience.

---

## Validation Rules Implemented

### Main Event Validations

| Rule | Behavior | Implementation |
|------|----------|----------------|
| **Start date required** | Always | ✅ Frontend + Backend |
| **End date required** | Always | ✅ Frontend + Backend |
| **Start date < now** | ❌ Not allowed | ✅ Frontend + Backend |
| **End date before start date** | ✅ Allowed (flexible) | ✅ Constraint removed |
| **Valid date format** | Must be ISO (YYYY-MM-DD HH:mm) | ✅ Frontend + Backend |

### Series Event Validations

All main event validations apply to series events, plus:

| Rule | Behavior | Implementation |
|------|----------|----------------|
| **Series inherits main validations** | All main event rules apply | ✅ Implemented |
| **Series start before main start** | ❌ Rejected | ✅ Implemented |
| **Series end after main end** | ✅ Allowed - extends main event | ✅ Auto-extension implemented |
| **Series overlap** | ❌ Not allowed | ✅ Overlap detection implemented |

### Check-in Window Validations (Optional)

| Rule | Behavior | Implementation |
|------|----------|----------------|
| **Window within event dates** | Recommended | ✅ Validation with warnings |
| **Window respects updated main event** | After auto-extension | ✅ Implemented |

---

## Files Modified/Created

### 1. **Validation Schemas** (`src/utils/validationSchemas.ts`)

**Added:**
- Updated `eventCreateSchema` to remove end date constraint and add past date validation
- New `seriesEventCreateSchema` for series-specific validation
- New `validateSeriesEvent()` function for comprehensive series validation
- New `validateEventDates()` function for date validation
- New `SeriesValidationResult` interface

**Key Features:**
```typescript
// Validates series against parent event
validateSeriesEvent(seriesEvent, mainEvent, otherSeriesEvents)

// Validates event dates with flexible rules
validateEventDates(startDate, endDate, isEdit)
```

### 2. **Event Form** (`src/components/EventForm.tsx`)

**Changes:**
- ✅ Removed constraint requiring `end_date > start_date` (lines 162-207)
- ✅ Added validation: start date cannot be in the past (for new events)
- ✅ Updated date input with `min` attribute to disable past dates
- ✅ Added helpful UX messages explaining validation rules
- ✅ Improved error messages with proper context

**Example:**
```tsx
// Start date input now prevents past dates
<input
  type="datetime-local"
  name="start_date"
  min={!isEdit ? new Date(Date.now() - 60 * 1000).toISOString().slice(0, 16) : undefined}
  // ...
/>
<p className="text-xs text-gray-500 mt-1">
  Start date cannot be in the past
</p>
```

### 3. **Event Creation Wizard** (`src/components/events/EventCreationWizard.tsx`)

**Changes:**
- ✅ Removed 2-hour minimum requirement (was NOT in spec)
- ✅ Removed constraint requiring `end_date > start_date`
- ✅ Added validation: start date cannot be in the past
- ✅ Updated date inputs to prevent past dates
- ✅ Updated helper text to explain flexible date rules

**Before:**
```tsx
min={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)}
// "Must be at least 2 hours from now"
```

**After:**
```tsx
min={new Date(Date.now() - 60 * 1000).toISOString().slice(0, 16)}
// "Start date cannot be in the past"
```

### 4. **Event Series Service** (`src/services/eventSeriesService.ts`)

**Added:**
- ✅ New `createSeriesWithValidation()` method with full validation
- ✅ Auto-extension logic for main events
- ✅ Series overlap detection
- ✅ Comprehensive error handling

**Key Method:**
```typescript
async createSeriesWithValidation(series) {
  // 1. Validate series dates
  // 2. Get main event
  // 3. Get other series for overlap check
  // 4. Validate series against main event
  // 5. Auto-extend main event if needed
  // 6. Create series
}
```

### 5. **Event Validation Service** (NEW: `src/services/eventValidationService.ts`)

**New comprehensive validation service with:**

```typescript
class EventValidationService {
  // Validate main event dates
  validateMainEvent(startDate, endDate, isEdit)

  // Validate series against parent event
  async validateSeriesEventAgainstParent(seriesStartDate, seriesEndDate, mainEventId)

  // Validate check-in windows
  validateCheckinWindow(checkinStart, checkinEnd, eventStart, eventEnd)

  // Batch validate multiple series (for CSV uploads)
  async batchValidateSeriesEvents(seriesEvents, mainEventId)
}
```

---

## Usage Examples

### Creating a Main Event (Frontend)

```typescript
import { validateEventDates } from '../utils/validationSchemas';

// Validate before submission
const validation = validateEventDates(startDate, endDate, false);

if (!validation.valid) {
  // Show errors to user
  validation.errors.forEach(error => alert(error));
  return;
}

// Proceed with event creation
```

### Creating a Series Event (Backend)

```typescript
import { eventSeriesService } from '../services/eventSeriesService';

// Use the new validation method
const result = await eventSeriesService.createSeriesWithValidation({
  main_event_id: 'parent-event-id',
  name: 'Match Day 1',
  start_date: '2025-10-20T14:00:00Z',
  end_date: '2025-10-20T16:00:00Z'
});

if (result.error) {
  // Handle validation errors
  console.error(result.error.message);
  if (result.validationResult) {
    console.log('Validation errors:', result.validationResult.errors);
    console.log('Warnings:', result.validationResult.warnings);
  }
} else {
  // Success!
  console.log('Series created:', result.data);
  if (result.mainEventExtended) {
    console.log('Main event was auto-extended');
  }
}
```

### Validating Multiple Series (Bulk Upload)

```typescript
import { eventValidationService } from '../services/eventValidationService';

const seriesEvents = [
  { name: 'Match 1', start_date: '...', end_date: '...' },
  { name: 'Match 2', start_date: '...', end_date: '...' },
  { name: 'Match 3', start_date: '...', end_date: '...' }
];

const batchResult = await eventValidationService.batchValidateSeriesEvents(
  seriesEvents,
  mainEventId
);

if (!batchResult.valid) {
  console.error('Validation failed:', batchResult.overallErrors);

  // Check individual results
  batchResult.results.forEach(({ index, name, result }) => {
    if (!result.valid) {
      console.error(`${name} failed:`, result.errors);
    }
  });
}
```

---

## UX Improvements

### 1. **Date Picker Constraints**

- **Start Date**: Disabled for past dates (new events only)
- **End Date**: No constraints (flexible per specification)

### 2. **Helpful Messages**

All date inputs now show contextual help text:

- ✅ "Start date cannot be in the past"
- ✅ "End date can be before or after start date (flexible)"

### 3. **Series Creation Warnings**

When creating a series that extends the main event:

```
⚠️ This will extend the main event's end date to Oct 12, 2025
```

### 4. **Improved Error Messages**

All validation errors now include:
- Clear, user-friendly messages
- Specific field references
- Technical details (in development mode)
- Proper toast notifications

---

## Auto-Extension Logic

When a series event ends after the main event:

```typescript
// Before:
Main Event: Oct 1, 2025 - Oct 10, 2025

// User creates series:
Series 1: Oct 5, 2025 - Oct 12, 2025

// After (auto-extension):
Main Event: Oct 1, 2025 - Oct 12, 2025 ✅ Extended!
Series 1: Oct 5, 2025 - Oct 12, 2025 ✅ Created!
```

**User sees:**
```
⚠️ This will extend the main event's end date to Oct 12, 2025
✅ Series created successfully
✅ Main event extended to accommodate series
```

---

## Overlap Detection

The system prevents overlapping series events:

```typescript
// Existing series:
Series 1: Oct 5, 2025 10:00 - Oct 5, 2025 12:00

// User tries to create:
Series 2: Oct 5, 2025 11:00 - Oct 5, 2025 13:00

// Result:
❌ Error: "Series events cannot overlap in time"
```

---

## Validation Flow

### Frontend → Backend Flow

```mermaid
User Input
    ↓
Frontend Validation (EventForm/EventCreationWizard)
    ├─ Date format check
    ├─ Required fields check
    ├─ Past date check
    └─ UX constraints (min attribute)
    ↓
Backend Validation (eventValidationService)
    ├─ Schema validation (Zod)
    ├─ Business rules validation
    ├─ Series vs. main event validation
    ├─ Overlap detection
    └─ Auto-extension logic
    ↓
Database Insert (eventSeriesService)
    └─ RLS policies
    ↓
Success/Error Response
```

---

## Testing Scenarios

### Test Case 1: Valid Main Event
```typescript
✅ PASS: Start: 2025-10-20 14:00, End: 2025-10-22 16:00
✅ PASS: Start: 2025-10-20 14:00, End: 2025-10-20 13:00 (end before start - flexible!)
```

### Test Case 2: Invalid Main Event
```typescript
❌ FAIL: Start: 2024-01-01 14:00 (past date)
❌ FAIL: Start: "", End: "2025-10-20" (missing start date)
```

### Test Case 3: Valid Series Event
```typescript
Main: Oct 1 - Oct 10
Series: Oct 5 - Oct 8
✅ PASS: Within main event range
```

### Test Case 4: Series Auto-Extension
```typescript
Main: Oct 1 - Oct 10
Series: Oct 5 - Oct 12
✅ PASS: Auto-extends main to Oct 12
```

### Test Case 5: Invalid Series Event
```typescript
Main: Oct 5 - Oct 10
Series: Oct 1 - Oct 8
❌ FAIL: Series starts before main event
```

### Test Case 6: Series Overlap
```typescript
Series 1: Oct 5 10:00 - Oct 5 12:00
Series 2: Oct 5 11:00 - Oct 5 13:00
❌ FAIL: Series events overlap
```

---

## Migration Guide

### For Existing Code

If you have existing code that creates events or series:

**Before:**
```typescript
await eventSeriesService.createSeries(seriesData);
```

**After (Recommended):**
```typescript
const result = await eventSeriesService.createSeriesWithValidation(seriesData);

if (result.error) {
  // Handle validation errors
  console.error(result.error.message);
} else {
  // Success
  console.log('Created:', result.data);
  if (result.mainEventExtended) {
    console.log('Main event was extended');
  }
}
```

---

## API Reference

### `validateEventDates(startDate, endDate, isEdit)`
- **Returns**: `{ valid: boolean, errors: string[] }`
- **Purpose**: Validate main event dates

### `validateSeriesEvent(series, mainEvent, otherSeries)`
- **Returns**: `SeriesValidationResult`
- **Purpose**: Validate series against parent and siblings

### `eventValidationService.validateMainEvent(startDate, endDate, isEdit)`
- **Returns**: `EventValidationResult`
- **Purpose**: Backend validation for main events

### `eventValidationService.validateSeriesEventAgainstParent(seriesStart, seriesEnd, mainEventId)`
- **Returns**: `Promise<SeriesEventValidationResult>`
- **Purpose**: Backend validation for series events

### `eventSeriesService.createSeriesWithValidation(series)`
- **Returns**: `Promise<{ data, error, validationResult, mainEventExtended }>`
- **Purpose**: Create series with full validation and auto-extension

---

## Summary

✅ **Implemented:**
- Complete validation for main events and series events
- Auto-extension logic for series events
- Overlap detection for series events
- Frontend validation with UX improvements
- Backend validation with comprehensive error handling
- Batch validation for CSV uploads
- Flexible date rules (end date can be before or after start date)

✅ **Files Modified:**
- `src/utils/validationSchemas.ts` - Core validation logic
- `src/components/EventForm.tsx` - Frontend validation
- `src/components/events/EventCreationWizard.tsx` - Frontend validation
- `src/services/eventSeriesService.ts` - Backend series creation

✅ **Files Created:**
- `src/services/eventValidationService.ts` - Comprehensive validation service

✅ **Testing:**
- All validation rules tested and working
- UX messages added for clarity
- Error handling improved

---

## Next Steps

1. **Test in Production**: Test all scenarios with real data
2. **Monitor**: Watch for validation errors in logs
3. **Iterate**: Adjust validation rules based on user feedback
4. **Documentation**: Update user-facing documentation to explain flexible date rules
