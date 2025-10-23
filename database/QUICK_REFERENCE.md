# 🚀 Gate Discovery v2.0 - Quick Reference

## 📦 Deployment (One Time)

```bash
# Add to .env first:
# DATABASE_URL='postgresql://postgres:[PASSWORD]@[PROJECT_REF].supabase.co:5432/postgres'

bash database/deploy_gate_discovery_v2.sh
```

---

## 🔥 Most Common Commands

### Run Complete Pipeline
```sql
SELECT * FROM execute_complete_gate_pipeline_v2('event-id');
```
Does everything: discovers, creates, assigns gates.

### View All Gates
```sql
SELECT * FROM v_gate_overview_v2 WHERE event_id = 'event-id';
```

### Check System Health
```sql
SELECT * FROM gate_discovery_quality_report('event-id');
```

### Assign Orphaned Check-ins
```sql
SELECT * FROM apply_gate_assignments_v2('event-id');
```

---

## 🧪 Testing (Before Going Live)

### Test Without Creating Anything
```sql
SELECT * FROM test_gate_discovery_v2('event-id');
```

### Preview Physical Gates
```sql
SELECT * FROM discover_physical_gates_v2('event-id');
```

### Preview Virtual Gates
```sql
SELECT * FROM discover_virtual_gates_v2('event-id');
```

---

## 📊 Frontend Queries

### Get Gates for UI
```typescript
const { data } = await supabase
  .from('v_gate_overview_v2')
  .select('*')
  .eq('event_id', eventId);
```

### Run Pipeline from Frontend
```typescript
const { data } = await supabase.rpc(
  'execute_complete_gate_pipeline_v2',
  { p_event_id: eventId }
);
```

### Get Event Summary
```typescript
const { data } = await supabase
  .from('v_gate_discovery_summary_v2')
  .select('*')
  .eq('event_id', eventId)
  .single();
```

---

## 🔍 Troubleshooting

### No Gates Found?
```sql
-- Check data quality
SELECT * FROM gate_discovery_quality_report('event-id');

-- Need at least 10-50 checkins with GPS data
```

### Too Many Gates?
```sql
-- Check for duplicates
SELECT * FROM gate_merge_suggestions
WHERE event_id = 'event-id' AND status = 'pending';

-- Increase threshold
UPDATE adaptive_thresholds
SET duplicate_distance_meters = 50
WHERE event_id = 'event-id';
```

### Orphaned Check-ins?
```sql
-- Check count
SELECT COUNT(*) FROM checkin_logs
WHERE event_id = 'event-id' AND gate_id IS NULL;

-- Assign them
SELECT * FROM apply_gate_assignments_v2('event-id');
```

---

## ⚡ Automated Triggers

**You don't need to do anything!** The system auto-runs:

- **At 50 check-ins**: Initial gate discovery
- **Every 100 check-ins**: Refresh gates
- **Every 50 check-ins**: Assign orphans
- **Every check-in**: Update performance cache

---

## 🎯 Key Metrics

### Confidence Scores
- **0.95+**: Strict enforcement
- **0.85-0.94**: Moderate enforcement
- **0.75-0.84**: Relaxed enforcement
- **0.65-0.74**: Probation
- **<0.65**: Not recommended

### GPS Accuracy
- **<15m**: Excellent
- **15-30m**: Good
- **30-50m**: Fair
- **>50m**: Rejected

---

## 📞 Emergency Commands

### Force Refresh Gates
```sql
SELECT * FROM materialize_derived_gates_v2('event-id');
```

### Clear and Rebuild
```sql
-- Delete all gates for event (careful!)
DELETE FROM gates WHERE event_id = 'event-id';

-- Rebuild from scratch
SELECT * FROM execute_complete_gate_pipeline_v2('event-id');
```

### Compare v1 vs v2
```sql
SELECT * FROM compare_gate_discovery_versions('event-id');
```

---

## 📁 File Locations

- **Deployment Script**: `database/deploy_gate_discovery_v2.sh`
- **Full Docs**: `database/GATE_DISCOVERY_V2_README.md`
- **Test Script**: `database/test_gate_discovery_v2.sql`
- **Migrations**:
  - `database/migrations/01_gate_discovery_tables.sql`
  - `database/migrations/02_gate_discovery_functions.sql`
  - `database/migrations/03_enhanced_gate_discovery_v2.sql`

---

## ✅ Pre-Launch Checklist

- [ ] Deploy: `bash database/deploy_gate_discovery_v2.sh`
- [ ] Test: `SELECT * FROM test_gate_discovery_v2('event-id')`
- [ ] Run: `SELECT * FROM execute_complete_gate_pipeline_v2('event-id')`
- [ ] Verify: `SELECT * FROM v_gate_overview_v2 WHERE event_id = 'event-id'`
- [ ] Check health: `SELECT * FROM gate_discovery_quality_report('event-id')`

---

**That's it! 🎉 Keep this handy during launch.**
