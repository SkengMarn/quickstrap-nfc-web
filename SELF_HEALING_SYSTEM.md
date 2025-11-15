# Self-Healing System Documentation

## Overview

This document describes the comprehensive self-healing system implemented to prevent and automatically recover from database issues, RLS infinite recursion, and system hangs.

## The Problem We Solved

### What Happened Before

1. **RLS Infinite Recursion** → Organization queries hung indefinitely
2. **Vite Tried to Serve Requests** → React app initialization hung on database queries
3. **Corrupted Node Modules Cache** → Vite's internal state became corrupted from repeated crashes
4. **Complete System Hang** → Even simple HTML files wouldn't load

### Root Cause

```sql
-- BAD: This policy queries the same table it's protecting
CREATE POLICY "org_members_select" ON organization_members
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_members  -- ← Queries itself = infinite loop
    WHERE user_id = auth.uid()
  )
);
```

### Why It Was So Destructive

- **No Timeouts**: Queries hung forever
- **No Circuit Breakers**: Kept retrying failed operations indefinitely
- **No Fallbacks**: App couldn't load when database was stuck
- **Corrupted Cache**: Vite cached the broken state

## The Solution: Self-Healing System

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Application                       │
├─────────────────────────────────────────────────────┤
│  Error Boundary (Auto-Recovery)                     │
├─────────────────────────────────────────────────────┤
│  Circuit Breakers (Fail-Fast Protection)            │
├─────────────────────────────────────────────────────┤
│  Query Timeouts (8s default, 5s critical)           │
├─────────────────────────────────────────────────────┤
│  Health Checks (Proactive Monitoring)               │
├─────────────────────────────────────────────────────┤
│  Performance Monitoring (Slow Query Detection)      │
└─────────────────────────────────────────────────────┘
```

## Components

### 1. Query Timeout Wrapper (`withTimeout`)

**Location**: `src/utils/selfHealing.ts`

**Purpose**: Prevents queries from hanging forever

**Features**:
- Configurable timeouts (default 8s, critical 5s)
- Automatic slow query detection (>3s warning, >5s alert)
- Performance metrics collection
- Graceful timeout errors

**Usage**:
```typescript
import { withTimeout } from '../utils/selfHealing';

const result = await withTimeout(
  () => supabase.from('organizations').select('*'),
  {
    timeout: 5000,
    critical: true,
    circuitBreakerKey: 'getOrganizations'
  }
);
```

### 2. Circuit Breaker Pattern

**Location**: `src/utils/selfHealing.ts` (CircuitBreaker class)

**Purpose**: Prevents cascading failures by failing fast when a service is down

**States**:
- **CLOSED** (Normal): All requests pass through
- **OPEN** (Failing): Reject requests immediately, prevent hammering broken service
- **HALF_OPEN** (Testing): Try a limited number of requests to see if service recovered

**Configuration**:
```typescript
const CONFIG = {
  FAILURE_THRESHOLD: 3,        // Open circuit after 3 failures
  SUCCESS_THRESHOLD: 2,        // Close circuit after 2 successes
  HALF_OPEN_TIMEOUT: 30000,    // Wait 30s before testing recovery
  MAX_CONSECUTIVE_FAILURES: 5, // Clear cache after 5 consecutive failures
};
```

**How It Works**:
1. **CLOSED**: Normal operation, requests pass through
2. **3 Failures**: Circuit opens → reject requests immediately
3. **After 30s**: Transition to HALF_OPEN → try a test request
4. **2 Successes**: Close circuit → back to normal
5. **Any Failure in HALF_OPEN**: Back to OPEN → wait another 30s

### 3. Health Check System

**Location**: `src/utils/selfHealing.ts` (performHealthCheck)

**Purpose**: Proactively detect RLS issues before they cause crashes

**Checks**:
1. **Database Connectivity**: Can we connect to database at all?
2. **RLS Policies**: Can user access their own profile?
3. **Organizations**: Can we query organization_members without hanging?
4. **Profiles**: Can we access profiles table?

**Usage**:
```typescript
import { performHealthCheck } from '../utils/selfHealing';

