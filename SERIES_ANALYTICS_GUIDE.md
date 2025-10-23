## Multi-Series Event Analytics - Complete Guide

## 📊 Overview

The multi-series analytics system provides deep insights into event performance at three levels:
1. **Main Event Level** - Aggregated view across all series
2. **Series Level** - Individual series performance
3. **Comparison Level** - Side-by-side series analysis

---

## 🚀 How Analytics Work

### Architecture

```
┌─────────────────────────────────────┐
│       Main Event Analytics          │
│  (Aggregates ALL series + direct)   │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│  Series 1   │  │  Series 2  │  Individual Series
│  Analytics  │  │  Analytics │  Performance
└─────────────┘  └────────────┘
       │                │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │  Comparison    │  Series vs Series
       │   Analytics    │  Ranking & Insights
       └────────────────┘
```

### Data Flow

**Check-in happens** → **Logged with series_id** → **Multiple analytics views updated** → **Real-time dashboard refresh**

---

## 📈 Analytics Views Available

### 1. Main Event Analytics (Rollup View)

**What it shows:**
- Total series count (active, completed, upcoming)
- Aggregated check-ins across ALL series
- Direct event check-ins (no series)
- Combined metrics (staff, gates, wristbands)
- Average performance per series

**When to use:**
- High-level event overview
- Executive reporting
- Overall event success metrics

**Database View:** `main_event_analytics_detailed`

**Example Query:**
```sql
SELECT * FROM main_event_analytics_detailed
WHERE event_id = 'your-event-id';
```

**Sample Output:**
```
Event: Premier League 2025
├── Total Series: 38
├── Active: 2
├── Completed: 20
├── Upcoming: 16
├── Total Check-ins: 125,450
│   ├── From Series: 120,000
│   └── Direct Event: 5,450
├── Avg per Series: 3,289
└── Total Staff: 145
```

---

### 2. Series Analytics (Individual Performance)

**What it shows:**
- Unique vs total check-ins
- Wristband assignment and utilization
- Staff and gate usage
- Category breakdown
- Time metrics (first/last check-in)

**When to use:**
- Analyzing specific match/session performance
- Identifying attendance patterns
- Operational efficiency per series

**Database View:** `series_analytics_detailed`

**Example Query:**
```sql
SELECT * FROM series_analytics_detailed
WHERE series_id = 'matchday-5-id';
```

**Sample Output:**
```
Series: Matchday 5
├── Unique Check-ins: 3,450
├── Total Scans: 3,892
├── Assigned Wristbands: 4,200
├── Utilization: 82.1%
├── Staff: 8
├── Gates: 4
├── First Check-in: 2025-01-15 17:23:15
└── Last Check-in: 2025-01-15 20:45:32
```

---

### 3. Series Comparison (Ranking & Benchmarking)

**What it shows:**
- Side-by-side series metrics
- Performance ranking
- Peak attendance times
- Revenue comparison
- Staff efficiency

**When to use:**
- Identifying best/worst performing series
- Resource allocation decisions
- Trend analysis across season

**Database View:** `series_comparison`

**Example Query:**
```sql
SELECT * FROM series_comparison
WHERE main_event_id = 'event-id'
ORDER BY utilization_rate DESC;
```

**Sample Output:**
```
Ranking by Utilization:
1. Final (98.5%) - 4,920 check-ins
2. Semi-Final 1 (94.2%) - 4,510 check-ins
3. Matchday 1 (89.1%) - 3,780 check-ins
...
38. Matchday 34 (65.3%) - 2,110 check-ins
```

---

### 4. Category Analytics (Breakdown by Type)

**What it shows:**
- Performance per category (VIP, General, etc.)
- Utilization by category
- Average check-ins per wristband type

**When to use:**
- Understanding audience composition
- Category-specific marketing insights
- Pricing strategy validation

**Database View:** `series_category_analytics`

**Example Query:**
```sql
SELECT * FROM series_category_analytics
WHERE series_id = 'series-id'
ORDER BY assigned_wristbands DESC;
```

**Sample Output:**
```
Matchday 5 - Category Breakdown:
├── General: 3,200 assigned, 2,850 checked in (89.1%)
├── VIP: 800 assigned, 780 checked in (97.5%)
├── Season Ticket: 200 assigned, 195 checked in (97.5%)
└── Staff: 50 assigned, 48 checked in (96.0%)
```

---

### 5. Hourly Analytics (Time-based Insights)

**What it shows:**
- Check-ins by hour
- Peak times
- Distribution throughout the day

**When to use:**
- Staffing optimization
- Gate resource planning
- Understanding arrival patterns

**Database View:** `series_hourly_analytics`

**Example Query:**
```sql
SELECT * FROM series_hourly_analytics
WHERE series_id = 'series-id'
AND check_date = '2025-01-15'
ORDER BY hour_of_day;
```

**Sample Output:**
```
Matchday 5 - Jan 15, 2025:
17:00 - 245 check-ins (6.3%)
18:00 - 892 check-ins (22.9%) ← Peak hour
19:00 - 1,450 check-ins (37.2%) ← Peak hour
20:00 - 780 check-ins (20.0%)
21:00 - 320 check-ins (8.2%)
```

