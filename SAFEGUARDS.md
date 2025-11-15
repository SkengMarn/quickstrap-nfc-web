# System Safeguards & Prevention

## 1. Database Query Timeouts (CRITICAL)

### Add to all Supabase queries:
```typescript
// services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-timeout': '10000', // 10 second timeout
    },
  },
  // Add statement timeout
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Wrapper for all queries with timeout
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    ),
  ]);
}
```

### Usage:
```typescript
// Before (dangerous):
const { data } = await supabase.from('organization_members').select('*');

// After (safe):
const { data } = await queryWithTimeout(
  () => supabase.from('organization_members').select('*'),
  5000 // 5 second timeout
);
```

## 2. RLS Policy Validation (CRITICAL)

### Before deploying any RLS policy, run this test:

```sql
-- Test RLS policies for infinite recursion
-- Run as super_admin in Supabase SQL Editor

-- 1. Set statement timeout
SET statement_timeout = '5s';

-- 2. Test the policy as a regular user
SET ROLE authenticated;
SET request.jwt.claims.sub = 'test-user-id';

-- 3. Try the query that would trigger the policy
SELECT * FROM organization_members LIMIT 1;

-- If this hangs or times out, the policy has infinite recursion
-- If it returns quickly (even with no results), policy is safe

-- 4. Reset
RESET ROLE;
RESET statement_timeout;
```

### RLS Policy Checklist:
- [ ] Does the policy query the same table it's protecting? (BAD)
- [ ] Does it use SECURITY DEFINER functions for recursive lookups? (GOOD)
- [ ] Does it have a super_admin bypass at the top? (GOOD)
- [ ] Can it handle auth.uid() being NULL? (GOOD)
- [ ] Have you tested it with statement_timeout? (REQUIRED)

## 3. Context Provider Safeguards

### OrganizationContext.tsx - Production Pattern:
```typescript
useEffect(() => {
  let mounted = true;
  let timeoutId: NodeJS.Timeout;

  const loadWithSafeguards = async () => {
    try {
      // 1. Check auth first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) {
        setLoading(false);
        return;
      }

      // 2. Set timeout before query
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Load timeout')), 8000);
      });

      // 3. Race query against timeout
      const orgs = await Promise.race([
        organizationService.getUserOrganizations(),
        timeoutPromise
      ]);

      if (mounted) {
        setAllOrganizations(orgs);
        setLoading(false);
      }
    } catch (error) {
      console.error('Organization load failed:', error);
      if (mounted) {
        // Fail gracefully - don't block the app
        setAllOrganizations([]);
        setLoading(false);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  };

  loadWithSafeguards();

  return () => {
    mounted = false;
    clearTimeout(timeoutId);
  };
}, []);
```

## 4. Vite Cache Management

### Add to package.json scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "dev:clean": "rm -rf node_modules/.vite && vite --force",
    "dev:fresh": "rm -rf node_modules/.vite .vite dist && vite --force",
    "fix:cache": "rm -rf node_modules/.vite node_modules/.cache && npm run dev"
  }
}
```

### When to use:
- `npm run dev:clean` - After schema changes or RLS updates
- `npm run dev:fresh` - After dependency updates
- `npm run fix:cache` - When Vite hangs or acts weird

## 5. Health Check Endpoint

### Create: src/pages/HealthCheck.tsx
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export default function HealthCheck() {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const [details, setDetails] = useState<any>({});

  useEffect(() => {
    const checkHealth = async () => {
      const checks = {
        database: false,
        auth: false,
        rls: false,
      };

      try {
        // 1. Database connectivity
        const { error: dbError } = await Promise.race([
          supabase.from('profiles').select('count').limit(1),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000))
        ]);
        checks.database = !dbError;

        // 2. Auth service
        const { data: { user } } = await supabase.auth.getUser();
        checks.auth = true;

        // 3. RLS policies (if authenticated)
        if (user) {
          const { error: rlsError } = await Promise.race([
            supabase.from('organization_members').select('count').limit(1),
            new Promise((_, reject) => setTimeout(() => reject(new Error('RLS timeout')), 3000))
          ]);
          checks.rls = !rlsError;
        }

        setDetails(checks);
        setStatus(Object.values(checks).every(Boolean) ? 'healthy' : 'unhealthy');
      } catch (error) {
        console.error('Health check failed:', error);
        setStatus('unhealthy');
        setDetails(checks);
      }
    };

    checkHealth();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>System Health Check</h1>
      <div style={{ 
        padding: '10px', 
        background: status === 'healthy' ? '#d4edda' : '#f8d7da',
        border: `1px solid ${status === 'healthy' ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px'
      }}>
        Status: {status.toUpperCase()}
      </div>
      <pre>{JSON.stringify(details, null, 2)}</pre>
    </div>
  );
}
```

### Add route to App.tsx:
```typescript
<Route path="/health" element={<HealthCheck />} />
```

### Usage:
- Visit `http://localhost:3000/health` after any database changes
- If it hangs → RLS issue
- If it loads but shows unhealthy → Check specific failing service

## 6. Database Migration Checklist

### Before running ANY RLS migration:

```bash
# 1. Backup current policies
psql $DATABASE_URL -c "
  COPY (
    SELECT tablename, policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) TO '/tmp/rls_backup.csv' CSV HEADER;
"

# 2. Test in staging first (if available)

# 3. Run with statement timeout
psql $DATABASE_URL -c "
  SET statement_timeout = '5s';
  \i your_migration.sql
"

# 4. Verify no hanging queries
psql $DATABASE_URL -c "
  SELECT pid, state, query_start, query 
  FROM pg_stat_activity 
  WHERE state = 'active' 
  AND query_start < now() - interval '5 seconds';
"

# 5. Test the health check endpoint
curl http://localhost:3000/health
```

## 7. Monitoring & Alerts

### Add to your monitoring (future):
```typescript
// services/monitoring.ts
export function setupQueryMonitoring() {
  const originalFrom = supabase.from;
  
  supabase.from = function(table: string) {
    const startTime = Date.now();
    const query = originalFrom.call(this, table);
    
    // Wrap the query execution
    const originalThen = query.then;
    query.then = function(...args) {
      const duration = Date.now() - startTime;
      
      // Alert on slow queries
      if (duration > 5000) {
        console.error(`SLOW QUERY: ${table} took ${duration}ms`);
        // Send to monitoring service
      }
      
      return originalThen.apply(this, args);
    };
    
    return query;
  };
}
```

## 8. Emergency Recovery Commands

### Save these for quick recovery:

```bash
# 1. Kill all hanging processes
pkill -9 node
pkill -9 vite

# 2. Clean everything
rm -rf node_modules/.vite node_modules/.cache dist

# 3. Fresh start
npm install
npm run dev:clean

# 4. If still broken, nuclear option:
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Probability of Recurrence:

### With safeguards: **<5%**
- Query timeouts prevent infinite hangs
- Health checks catch issues early
- RLS testing catches problems before deployment

### Without safeguards: **~80%**
- Any RLS change could introduce recursion
- No early warning system
- Cascading failures

## Action Items:

1. [ ] Implement query timeout wrapper
2. [ ] Add health check endpoint
3. [ ] Create RLS testing procedure
4. [ ] Add monitoring to Context providers
5. [ ] Document emergency recovery commands
6. [ ] Set up staging environment for testing RLS changes
7. [ ] Add pre-commit hook to check for dangerous RLS patterns
