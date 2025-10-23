# Access Control System

## Overview

The QuickStrap NFC system has a dual-interface access control model:
- **Portal (Web)**: Admin interface for service providers
- **App (Mobile)**: Field interface for event management and scanning

## User Roles

### System Roles (in `profiles` table)

1. **Admin/Owner**
   - Full system access
   - Can access portal
   - Can see ALL events in both portal and app
   - Can manage all system settings
   - Does NOT need `event_access` records

2. **Manager**
   - Event-level access only
   - Can access portal ONLY for assigned events
   - Can access app ONLY for assigned events
   - Requires `event_access` record with `access_level='admin'` or `'owner'`
   - Can manage event (add/delete wristbands, manage gates)
   - CANNOT see other events
   - CANNOT access system settings

3. **Scanner**
   - Event-level access only
   - Can ONLY access mobile app (no portal access)
   - Can see ONLY assigned events
   - Requires `event_access` record with `access_level='scanner'`
   - Can ONLY scan wristbands at assigned events
   - CANNOT manage event settings

## Access Control Matrix

| Role | Portal Access | See All Events | Manage Events | Scan Wristbands | System Settings |
|------|--------------|----------------|---------------|-----------------|----------------|
| Admin | ✅ Full | ✅ All | ✅ All | ✅ All | ✅ Yes |
| Manager | ✅ Assigned only | ❌ Assigned only | ✅ Assigned only | ✅ Assigned only | ❌ No |
| Scanner | ❌ No | ❌ Assigned only | ❌ No | ✅ Assigned only | ❌ No |

## Database Schema

### `profiles` Table
```sql
- id (uuid)
- email (text)
- role (text) -- 'admin', 'owner', 'scanner'
```

### `event_access` Table
```sql
- id (uuid)
- event_id (uuid) -- FK to events
- user_id (uuid) -- FK to auth.users
- access_level (text) -- 'admin', 'owner', 'scanner'
- granted_by (uuid) -- FK to auth.users
- is_active (boolean)
- created_at (timestamp)
```

## Access Logic

### Portal (Web) Access

**Admins:**
```typescript
// See all events
const events = await supabase.from('events').select('*');
```

**Managers:**
```typescript
// See only events where they have event_access
const { data: eventAccess } = await supabase
  .from('event_access')
  .select('event_id')
  .eq('user_id', userId)
  .eq('is_active', true)
  .in('access_level', ['admin', 'owner']);

const events = await supabase
  .from('events')
  .select('*')
  .in('id', eventAccess.map(ea => ea.event_id));
```

### App (Mobile) Access

**Admins:**
```typescript
// See all events
const events = await supabase.from('events').select('*');
```

**Managers:**
```typescript
// See events where access_level = 'admin' or 'owner'
const { data: eventAccess } = await supabase
  .from('event_access')
  .select('event_id')
  .eq('user_id', userId)
  .eq('is_active', true)
  .in('access_level', ['admin', 'owner']);
```

**Scanners:**
```typescript
// See events where access_level = 'scanner'
const { data: eventAccess } = await supabase
  .from('event_access')
  .select('event_id')
  .eq('user_id', userId)
  .eq('is_active', true);
```

## Permission Checks

### Can User Access Event?
```typescript
const canAccess = await accessControlService.canAccessEvent(eventId);
// true for: admins (all events), users with event_access record
```

### Can User Manage Event?
```typescript
const canManage = await accessControlService.canManageEvent(eventId);
// true for: admins (all events), users with access_level='admin' or 'owner'
```

### Can User Scan at Event?
```typescript
const canScan = await accessControlService.canScanAtEvent(eventId);
// true for: admins (all events), users with any event_access record
```

## Granting Access

Only admins or event managers can grant access to events:

```typescript
// Grant manager access (can manage event)
await accessControlService.grantEventAccess(
  eventId,
  targetUserId,
  'admin' // or 'owner'
);

// Grant scanner access (can only scan)
await accessControlService.grantEventAccess(
  eventId,
  targetUserId,
  'scanner'
);
```

## Revoking Access

```typescript
await accessControlService.revokeEventAccess(eventId, targetUserId);
// Sets is_active = false in event_access table
```

## Use Cases

### Use Case 1: Event Manager
Sarah is hired to manage "Summer Festival 2025" event:
1. Admin grants her access: `access_level='admin'` for that event
2. Sarah can now:
   - See "Summer Festival 2025" in portal AND app
   - Add/delete wristbands
   - Manage gates
   - View reports for this event
3. Sarah CANNOT:
   - See other events
   - Access system settings
   - Manage organization

### Use Case 2: Scanner Staff
John is hired as a scanner for "Concert Night":
1. Event manager grants him access: `access_level='scanner'`
2. John can now:
   - See "Concert Night" in mobile app only
   - Scan wristbands at gates
3. John CANNOT:
   - Access web portal
   - See other events
   - Manage wristbands or event settings

### Use Case 3: System Admin
Admin user:
- Automatically sees ALL events everywhere
- No event_access records needed
- Full system control

## Implementation Files

- **Service**: `/src/services/accessControlService.ts`
- **Portal Integration**: `/src/pages/EventsPage.tsx`
- **Database Schema**: Events table + event_access table

## Important Notes

1. **Admin Bypass**: Admins always bypass event_access checks
2. **No Duplicate Access**: One user should not have multiple active event_access records for same event
3. **Graceful Degradation**: If no event_access exists for non-admin, they see empty event list
4. **Audit Trail**: `granted_by` tracks who gave access to whom