---

## 🎯 Key Metrics Explained

### Utilization Percentage

**Formula:**
```
(Unique Check-ins / Assigned Wristbands) × 100
```

**What it means:**
- **High (>80%)**: Excellent attendance
- **Medium (60-80%)**: Good attendance
- **Low (<60%)**: Underperforming or oversold

**Use case:** Capacity planning, pricing strategy

---

### Check-ins vs Scans

**Check-ins (Unique):** Number of different wristbands scanned
**Scans (Total):** Total number of scan events

**Example:**
```
1 wristband scanned 3 times = 1 check-in, 3 scans
```

**Ratio >1.5:** Indicates multiple entries or exits (if enabled)

---

### Staff Efficiency

**Formula:**
```
Total Check-ins / Number of Staff
```

**Benchmarks:**
- **>500 per staff**: Efficient operation
- **200-500**: Normal operation
- **<200**: Overstaffed or slow throughput

---

### Series Performance Score

**Formula:**
```
(Unique Check-ins × 0.5) + (Utilization Rate × 0.5)
```

**Used for:** Ranking series by overall performance

---

## 📊 Using Analytics in the UI

### Main Event Dashboard

**Location:** Event Details → Analytics Tab

**Shows:**
```
┌─────────────────────────────────────┐
│  MAIN EVENT OVERVIEW                │
├─────────────────────────────────────┤
│  [38 Series] [120K Check-ins]      │
│  [3.2K Avg]  [82% Utilization]     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  SERIES PERFORMANCE TABLE           │
├──────┬─────────┬──────────┬─────────┤
│ #1   │ 3.5K    │ 85%      │ ⭐⭐⭐   │
│ #2   │ 3.2K    │ 78%      │ ⭐⭐⭐   │
│ ...  │ ...     │ ...      │ ...     │
└──────┴─────────┴──────────┴─────────┘
```

### Series Detail View

**Location:** Series Manager → Select Series → View Analytics

**Shows:**
```
┌─────────────────────────────────────┐
│  MATCHDAY 5 ANALYTICS               │
├─────────────────────────────────────┤
│  3,450 unique check-ins             │
│  82.1% utilization                  │
│  Peak: 19:00 (1,450 entries)        │
└─────────────────────────────────────┘

[Category Breakdown Chart]
[Hourly Timeline Chart]
[Staff Performance Metrics]
```

---

## 🔄 Real-time Analytics

### Function: `get_realtime_series_stats(series_id)`

**Returns:**
```json
{
  "series_id": "...",
  "series_name": "Matchday 5",
  "current_checkins": 2450,
  "total_capacity": 4200,
  "utilization_percentage": 58.3,
  "active_gates": 4,
  "active_staff": 8,
  "last_checkin": "2025-01-15T19:45:23Z",
  "checkins_last_hour": 892,
  "checkins_last_15min": 156,
  "is_within_window": true,
  "time_until_window_close": 3600
}
```

**Use case:** Live dashboards, command centers, real-time monitoring

---

## 📥 Exporting Analytics

### CSV Export

**Available formats:**
1. **Series Analytics Export**
   - All series performance data
   - Includes utilization, check-ins, staff metrics

2. **Comparison Export**
   - Side-by-side series comparison
   - Ranking and performance scores

3. **Category Breakdown Export**
   - Per-category performance
   - Utilization by ticket type

**Using the Service:**
```typescript
import seriesAnalyticsService from './services/seriesAnalyticsService';

// Export series analytics
await seriesAnalyticsService.exportSeriesAnalyticsToCsv(
  seriesData,
  'premier_league_2025_analytics.csv'
);

// Export comparison
await seriesAnalyticsService.exportComparisonToCsv(
  comparisonData,
  'series_comparison.csv'
);
```

---

## 🎓 Advanced Analytics Queries

### Top Performing Series

```sql
SELECT * FROM get_series_performance_ranking('event-id')
LIMIT 10;
```

### Compare Specific Series

```sql
SELECT * FROM compare_series_performance(
  ARRAY['series-1-id', 'series-2-id', 'series-3-id']::uuid[]
);
```

### Peak Times Across All Series

```sql
SELECT
  hour_of_day,
  SUM(total_checkins) as total,
  AVG(total_checkins) as average
FROM series_hourly_analytics
WHERE series_id IN (SELECT id FROM event_series WHERE main_event_id = 'event-id')
GROUP BY hour_of_day
ORDER BY total DESC;
```

### Category Performance Across Series

```sql
SELECT
  category,
  COUNT(DISTINCT series_id) as series_count,
  SUM(checked_in_wristbands) as total_checkins,
  AVG(category_utilization) as avg_utilization
FROM series_category_analytics
WHERE series_id IN (SELECT id FROM event_series WHERE main_event_id = 'event-id')
GROUP BY category
ORDER BY total_checkins DESC;
```

---

## 📐 Analytics Best Practices

### 1. **Real-time Monitoring**

For live events:
- Refresh every 30-60 seconds
- Monitor `checkins_last_15min` for flow rate
- Watch utilization to predict capacity