const health = await performHealthCheck();
if (!health.healthy) {
  console.error('System unhealthy:', health.errors);
  // Take action...
}
```

**Health Check Result**:
```typescript
{
  healthy: boolean,
  checks: {
    database: boolean,
    rls: boolean,
    organizations: boolean,
    profiles: boolean,
  },
  errors: string[],
  timestamp: number,
  duration: number
}
```

### 4. Automatic Recovery System

**Location**: `src/utils/selfHealing.ts` (attemptRecovery)

**Purpose**: Automatically fix common issues when detected

**Recovery Actions**:
1. **Clear Organization Cache**: Remove stale localStorage data
2. **Reset Circuit Breakers**: Allow new attempts after cooldown
3. **Clear Session Cache**: Remove any corrupted session data
4. **Re-run Health Check**: Verify recovery was successful

**When It Triggers**:
- After health check fails
- After 5 consecutive circuit breaker failures
- When error boundary catches database errors
- Manual trigger from UI

### 5. Error Boundary with Auto-Recovery

**Location**: `src/components/ErrorBoundary.tsx`

**Purpose**: Catch React errors and attempt automatic recovery

**Features**:
- Detects database-related errors
- Attempts automatic recovery (max 2 attempts)
- Debounces recovery attempts (5s minimum between attempts)
- Shows recovery status to user
- Manual recovery option
- Reloads page as last resort

**Usage**:
```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

<ErrorBoundary enableAutoRecovery={true}>
  <App />
</ErrorBoundary>
```

### 6. Safe Query Wrapper

**Location**: `src/utils/selfHealing.ts` (safeQuery)

**Purpose**: Convenience wrapper combining timeout, circuit breaker, and monitoring

**Features**:
- Automatic timeout protection
- Circuit breaker integration
- Performance metrics collection
- Fallback support

**Usage**:
```typescript
import { safeQuery } from '../utils/selfHealing';

const orgs = await safeQuery(
  () => organizationService.getUserOrganizations(),
  {
    operationName: 'getUserOrganizations',
    critical: true,
    fallback: () => [], // Return empty array on failure
  }
);
```

### 7. Performance Monitor

**Location**: `src/utils/selfHealing.ts` (PerformanceMonitor class)

**Purpose**: Track query performance and detect degradation

**Features**:
- Records query duration, success/failure
- Calculates average duration and failure rate
- Detects slow queries (>3s warning, >5s alert)
- Keeps last 100 metrics
- Emits events for UI notifications

**Metrics Available**:
- Total operations count
- Average operation duration
- Failure rate (percentage)
- Slow queries count

### 8. System Health Monitor Component

**Location**: `src/components/SystemHealthMonitor.tsx`

**Purpose**: Visual dashboard for system health

**Features**:
- Real-time health status display
- Circuit breaker state visualization
- Performance metrics dashboard
- Recent alerts and errors
- Manual refresh button
- Auto-refresh mode (optional)
- Expandable details

**Usage**:
```tsx
import SystemHealthMonitor from './components/SystemHealthMonitor';

// Basic usage
<SystemHealthMonitor />

// With auto-refresh every 30 seconds
<SystemHealthMonitor autoRefresh={true} refreshInterval={30000} />

// Collapsed by default
<SystemHealthMonitor showDetails={false} />
```

## Integration Points

### App.tsx

```typescript
// Startup health check
useEffect(() => {
  checkSystemHealth()
    .then(health => {
      if (!health.healthy) {
        console.error('System unhealthy on startup');
        // Show warning banner
      }
    });
}, []);

// Wrap entire app with error boundary
<ErrorBoundary enableAutoRecovery={true}>
  <App />
</ErrorBoundary>
```

### OrganizationContext.tsx

```typescript
// Protected organization loading
const orgs = await safeQuery(
  () => organizationService.getUserOrganizations(),
  {
    operationName: 'getUserOrganizations',
    critical: true,
    fallback: () => [],
  }
);

