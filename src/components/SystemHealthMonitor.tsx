import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  LinearProgress,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  performHealthCheck,
  circuitBreaker,
  performanceMonitor,
  HealthCheckResult,
  CircuitState,
  CircuitBreakerState,
} from '../utils/selfHealing';

interface SystemHealthMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  showDetails?: boolean;
}

/**
 * System Health Monitor Component
 *
 * Displays real-time system health status including:
 * - Database connectivity
 * - RLS policy status
 * - Circuit breaker states
 * - Performance metrics
 * - Recent errors
 */
export const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({
  autoRefresh = false,
  refreshInterval = 30000,
  showDetails = true,
}) => {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const result = await performHealthCheck();
      setHealth(result);

      // Check for new alerts
      if (!result.healthy) {
        const newAlert = `Health check failed at ${new Date().toLocaleTimeString()}: ${result.errors.join(', ')}`;
        setAlerts(prev => [newAlert, ...prev].slice(0, 5)); // Keep last 5 alerts
      }
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial health check
    runHealthCheck();

    // Auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(runHealthCheck, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    // Listen for performance alerts
    const handlePerformanceAlert = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message } = customEvent.detail;
      setAlerts(prev => [`Performance: ${message}`, ...prev].slice(0, 5));
    };

    // Listen for circuit breaker state changes
    const handleCircuitStateChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { key, newState } = customEvent.detail;
      if (newState === CircuitState.OPEN) {
        setAlerts(prev => [`Circuit breaker OPEN: ${key}`, ...prev].slice(0, 5));
      }
    };

    window.addEventListener('performance-alert', handlePerformanceAlert);
    window.addEventListener('circuit-breaker-state-change', handleCircuitStateChange);

    return () => {
      window.removeEventListener('performance-alert', handlePerformanceAlert);
      window.removeEventListener('circuit-breaker-state-change', handleCircuitStateChange);
    };
  }, []);

  if (!health) {
    return (
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="body2">Loading system health...</Typography>
        <LinearProgress />
      </Paper>
    );
  }

  const getHealthIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircleIcon color="success" />
    ) : (
      <ErrorIcon color="error" />
    );
  };

  const getHealthColor = (healthy: boolean): 'success' | 'error' => {
    return healthy ? 'success' : 'error';
  };

  const circuitStats = circuitBreaker.getAllStats();
  const perfSummary = performanceMonitor.getSummary();

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getHealthIcon(health.healthy)}
          <Typography variant="h6">
            System Health
          </Typography>
          <Chip
            label={health.healthy ? 'Healthy' : 'Unhealthy'}
            color={getHealthColor(health.healthy)}
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={runHealthCheck}
            disabled={loading}
          >
            Refresh
          </Button>
          {showDetails && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Summary */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Database
          </Typography>
          <Chip
            label={health.checks.database ? 'Connected' : 'Failed'}
            color={health.checks.database ? 'success' : 'error'}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            RLS Policies
          </Typography>
          <Chip
            label={health.checks.rls ? 'OK' : 'Failed'}
            color={health.checks.rls ? 'success' : 'error'}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Organizations
          </Typography>
          <Chip
            label={health.checks.organizations ? 'OK' : 'Failed'}
            color={health.checks.organizations ? 'success' : 'error'}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Response Time
          </Typography>
          <Chip
            label={`${health.duration}ms`}
            color={health.duration < 2000 ? 'success' : health.duration < 5000 ? 'warning' : 'error'}
            size="small"
            sx={{ ml: 1 }}
          />
        </Box>
      </Box>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Recent Alerts ({alerts.length})</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {alerts.map((alert, index) => (
              <Typography component="li" key={index} variant="caption">
                {alert}
              </Typography>
            ))}
          </Box>
        </Alert>
      )}

      {/* Detailed Information */}
      <Collapse in={expanded && showDetails}>
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          {/* Errors */}
          {health.errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>Errors</AlertTitle>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {health.errors.map((error: string, index: number) => (
                  <Typography component="li" key={index} variant="caption">
                    {error}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}

          {/* Circuit Breakers */}
          <Typography variant="subtitle2" gutterBottom>
            Circuit Breakers
          </Typography>
          {Object.keys(circuitStats).length > 0 ? (
            <Box sx={{ mb: 2 }}>
              {Object.entries(circuitStats).map(([key, statsEntry]) => {
                const stats = statsEntry as CircuitBreakerState;
                return (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      bgcolor: 'background.default',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <Typography variant="caption">{key}</Typography>
                    <Chip
                      label={stats.state}
                      color={
                        stats.state === CircuitState.CLOSED
                          ? 'success'
                          : stats.state === CircuitState.HALF_OPEN
                          ? 'warning'
                          : 'error'
                      }
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Failures: {stats.failures} | Successes: {stats.successes}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              No circuit breakers active
            </Typography>
          )}

          {/* Performance Metrics */}
          <Typography variant="subtitle2" gutterBottom>
            Performance Metrics
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
            <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Total Operations
              </Typography>
              <Typography variant="body2">{perfSummary.totalOperations}</Typography>
            </Box>

            <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Avg Duration
              </Typography>
              <Typography variant="body2">{perfSummary.averageDuration.toFixed(0)}ms</Typography>
            </Box>

            <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Failure Rate
              </Typography>
              <Typography variant="body2">
                {(perfSummary.failureRate * 100).toFixed(1)}%
              </Typography>
            </Box>

            <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Slow Queries
              </Typography>
              <Typography variant="body2">{perfSummary.slowQueries}</Typography>
            </Box>
          </Box>

          <Typography variant="caption" color="text.secondary">
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default SystemHealthMonitor;
