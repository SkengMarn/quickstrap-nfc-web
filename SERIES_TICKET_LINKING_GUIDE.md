# Series-Specific Ticket Linking Configuration

## Overview

QuickStrap now supports **per-series ticket linking requirements**, allowing you to configure different ticket validation rules for each series within a main event. This is particularly useful for multi-day events, tournaments, or festivals where different sessions may have different entry requirements.

## Use Cases

### Example 1: Festival with VIP Day
- **Main Event**: 3-day music festival (ticket linking: optional)
- **Series 1**: Day 1 - General Access (inherit from main event)
- **Series 2**: Day 2 - General Access (inherit from main event)  
- **Series 3**: Day 3 - VIP Only (ticket linking: **required**)

### Example 2: Sports Tournament
- **Main Event**: Championship Tournament (ticket linking: optional)
- **Series 1-4**: Group Stage Matches (disabled - free entry)
- **Series 5-6**: Semi-Finals (optional - recommended)
- **Series 7**: Finals (ticket linking: **required**)

### Example 3: Conference
- **Main Event**: Tech Conference (ticket linking: required)
- **General Sessions**: Inherit from main event (required)
- **Networking Events**: Disabled (open to all attendees)
- **Premium Workshops**: Required (strict validation)

## Configuration Options

### 1. **Inherit from Main Event** (Default)
- Series uses the same ticket linking mode as the main event
- Changes to main event settings automatically apply to this series
- Recommended for most series in an event

### 2. **Disabled - No Ticket Required**
- All wristbands can check in without linked tickets
- Useful for free sessions, networking events, or open access periods
- More permissive than main event setting

### 3. **Optional - Ticket Recommended**
- Wristbands can have tickets but it's not mandatory
- Additional setting: "Allow unlinked wristbands to check in"
  - **Checked**: Wristbands without tickets can enter
  - **Unchecked**: Wristbands must have tickets even in optional mode
- Good for tracking attendance while maintaining flexibility

### 4. **Required - Ticket Mandatory**
- Only wristbands with valid linked tickets can check in
- Strictest mode - enforces ticket validation
- Useful for premium sessions, capacity-controlled events, or paid access
- More restrictive than main event setting

## How to Configure

### Portal (Web Interface)

1. **Navigate to Event Details** → Series tab
2. **Create or Edit a Series**
3. **Scroll to "Ticket Linking Requirement" section**
4. **Select the appropriate mode:**
   - Inherit from Main Event (default)
   - Disabled
   - Optional (with checkbox for unlinked entry)
   - Required (shows warning)
5. **Save the series**

### Database (SQL)

```sql
-- Set a series to require ticket linking
UPDATE event_series
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{ticket_linking_mode}',
  '"required"'
)
WHERE id = 'your-series-id';

-- Set a series to disable ticket linking
UPDATE event_series
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{ticket_linking_mode}',
  '"disabled"'
)
WHERE id = 'your-series-id';

-- Set optional mode with unlinked entry allowed
UPDATE event_series
SET config = jsonb_build_object(
  'ticket_linking_mode', 'optional',
  'allow_unlinked_entry', true
)
WHERE id = 'your-series-id';
```

## Validation Logic

### Check-in Flow

When a wristband attempts to check in to a series:

1. **System determines effective ticket linking mode:**
   - If series mode is "inherit" → use main event's mode
   - Otherwise → use series-specific mode

2. **Validation rules applied:**
   - **Disabled**: Always allow check-in
   - **Optional**: 
     - If `allow_unlinked_entry = true` → allow all
     - If `allow_unlinked_entry = false` → require ticket
   - **Required**: Only allow if wristband has linked ticket

3. **Result:**
   - ✅ Valid → Check-in proceeds
   - ❌ Invalid → Check-in rejected with reason

### Database Functions

```sql
-- Get effective ticket linking mode for a series
SELECT get_series_ticket_linking_mode('series-id');

-- Check if unlinked entry is allowed
SELECT series_allows_unlinked_entry('series-id');

-- Validate a wristband for series check-in
SELECT validate_wristband_for_series('wristband-id', 'series-id');
```

## Mobile App Integration

The mobile NFC scanning app automatically:

1. Fetches series configuration when selecting a series
2. Applies ticket linking rules during check-in
3. Shows appropriate error messages:
   - "This series requires a linked ticket"
   - "Unlinked wristbands are not allowed for this series"
4. Displays ticket linking status in wristband details

## Best Practices

### 1. **Start with Inherit**
- Use "inherit" for most series
- Only override when you have specific requirements
- Reduces configuration complexity

### 2. **Communicate Requirements**
- Clearly communicate ticket requirements to attendees
- Update event website/app with series-specific rules
- Send notifications before series starts

### 3. **Test Before Event**
- Test check-ins with both linked and unlinked wristbands
- Verify that validation rules work as expected
- Train staff on different series requirements

### 4. **Monitor During Event**
- Watch for rejected check-ins
- Be ready to adjust settings if needed
- Have staff available to help with ticket linking

### 5. **Use Required Mode Carefully**
- Only use "required" when absolutely necessary
- Ensure attendees have time to link tickets beforehand
- Have a backup plan for technical issues

## Reporting & Analytics

### View Series Ticket Linking Summary

```sql
SELECT * FROM series_ticket_linking_summary;
```

Returns:
- Series name and ID
- Main event name
- Effective ticket mode (after inheritance)
- Whether unlinked entry is allowed
- Series-specific config vs inherited

### Check-in Analytics

Track check-ins by ticket linking status:
- Wristbands with tickets
- Wristbands without tickets
- Rejected check-ins due to ticket requirements

## Troubleshooting

### Issue: "This series requires a linked ticket"

**Cause**: Series is set to "required" mode but wristband has no ticket

**Solutions**:
1. Link a ticket to the wristband in the portal
2. Change series mode to "optional" or "disabled"
3. Override check-in manually (admin only)

### Issue: Unlinked wristbands rejected in optional mode

**Cause**: `allow_unlinked_entry` is set to `false`

**Solution**:
1. Edit series in portal
2. Check "Allow unlinked wristbands to check in"
3. Save changes

### Issue: Series not inheriting from main event

**Cause**: Series has explicit ticket linking mode set

**Solution**:
1. Edit series in portal
2. Change ticket linking mode to "Inherit from Main Event"
3. Save changes

## Migration from Event-Level Only

If you're upgrading from event-level ticket linking only:

1. **All existing series will default to "inherit"**
2. **No action required** unless you want series-specific rules
3. **Gradual rollout**: Configure series one at a time as needed

## API Reference

### TypeScript Interface

```typescript
interface SeriesConfig {
  ticket_linking_mode?: 'inherit' | 'disabled' | 'optional' | 'required';
  allow_unlinked_entry?: boolean;
  // ... other config options
}
```

### Database Schema

```sql
-- event_series table
CREATE TABLE event_series (
  id uuid PRIMARY KEY,
  main_event_id uuid REFERENCES events(id),
  name text NOT NULL,
  config jsonb, -- Contains ticket_linking_mode and allow_unlinked_entry
  -- ... other fields
);
```

## Support

For questions or issues:
1. Check this guide first
2. Review the validation functions in `series_ticket_linking_config.sql`
3. Test with the `validate_wristband_for_series()` function
4. Contact support with series ID and error details