// Handle circuit breaker errors
if (error.message.includes('Circuit breaker is OPEN')) {
  checkSystemHealth().catch(console.error);
}
```

## Configuration

All configuration is centralized in `src/utils/selfHealing.ts`:

```typescript
const CONFIG = {
  // Query timeouts
  DEFAULT_TIMEOUT: 8000,           // 8 seconds
  CRITICAL_QUERY_TIMEOUT: 5000,    // 5 seconds for critical queries

  // Circuit breaker
  FAILURE_THRESHOLD: 3,            // Failures before opening circuit
  SUCCESS_THRESHOLD: 2,            // Successes to close circuit
  HALF_OPEN_TIMEOUT: 30000,        // 30s before testing recovery
  MAX_CONSECUTIVE_FAILURES: 5,     // Failures before cache clear

  // Performance
  SLOW_QUERY_THRESHOLD: 3000,      // 3s = slow
  VERY_SLOW_QUERY_THRESHOLD: 5000, // 5s = very slow
};
```

## Monitoring & Events

The system emits custom events for monitoring:

### Available Events

```typescript
// Performance alert
window.addEventListener('performance-alert', (event) => {
  const { message, timestamp } = event.detail;
  // Handle alert...
});

// Circuit breaker state change
window.addEventListener('circuit-breaker-state-change', (event) => {
  const { key, oldState, newState, stats } = event.detail;
  // Handle state change...
});

// Cache clear triggered
window.addEventListener('self-healing-cache-clear', (event) => {
  const { key, reason } = event.detail;
  // Handle cache clear...
});

// App error caught by error boundary
window.addEventListener('app-error', (event) => {
  const { error, stack, componentStack, isDatabaseError } = event.detail;
  // Handle error...
});
```

## Best Practices

### 1. Always Use Safe Queries

❌ **Bad** (No protection):
```typescript
const orgs = await supabase.from('organizations').select('*');
```

✅ **Good** (Protected):
```typescript
const orgs = await safeQuery(
  () => supabase.from('organizations').select('*'),
  {
    operationName: 'getOrganizations',
    critical: false,
    fallback: () => [],
  }
);
```

### 2. Mark Critical Queries

Critical queries (e.g., auth, profile) should use shorter timeout:

```typescript
const user = await safeQuery(
  () => supabase.auth.getUser(),
  {
    operationName: 'getUser',
    critical: true, // Uses 5s timeout instead of 8s
  }
);
```

### 3. Provide Fallbacks

Always provide sensible fallbacks when possible:

```typescript
// Good: Empty array fallback
const items = await safeQuery(
  () => fetchItems(),
  {
    operationName: 'fetchItems',
    fallback: () => []
  }
);

// Good: Null fallback for single items
const item = await safeQuery(
  () => fetchItem(id),
  {
    operationName: 'fetchItem',
    fallback: () => null
  }
);
```

### 4. Use Unique Circuit Breaker Keys

Different operations should have different keys:

```typescript
// Good
safeQuery(..., { circuitBreakerKey: 'getUserOrganizations' })
safeQuery(..., { circuitBreakerKey: 'getEvents' })
safeQuery(..., { circuitBreakerKey: 'getWristbands' })

// Bad - reusing same key
safeQuery(..., { circuitBreakerKey: 'genericQuery' })
```

### 5. Wrap Components in Error Boundaries

Wrap feature sections with error boundaries:

```tsx
// Good
<ErrorBoundary enableAutoRecovery={true}>
  <EventsPage />
</ErrorBoundary>

// Even better - multiple boundaries
<ErrorBoundary>
  <Header />
</ErrorBoundary>
<ErrorBoundary enableAutoRecovery={true}>
  <MainContent />
</ErrorBoundary>
<ErrorBoundary>
  <Footer />
</ErrorBoundary>
```

## Debugging

### Check Circuit Breaker Status

```typescript
import { circuitBreaker } from './utils/selfHealing';

// Get all circuit states
const stats = circuitBreaker.getAllStats();
console.log('Circuit breaker states:', stats);

// Reset a specific circuit
circuitBreaker.reset('getUserOrganizations');

// Reset all circuits
circuitBreaker.resetAll();
```

### Check Performance Metrics

```typescript
import { performanceMonitor } from './utils/selfHealing';

// Get summary
const summary = performanceMonitor.getSummary();
console.log('Performance summary:', summary);

// Get all metrics
const metrics = performanceMonitor.getMetrics();
console.log('Recent operations:', metrics);

