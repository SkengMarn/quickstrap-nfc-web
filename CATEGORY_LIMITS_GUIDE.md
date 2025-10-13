# Category-Based Wristband Linking Limits

## Overview

This feature allows you to control how many wristbands of each category can be linked to a single ticket. This is useful for events where different ticket types should allow different numbers of wristbands, based on the wristband category (e.g., VIP, TABLE, CREW, GENERAL).

## Key Concepts

### Per-Category Limits
- **Category-Specific**: Limits are enforced per wristband category, not total wristbands
- **Example**: A ticket with VIP limit of 1 and TABLE limit of 5 can have:
  - ✅ 1 VIP wristband AND 5 TABLE wristbands (6 total)
  - ❌ 2 VIP wristbands (exceeds VIP limit)
  - ❌ 6 TABLE wristbands (exceeds TABLE limit)

### Dynamic Categories
- Categories are **automatically detected** from your wristbands
- Each event can have different categories
- No need to pre-configure categories globally

## Database Schema

### Tables Created

1. **`event_category_limits`**
   ```sql
   - id: uuid (Primary Key)
   - event_id: uuid (Foreign Key to events)
   - category: text (e.g., "VIP", "TABLE")
   - max_wristbands: integer (Default: 1)
   - created_at, updated_at: timestamptz
   - UNIQUE constraint on (event_id, category)
   ```

2. **`ticket_wristband_links`**
   ```sql
   - id: uuid (Primary Key)
   - ticket_id: uuid (Foreign Key to tickets)
   - wristband_id: uuid (Foreign Key to wristbands)
   - linked_at: timestamptz
   - linked_by: uuid (Foreign Key to auth.users)
   - UNIQUE constraint on wristband_id (one wristband = one ticket)
   ```

### Triggers & Functions

- **`enforce_wristband_category_limit()`**: Validates limits before inserting links
- **`auto_create_category_limits()`**: Auto-creates default limits when new wristband categories are added
- **`update_wristband_status_on_link()`**: Updates wristband and ticket status on link/unlink

## Portal UI Usage

### Step 1: Upload Wristbands
1. Navigate to your event
2. Go to the **Wristbands** tab
3. Upload your wristbands via CSV (must include `category` column)

### Step 2: Configure Category Limits
1. Go to the **Settings** tab
2. Scroll to **"Wristband Category Limits"** section
3. For each category:
   - Click **"Add Category Limit"**
   - Select the category (e.g., VIP, TABLE, CREW)
   - Set max wristbands per ticket (e.g., 1, 5, 10)
4. Click **"Save Limits"**

### Example Configuration

| Category | Max Wristbands | Use Case |
|----------|----------------|----------|
| VIP | 1 | One VIP wristband per ticket |
| TABLE | 5 | Tables allow up to 5 wristbands |
| CREW | 2 | Staff tickets can have 2 crew wristbands |
| GENERAL | 1 | General admission, one per ticket |

## Field App Integration

### Linking Flow

When scanning a wristband to link to a ticket in your field app:

```javascript
import { linkWristbandToTicket, checkCategoryLimit } from '../services/ticketLinkingService';

// Option 1: Check limit first (preview)
const limitCheck = await checkCategoryLimit(ticketId, wristbandId);
if (!limitCheck.success) {
  alert(limitCheck.error); // "Ticket already has maximum allowed wristbands (1) for category 'VIP'"
} else {
  console.log(`Can link. ${limitCheck.details.remaining} slots remaining.`);
}

// Option 2: Attempt to link (validation happens automatically)
const result = await linkWristbandToTicket(ticketId, wristbandId, userId);
if (result.success) {
  toast.success('Wristband linked successfully!');
  console.log('Remaining slots:', result.details.remaining);
} else {
  toast.error(result.error);
}
```

### Getting Ticket Status

```javascript
import { getTicketCategoryStatus } from '../services/ticketLinkingService';

const status = await getTicketCategoryStatus(ticketId);
if (status.success) {
  status.categories.forEach(cat => {
    console.log(`${cat.category}: ${cat.current_count}/${cat.max_allowed} (${cat.remaining} remaining)`);
  });
}

// Example output:
// VIP: 1/1 (0 remaining) ✅ Full
// TABLE: 3/5 (2 remaining) 🟡 Available
// CREW: 0/2 (2 remaining) 🟢 Empty
```

## API Service Functions

### Available Functions

1. **`checkCategoryLimit(ticketId, wristbandId)`**
   - Checks if a ticket can accept another wristband of a specific category
   - Returns limit info without creating a link

2. **`linkWristbandToTicket(ticketId, wristbandId, userId?)`**
   - Links a wristband to a ticket
   - Validates category limits automatically
   - Returns error if limit exceeded

