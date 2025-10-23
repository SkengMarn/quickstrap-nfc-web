# Event Series Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install the Schema

```bash
psql $DATABASE_URL -f database/migrations/comprehensive_event_series_system.sql
```

Or via Supabase CLI:
```bash
supabase db execute --file database/migrations/comprehensive_event_series_system.sql
```

### Step 2: Import the Service

```typescript
import { enhancedSeriesService } from '@/services/enhancedSeriesService';
```

### Step 3: Create Your First Series

```typescript
const result = await enhancedSeriesService.createSeries({
  main_event_id: 'your-event-id',
  name: 'Day 1',
  start_date: '2024-06-01T18:00:00Z',
  end_date: '2024-06-02T02:00:00Z',
});

console.log('Series created!', result.data);
```

---

## 📋 Common Tasks

### Create a Multi-Day Event

```typescript
const days = ['Friday', 'Saturday', 'Sunday'];

for (let i = 0; i < days.length; i++) {
  await enhancedSeriesService.createSeries({
    main_event_id: eventId,
    name: `Day ${i + 1} - ${days[i]}`,
    start_date: `2024-07-0${i + 1}T12:00:00Z`,
    end_date: `2024-07-0${i + 1}T23:59:59Z`,
    sequence_number: i + 1,
  });
}
```

### Assign Wristbands by Category

```typescript
// Assign all VIP wristbands to VIP series
await enhancedSeriesService.bulkAssignByCategory({
  series_id: vipSeriesId,
  event_id: mainEventId,
  categories: ['VIP', 'VIP+'],
});
```

### Set Up Gates

```typescript
await enhancedSeriesService.assignGatesToSeries(seriesId, [
  'gate-main-uuid',
  'gate-vip-uuid',
]);
```

### Set Capacity Limits

```typescript
await enhancedSeriesService.setSeriesCategoryLimits(seriesId, [
  { category: 'General', max_wristbands: 5000, max_capacity: 5000 },
  { category: 'VIP', max_wristbands: 500, max_capacity: 500 },
]);
```

### Check Access During Scan

```typescript
const verification = await enhancedSeriesService.verifyWristbandAccess(
  wristbandId,
  seriesId
);

if (verification.data?.valid) {
  // Allow check-in
  await createCheckin({ wristband_id: wristbandId, series_id: seriesId });
} else {
  // Deny access
  console.error(verification.data?.message);
}
```

---

## 🎯 What's New

### Previously (Limited)
- Series had minimal fields
- No series-specific gates
- No series-specific categories
- Basic wristband linking only
- No lifecycle management
- No recurring series support

### Now (Comprehensive)
✅ **Series-specific gates** - Assign gates per series
✅ **Series-specific categories** - Independent capacity limits
✅ **Full lifecycle management** - draft → scheduled → active → completed
✅ **Recurring series** - Auto-generate weekly/monthly instances
✅ **Templates** - Reuse configurations
✅ **Real-time analytics** - Cached metrics per series
✅ **Location overrides** - Series can have different venues
✅ **Advanced access control** - Validation statuses, bulk assignments
✅ **Audit trails** - Track all state transitions

---

## 📊 Database Tables Overview

| Table | Purpose |
|-------|---------|
| `event_series` | Main series data |
| `series_gates` | Gate assignments |
| `series_category_limits` | Category capacity limits |
| `series_wristband_assignments` | Wristband access control |
| `series_tickets` | Ticket linkage |
| `series_metrics_cache` | Analytics cache |
| `series_templates` | Reusable configs |
| `series_state_transitions` | Audit log |

---

## 🔥 Pro Tips

### Tip 1: Use Templates for Recurring Patterns
Create a template once, reuse forever:
```typescript
const template = await createTemplate({ name: 'Daily Concert' });
const series = await enhancedSeriesService.createFromTemplate(templateId, overrides);
```

### Tip 2: Precompute Metrics
Run this periodically:
```typescript
await enhancedSeriesService.computeSeriesMetrics(seriesId);
```

### Tip 3: Check Active Series Before Scanning
```typescript
const scannable = await enhancedSeriesService.getScannableItems(orgId);
// Show only series within check-in window
```

### Tip 4: Use Sequence Numbers
Order your series logically:
```typescript
sequence_number: 1,  // Day 1
sequence_number: 2,  // Day 2
sequence_number: 3,  // Day 3
```

### Tip 5: Set Appropriate Check-in Windows
```typescript
// Large events - generous windows
checkin_window_start_offset: '4 hours',
checkin_window_end_offset: '2 hours',

// Strict events - tight windows
checkin_window_start_offset: '30 minutes',
checkin_window_end_offset: '0 minutes',
```

---

## 🆘 Troubleshooting

### Issue: "Series not found"
**Solution**: Check RLS policies. User must be member of the organization.

### Issue: "Wristband cannot access series"
**Solution**: Ensure wristband is assigned to series:
```typescript
await enhancedSeriesService.assignWristbandsToSeries({
  series_id: seriesId,
  wristband_ids: [wristbandId],
});
```

### Issue: "Gate not showing up"
**Solution**: Assign gate to series:
```typescript
await enhancedSeriesService.assignGatesToSeries(seriesId, [gateId]);
```

### Issue: "Metrics not updating"
**Solution**: Manually compute:
```typescript
await enhancedSeriesService.computeSeriesMetrics(seriesId);
```

---

## 📚 Full Documentation

For complete API reference and advanced use cases, see:
- [Comprehensive Event Series Guide](./COMPREHENSIVE_EVENT_SERIES_GUIDE.md)

---

## 💡 Need Help?

Check the following files:
- **Types**: `src/types/series.ts`
- **Service**: `src/services/enhancedSeriesService.ts`
- **Migration**: `database/migrations/comprehensive_event_series_system.sql`

---

**Happy building! 🎉**