// Get metrics for specific operation
const avgDuration = performanceMonitor.getAverageDuration('getUserOrganizations');
const failureRate = performanceMonitor.getFailureRate('getUserOrganizations');
```

### Run Manual Health Check

```typescript
import { performHealthCheck } from './utils/selfHealing';

const health = await performHealthCheck();
console.log('Health check result:', health);
```

## Testing the System

### 1. Test Timeout Protection

Simulate slow query:
```typescript
const slowQuery = () => new Promise(resolve => setTimeout(resolve, 10000));
await safeQuery(slowQuery, { operationName: 'slowTest', timeout: 2000 });
// Should timeout after 2s
```

### 2. Test Circuit Breaker

Simulate repeated failures:
```typescript
for (let i = 0; i < 5; i++) {
  try {
    await safeQuery(
      () => Promise.reject(new Error('Test failure')),
      { operationName: 'testCircuit' }
    );
  } catch (error) {
    console.log(`Attempt ${i + 1} failed`);
  }
}
// Circuit should open after 3 failures
```

### 3. Test Error Boundary Recovery

Trigger an error in a component:
```tsx
const BrokenComponent = () => {
  throw new Error('Database timeout');
};

<ErrorBoundary enableAutoRecovery={true}>
  <BrokenComponent />
</ErrorBoundary>
// Should show error UI and attempt recovery
```

## Maintenance

### Regular Tasks

1. **Monitor Performance Metrics** (weekly)
   - Check average query duration
   - Identify slow queries
   - Review failure rates

2. **Review Circuit Breaker Stats** (weekly)
   - Check which circuits are opening frequently
   - Investigate root causes
   - Adjust thresholds if needed

3. **Analyze Health Check Logs** (daily)
   - Look for recurring failures
   - Check RLS policy performance
   - Monitor database connectivity

### Tuning

Adjust timeouts based on your needs:

```typescript
// For fast queries (e.g., cached data)
{ timeout: 2000 }

// For normal queries
{ timeout: 8000 } // default

// For complex queries (reports, analytics)
{ timeout: 15000 }
```

Adjust circuit breaker thresholds:

```typescript
CONFIG.FAILURE_THRESHOLD = 5; // More tolerant
CONFIG.HALF_OPEN_TIMEOUT = 60000; // Wait longer before retry
```

## Future Enhancements

Potential improvements:

1. **Exponential Backoff**: Gradually increase wait time between retries
2. **Retry Logic**: Automatically retry failed queries with backoff
3. **Distributed Circuit Breakers**: Share state across browser tabs
4. **Server-Side Health Checks**: API endpoint for health status
5. **Analytics Integration**: Send metrics to monitoring service
6. **Smart Caching**: Cache successful responses to reduce queries
7. **Request Deduplication**: Merge identical concurrent requests
8. **Query Queue**: Queue requests when circuit is open

## Troubleshooting

### System Keeps Going Unhealthy

1. Check RLS policies for circular dependencies
2. Review database logs for slow queries
3. Verify network connectivity
4. Check Supabase dashboard for errors

### Circuit Breaker Opens Too Often

1. Increase FAILURE_THRESHOLD
2. Check if queries are genuinely slow
3. Optimize database queries
4. Add database indexes

### Recovery Fails Repeatedly

1. Check browser console for errors
2. Clear browser cache manually
3. Verify RLS policies are correct
4. Check database migrations

### Performance Degradation

1. Review slow query logs
2. Check database connection pool
3. Optimize queries with indexes
4. Consider caching strategies

## Summary

The self-healing system provides multiple layers of protection:

1. **Prevention**: Health checks catch issues early
2. **Protection**: Timeouts prevent infinite hangs
3. **Isolation**: Circuit breakers prevent cascading failures
4. **Recovery**: Automatic recovery clears caches and resets state
5. **Visibility**: Monitoring shows system health in real-time

This comprehensive approach ensures that even if RLS issues occur again, the system will:
- Detect them quickly (within 5-8 seconds)
- Fail gracefully (show errors instead of hanging)
- Attempt automatic recovery (clear caches, reset circuits)
- Provide visibility (health dashboard, alerts)
- Allow manual intervention (recovery buttons, circuit resets)

The system is designed to be resilient, self-healing, and maintainable, preventing the catastrophic failures that occurred before.