### 2. **Post-Event Analysis**

After events:
- Compare against previous series
- Identify peak hours for future staffing
- Analyze category performance for pricing

### 3. **Trend Analysis**

Across seasons:
- Track utilization trends
- Identify popular vs unpopular series
- Optimize marketing based on patterns

### 4. **Operational Optimization**

Use analytics for:
- **Staff allocation:** Based on historical peak hours
- **Gate management:** Open/close based on flow
- **Capacity planning:** Adjust based on utilization

---

## 🎯 Sample Use Cases

### Use Case 1: Football Season Analysis

**Goal:** Understand which matchdays perform best

```sql
-- Get top 5 matchdays by attendance
SELECT
  series_name,
  unique_checkins,
  utilization_rate,
  rank
FROM get_series_performance_ranking('premier-league-2025')
WHERE series_type = 'standard'
LIMIT 5;
```

**Insights:**
- Derby matches have 95%+ utilization
- Mid-season games drop to 75%
- Finals sell out (100% utilization)

**Action:** Dynamic pricing based on expected utilization

---

### Use Case 2: Festival Multi-Day Planning

**Goal:** Optimize staff for Day 2 based on Day 1 data

```sql
-- Compare Day 1 vs Day 2 hourly patterns
SELECT
  h.hour_of_day,
  MAX(CASE WHEN s.name = 'Day 1' THEN h.total_checkins END) as day1,
  MAX(CASE WHEN s.name = 'Day 2' THEN h.total_checkins END) as day2
FROM series_hourly_analytics h
JOIN event_series s ON h.series_id = s.id
WHERE s.main_event_id = 'festival-id'
GROUP BY h.hour_of_day
ORDER BY h.hour_of_day;
```

**Insights:**
- Day 1 peaks at 18:00 (1,200 entries)
- Day 2 expected similar pattern
- Allocate 60% more staff 17:00-19:00

---

### Use Case 3: VIP vs General Analysis

**Goal:** Justify VIP pricing with attendance data

```sql
SELECT
  category,
  AVG(category_utilization) as avg_utilization,
  AVG(avg_checkins_per_wristband) as avg_entries
FROM series_category_analytics
WHERE series_id IN (SELECT id FROM event_series WHERE main_event_id = 'event-id')
GROUP BY category;
```

**Insights:**
- VIP: 97% utilization, 1.2 avg entries
- General: 82% utilization, 1.0 avg entries
- VIP holders more likely to attend

**Action:** Maintain premium pricing for VIP

---

## 🔧 Troubleshooting Analytics

### Issue: Analytics showing zero

**Check:**
1. Are check-ins being logged with `series_id`?
   ```sql
   SELECT COUNT(*) FROM checkin_logs WHERE series_id IS NOT NULL;
   ```

2. Are views created?
   ```sql
   SELECT viewname FROM pg_views WHERE viewname LIKE '%series%';
   ```

3. Refresh views if needed:
   ```sql
   REFRESH MATERIALIZED VIEW series_analytics_detailed;
   ```

### Issue: Utilization over 100%

**Cause:** More check-ins than assigned wristbands

**Reasons:**
- Walk-ins allowed
- Wristbands not properly assigned
- Multiple entries counted

**Fix:** Review wristband assignment logic

### Issue: Missing series in analytics

**Check:**
1. Series has check-ins?
2. Series linked to main event?
3. RLS policies allowing access?

---

## 📊 Analytics Dashboard Integration

### Adding to Event Details Page

```typescript
import SeriesAnalyticsOverview from '../components/analytics/SeriesAnalyticsOverview';

// In Event Details Page
{activeTab === 'analytics' && event.has_series && (
  <SeriesAnalyticsOverview
    eventId={event.id}
    eventName={event.name}
  />
)}
```

### Real-time Dashboard

```typescript
import { useEffect, useState } from 'react';
import seriesAnalyticsService from '../services/seriesAnalyticsService';

function LiveSeriesDashboard({ seriesId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await seriesAnalyticsService.getRealtimeSeriesStats(seriesId);
      setStats(data);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [seriesId]);

  return (
    <div>
      <h2>Live Stats</h2>
      <p>Current Check-ins: {stats?.current_checkins}</p>
      <p>Last 15 min: {stats?.checkins_last_15min}</p>
      <p>Utilization: {stats?.utilization_percentage}%</p>
    </div>
  );
}
```

---

## 🎉 Summary

The multi-series analytics system provides:

✅ **3-Level Analytics** - Main Event, Series, Comparison
✅ **Real-time Insights** - Live check-in monitoring
✅ **Category Breakdown** - Performance by ticket type
✅ **Time-based Analysis** - Hourly patterns
✅ **Export Capabilities** - CSV reports
✅ **Performance Ranking** - Best/worst series identification
✅ **Operational Metrics** - Staff efficiency, gate usage

**Use it to:**
- Optimize operations
- Improve attendance
- Validate pricing
- Plan resources
- Identify trends

---

**Version:** 1.0
**Last Updated:** 2025-10-18
**Compatible With:** PostgreSQL 14+, Supabase
