# Self-Healing System - Quick Start Guide

## TL;DR

Your app now has multiple layers of protection against RLS infinite recursion and database hangs:

1. ✅ **Automatic timeouts** - Queries timeout after 5-8 seconds
2. ✅ **Circuit breakers** - Stop hammering broken services
3. ✅ **Health checks** - Detect issues before they cause crashes
4. ✅ **Auto-recovery** - Automatically clear caches and retry
5. ✅ **Error boundaries** - Catch errors and recover gracefully
6. ✅ **Performance monitoring** - Track slow queries

## What Changed

### Before (Broken)
```typescript
// Could hang forever if RLS had infinite recursion
const orgs = await supabase.from('organizations').select('*');
```

### After (Protected)
```typescript
// Automatically protected with timeout, circuit breaker, and monitoring
const orgs = await safeQuery(
  () => supabase.from('organizations').select('*'),
  {
    operationName: 'getOrganizations',
    critical: false,
    fallback: () => []
  }
);
```

## How to Use

### 1. Wrap Database Queries

Anywhere you're calling Supabase directly, wrap it in `safeQuery`:

```typescript
import { safeQuery } from '../utils/selfHealing';

// Before
const { data } = await supabase.from('events').select('*');

// After
const data = await safeQuery(
  async () => {
    const { data, error } = await supabase.from('events').select('*');
    if (error) throw error;
    return data;
  },
  {
    operationName: 'getEvents',
    critical: false,
    fallback: () => []
  }
);
```

### 2. Add Error Boundaries

Wrap major sections of your app:

```tsx
import { ErrorBoundary } from '../components/ErrorBoundary';

<ErrorBoundary enableAutoRecovery={true}>
  <YourComponent />
</ErrorBoundary>
```

### 3. Add Health Monitor (Optional)

Add the health monitor to your dashboard:

```tsx
import SystemHealthMonitor from '../components/SystemHealthMonitor';

<SystemHealthMonitor autoRefresh={true} refreshInterval={30000} />
```

## Quick Test

Test that the system works:

```typescript
// This will timeout after 2 seconds instead of hanging forever
try {
  await safeQuery(
    () => new Promise(resolve => setTimeout(resolve, 10000)),
    { operationName: 'test', timeout: 2000 }
  );
} catch (error) {
  console.log('Timeout worked!', error.message);
}
```

## Common Patterns

### Pattern 1: Critical Auth Queries

```typescript
const { data: { user } } = await safeQuery(
  () => supabase.auth.getUser(),
  {
    operationName: 'getUser',
    critical: true, // Uses 5s timeout instead of 8s
  }
);
```

### Pattern 2: Lists with Fallback

```typescript
const events = await safeQuery(
  () => eventService.getEvents(),
  {
    operationName: 'getEvents',
    fallback: () => [] // Return empty array on failure
  }
);
```

### Pattern 3: Single Item with Null Fallback

```typescript
const event = await safeQuery(
  () => eventService.getEvent(id),
  {
    operationName: 'getEvent',
    fallback: () => null
  }
);
```

## Monitoring

### Check System Health

```typescript
import { performHealthCheck } from '../utils/selfHealing';

const health = await performHealthCheck();
console.log('System healthy?', health.healthy);
```

### Check Circuit Breakers

```typescript
import { circuitBreaker } from '../utils/selfHealing';

const stats = circuitBreaker.getAllStats();
console.log('Circuit breaker states:', stats);
```

### Check Performance

```typescript
import { performanceMonitor } from '../utils/selfHealing';

const summary = performanceMonitor.getSummary();
console.log('Performance:', summary);
```

## Debugging

### Circuit Breaker is Open

If you see "Circuit breaker is OPEN" errors:

```typescript
// Reset the circuit
import { circuitBreaker } from '../utils/selfHealing';
circuitBreaker.reset('operationName');

// Or reset all
circuitBreaker.resetAll();
```

### Health Check Failing

```typescript
// Run health check to see what's broken
import { checkSystemHealth } from '../utils/selfHealing';

const health = await checkSystemHealth();
console.log('Issues:', health.errors);
```

### Clear Everything

```typescript
// Nuclear option - clear all caches and reset everything
localStorage.clear();
sessionStorage.clear();
circuitBreaker.resetAll();
window.location.reload();
```

## Configuration

Edit `src/utils/selfHealing.ts` to adjust:

```typescript
const CONFIG = {
  DEFAULT_TIMEOUT: 8000,           // 8 seconds for normal queries
  CRITICAL_QUERY_TIMEOUT: 5000,    // 5 seconds for critical queries
  FAILURE_THRESHOLD: 3,            // Open circuit after 3 failures
  HALF_OPEN_TIMEOUT: 30000,        // Wait 30s before testing recovery
};
```

## Events

Listen to system events:

```typescript
// Performance alerts
window.addEventListener('performance-alert', (event) => {
  console.log('Slow query:', event.detail.message);
});

// Circuit breaker changes
window.addEventListener('circuit-breaker-state-change', (event) => {
  console.log('Circuit state:', event.detail.newState);
});
```

## When to Use What

| Situation | Use This |
|-----------|----------|
| Normal database query | `safeQuery` with default settings |
| Auth/profile query | `safeQuery` with `critical: true` |
| List that can be empty | Add `fallback: () => []` |
| Optional single item | Add `fallback: () => null` |
| Major app section | Wrap in `<ErrorBoundary>` |
| Known slow query | Increase timeout |
| Dev dashboard | Add `<SystemHealthMonitor>` |

## What Happens if RLS Breaks Again?

1. **5-8 seconds**: Query times out (instead of hanging forever)
2. **After 3 failures**: Circuit breaker opens (stop trying)
3. **Error boundary catches it**: Shows error UI (instead of white screen)
4. **Auto-recovery kicks in**: Clears caches, resets circuits
5. **Health check runs**: Detects the issue
6. **User sees**: Error message with "Try Again" button
7. **After 30 seconds**: Circuit breaker tries again (half-open state)

**Result**: App stays responsive, users can recover, you get clear error messages

## Files Modified

- ✅ `src/utils/selfHealing.ts` - Core self-healing utilities (NEW)
- ✅ `src/components/ErrorBoundary.tsx` - Enhanced with auto-recovery
- ✅ `src/components/SystemHealthMonitor.tsx` - Health dashboard (NEW)
- ✅ `src/contexts/OrganizationContext.tsx` - Now uses safe queries
- ✅ `src/App.tsx` - Startup health check + enhanced error boundary

## Next Steps

1. **Test it**: Try the system with the test queries above
2. **Monitor it**: Add health monitor to your dev dashboard
3. **Migrate queries**: Gradually wrap existing queries with `safeQuery`
4. **Tune it**: Adjust timeouts based on your needs
5. **Watch logs**: Monitor for circuit breaker opens and slow queries

## Support

For detailed documentation, see `SELF_HEALING_SYSTEM.md`

For RLS policy fixes, see `fix_rls_with_super_admin.sql`

## Summary

You now have a production-ready self-healing system that:

- ✅ Prevents infinite hangs
- ✅ Fails fast when things are broken
- ✅ Automatically recovers from failures
- ✅ Provides clear visibility
- ✅ Protects user experience

**The app will never hang forever again.** 🎉
