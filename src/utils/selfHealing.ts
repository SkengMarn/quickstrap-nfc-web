import { supabase } from '../services/supabase';

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30000;
const QUERY_TIMEOUT = 10000;

export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    operationName: string;
    critical?: boolean;
    fallback?: () => T;
    timeout?: number;
  }
): Promise<T> {
  const { operationName, critical = false, fallback, timeout = QUERY_TIMEOUT } = options;

  const breaker = circuitBreakers.get(operationName);
  if (breaker && breaker.state === 'OPEN') {
    const timeSinceFailure = Date.now() - breaker.lastFailureTime;
    if (timeSinceFailure < CIRCUIT_BREAKER_TIMEOUT) {
      console.warn(`[SafeQuery] Circuit breaker OPEN for ${operationName}`);
      if (fallback) return fallback();
      throw new Error(`Circuit breaker is OPEN for ${operationName}`);
    } else {
      breaker.state = 'HALF_OPEN';
    }
  }

  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout: ${operationName}`)), timeout)
      ),
    ]);

    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'CLOSED';
    }

    return result;
  } catch (error) {
    console.error(`[SafeQuery] Error in ${operationName}:`, error);

    const currentBreaker = circuitBreakers.get(operationName) || {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' as const,
    };

    currentBreaker.failures++;
    currentBreaker.lastFailureTime = Date.now();

    if (currentBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      currentBreaker.state = 'OPEN';
    }

    circuitBreakers.set(operationName, currentBreaker);

    if (fallback) return fallback();
    throw error;
  }
}

export function circuitBreaker(operationName: string): CircuitBreakerState | null {
  return circuitBreakers.get(operationName) || null;
}

export function resetCircuitBreaker(operationName: string): void {
  circuitBreakers.delete(operationName);
}

export async function checkSystemHealth(): Promise<{
  healthy: boolean;
  errors: string[];
  checks: Record<string, boolean>;
}> {
  const errors: string[] = [];
  const checks: Record<string, boolean> = {};

  try {
    const result = await Promise.race([
      supabase.from('profiles').select('count').limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000)),
    ]);
    const error = (result as any)?.error;
    checks.database = !error;
    if (error) errors.push(`Database: ${error.message}`);
  } catch (error) {
    checks.database = false;
    errors.push(`Database: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  try {
    await supabase.auth.getSession();
    checks.auth = true;
  } catch (error) {
    checks.auth = false;
    errors.push(`Auth: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return { healthy: Object.values(checks).every(Boolean), errors, checks };
}

export async function performHealthCheck() {
  return checkSystemHealth();
}

export async function attemptRecovery(): Promise<boolean> {
  try {
    circuitBreakers.clear();
    const health = await checkSystemHealth();
    return health.healthy;
  } catch {
    return false;
  }
}