3. **`unlinkWristbandFromTicket(ticketId, wristbandId)`**
   - Removes a link between ticket and wristband
   - Updates statuses automatically

4. **`getTicketCategoryStatus(ticketId)`**
   - Returns current status for all categories
   - Shows how many slots are used/remaining

5. **`getTicketWristbands(ticketId)`**
   - Returns all wristbands currently linked to a ticket

6. **`bulkLinkWristbands(links[], userId?)`**
   - Links multiple wristbands to tickets in batch
   - Validates each link individually

## Database Views

### `ticket_wristband_links_with_details`
Denormalized view with full ticket and wristband information:
```sql
SELECT * FROM ticket_wristband_links_with_details
WHERE event_id = 'your-event-id';
```

### `ticket_link_counts`
Shows current link counts per ticket and category:
```sql
SELECT * FROM ticket_link_counts
WHERE ticket_id = 'your-ticket-id';
```

## Migration & Compatibility

### Migrating Existing Data

The migration automatically:
1. ✅ Creates new tables and triggers
2. ✅ Migrates existing `tickets.linked_wristband_id` to `ticket_wristband_links`
3. ✅ Creates default category limits (max=1) for existing events
4. ⚠️ Keeps old columns for backwards compatibility (can be dropped later)

### To Apply Migration

```bash
# Push migration to Supabase
supabase db push

# Or apply manually
psql $DATABASE_URL < supabase/migrations/20251011000000_add_category_wristband_limits.sql
```

### Dropping Legacy Columns (Optional)

After verifying the migration works:
```sql
ALTER TABLE public.tickets DROP COLUMN linked_wristband_id;
ALTER TABLE public.tickets DROP COLUMN linked_at;
ALTER TABLE public.tickets DROP COLUMN linked_by;
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Ticket already has maximum allowed wristbands..." | Category limit exceeded | Remove an existing wristband or increase the limit |
| "Wristband is already linked to another ticket" | Wristband already used | Unlink from previous ticket first |
| "Ticket and wristband must belong to same event" | Event mismatch | Verify IDs are correct |
| "Ticket not found" | Invalid ticket ID | Check ticket exists |

### Database Trigger Errors

The database trigger will block inserts that violate limits:
```
ERROR: Ticket already has maximum allowed wristbands (1 for category 'VIP')
HINT: Remove an existing wristband before adding a new one, or increase the category limit
```

## Testing

### Test Scenario 1: Single Category Limit
```javascript
// Setup
await setCategoryLimit(eventId, 'VIP', 1);

// Test
const result1 = await linkWristbandToTicket(ticketId, vipWristband1); // ✅ Success
const result2 = await linkWristbandToTicket(ticketId, vipWristband2); // ❌ Fails
```

### Test Scenario 2: Multiple Categories
```javascript
// Setup
await setCategoryLimit(eventId, 'VIP', 1);
await setCategoryLimit(eventId, 'TABLE', 5);

// Test
await linkWristbandToTicket(ticketId, vipWristband1);   // ✅ Success
await linkWristbandToTicket(ticketId, tableWristband1); // ✅ Success (different category)
await linkWristbandToTicket(ticketId, tableWristband2); // ✅ Success (under limit)
await linkWristbandToTicket(ticketId, vipWristband2);   // ❌ Fails (VIP limit reached)
```

## Security

### Row Level Security (RLS)

- ✅ Users can only view/manage limits for events in their organization
- ✅ Only admins/managers can modify category limits
- ✅ All operations respect organization boundaries

### Permissions

```sql
-- View limits (all authenticated users with event access)
GRANT SELECT ON event_category_limits TO authenticated;

-- Manage limits (admins only, enforced via RLS)
GRANT INSERT, UPDATE, DELETE ON event_category_limits TO authenticated;
```

## Support

For issues or questions:
1. Check the error message for hints
2. Review this guide
3. Check database logs: `SELECT * FROM event_category_limits WHERE event_id = 'your-event-id';`
4. Verify wristband categories: `SELECT DISTINCT category FROM wristbands WHERE event_id = 'your-event-id';`

## Future Enhancements

Potential improvements:
- [ ] Per-ticket-type limits (e.g., GA tickets = 1, VIP tickets = 5)
- [ ] Time-based limits (different limits at different times)
- [ ] Conditional limits (based on other factors)
- [ ] Bulk operations UI for linking multiple wristbands
- [ ] Analytics dashboard for limit usage

---

**Version**: 1.0
**Last Updated**: October 11, 2025
**Migration File**: `20251011000000_add_category_wristband_limits.sql`
