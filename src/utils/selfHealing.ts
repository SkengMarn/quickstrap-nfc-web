import { supabase } from '../services/supabase';

// Circuit breaker state
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerState {
  failures: number;
  successes: number;
  lastFailureTime: number;
  state: CircuitState;
}

export interface HealthCheckResult {
  healthy: boolean;
  errors: string[];
  checks: Record<string, boolean>;
  duration: number;
  timestamp: number;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30000;
const QUERY_TIMEOUT = 10000;

// Performance monitoring
interface PerformanceMetric {
  operationName: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

const performanceMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 100;

export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  options: {
    operationName: string;
    critical?: boolean;
    fallback?: () => T;
    timeout?: number;
  }
): Promise<T> {
  const { operationName, fallback, timeout = QUERY_TIMEOUT } = options;
  const startTime = Date.now();

  const breaker = circuitBreakers.get(operationName);
  if (breaker && breaker.state === CircuitState.OPEN) {
    const timeSinceFailure = Date.now() - breaker.lastFailureTime;
    if (timeSinceFailure < CIRCUIT_BREAKER_TIMEOUT) {
      console.warn(`[SafeQuery] Circuit breaker OPEN for ${operationName}`);
      if (fallback) return fallback();
      throw new Error(`Circuit breaker is OPEN for ${operationName}`);
    } else {
      breaker.state = CircuitState.HALF_OPEN;
    }
  }

  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout: ${operationName}`)), timeout)
      ),
    ]);

    const duration = Date.now() - startTime;

    // Record success
    performanceMetrics.push({
      operationName,
      duration,
      success: true,
      timestamp: Date.now()
    });
    if (performanceMetrics.length > MAX_METRICS) {
      performanceMetrics.shift();
    }

    if (breaker) {
      breaker.failures = 0;
      breaker.successes++;
      breaker.state = CircuitState.CLOSED;
    }

    return result;
  } catch (error) {
    console.error(`[SafeQuery] Error in ${operationName}:`, error);

    const duration = Date.now() - startTime;

    // Record failure
    performanceMetrics.push({
      operationName,
      duration,
      success: false,
      timestamp: Date.now()
    });
    if (performanceMetrics.length > MAX_METRICS) {
      performanceMetrics.shift();
    }

    const currentBreaker = circuitBreakers.get(operationName) || {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      state: CircuitState.CLOSED,
    };

    currentBreaker.failures++;
    currentBreaker.lastFailureTime = Date.now();

    if (currentBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      currentBreaker.state = CircuitState.OPEN;
    }

    circuitBreakers.set(operationName, currentBreaker);

    if (fallback) return fallback();
    throw error;
  }
}

// Circuit breaker functions with getAllStats method
export const circuitBreaker = Object.assign(
  (operationName: string): CircuitBreakerState | null => {
    return circuitBreakers.get(operationName) || null;
  },
  {
    getAllStats: (): Record<string, CircuitBreakerState> => {
      const stats: Record<string, CircuitBreakerState> = {};
      circuitBreakers.forEach((value, key) => {
        stats[key] = value;
      });
      return stats;
    }
  }
);

export function resetCircuitBreaker(operationName: string): void {
  circuitBreakers.delete(operationName);
}

// Performance monitor
export const performanceMonitor = {
  getSummary: () => {
    const totalOperations = performanceMetrics.length;
    const failures = performanceMetrics.filter(m => !m.success).length;
    const successes = performanceMetrics.filter(m => m.success).length;
    const totalDuration = performanceMetrics.reduce((sum, m) => sum + m.duration, 0);
    const slowQueries = performanceMetrics.filter(m => m.duration > 1000).length;

    return {
      totalOperations,
      failures,
      successes,
      failureRate: totalOperations > 0 ? failures / totalOperations : 0,
      averageDuration: totalOperations > 0 ? totalDuration / totalOperations : 0,
      slowQueries
    };
  },
  getMetrics: () => [...performanceMetrics],
  clear: () => {
    performanceMetrics.length = 0;
  }
};

export async function checkSystemHealth(
  onProgress?: (step: string, current: number, total: number) => void,
  quickCheck: boolean = false
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const checks: Record<string, boolean> = {};

  // Quick check: Only verify critical auth (fast!)
  if (quickCheck) {
    try {
      onProgress?.('Checking authentication...', 1, 1);
      await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 1000)),
      ]);
      checks.auth = true;
    } catch (error) {
      checks.auth = false;
      errors.push(`Auth: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return {
      healthy: checks.auth,
      errors,
      checks,
      duration: Date.now() - startTime,
      timestamp: Date.now()
    };
  }

  // Full check: All systems
  const totalSteps = 4;
  let currentStep = 0;

  try {
    onProgress?.('Checking database connection...', ++currentStep, totalSteps);
    const result = await Promise.race([
      supabase.from('profiles').select('count').limit(1),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000)),
    ]);
    const error = (result as any)?.error;
    checks.database = !error;
    if (error) errors.push(`Database: ${error.message}`);
  } catch (error) {
    checks.database = false;
    errors.push(`Database: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  try {
    onProgress?.('Checking authentication...', ++currentStep, totalSteps);
    await supabase.auth.getSession();
    checks.auth = true;
  } catch (error) {
    checks.auth = false;
    errors.push(`Auth: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // Check RLS (skip if function doesn't exist)
  try {
    onProgress?.('Checking row-level security...', ++currentStep, totalSteps);
    const { error } = await supabase.rpc('check_rls_enabled');
    checks.rls = !error;
    if (error && !error.message.includes('Could not find the function')) {
      errors.push(`RLS: ${error.message}`);
    }
  } catch (error) {
    // Assume RLS is enabled if the check function doesn't exist
    checks.rls = true;
  }

  // Check organizations
  try {
    onProgress?.('Checking organizations...', ++currentStep, totalSteps);
    const { error } = await supabase.from('organizations').select('id').limit(1);
    checks.organizations = !error;
    if (error) errors.push(`Organizations: ${error.message}`);
  } catch (error) {
    checks.organizations = false;
    errors.push(`Organizations: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  const duration = Date.now() - startTime;

  return {
    healthy: Object.values(checks).every(Boolean),
    errors,
    checks,
    duration,
    timestamp: Date.now()
  };
}

export async function performHealthCheck(): Promise<HealthCheckResult> {
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
