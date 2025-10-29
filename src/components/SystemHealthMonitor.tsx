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
  circuitBreaker as getCircuitBreaker,
} from '../utils/selfHealing';

// Define types since they're not exported from simplified version
interface HealthCheckResult {
  healthy: boolean;
  errors: string[];
  checks: Record<string, boolean>;
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval]);

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
        {Object.entries(health.checks).map(([key, value]) => (
          <Box key={key}>
            <Typography variant="caption" color="text.secondary">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Typography>
            <Chip
              label={value ? 'OK' : 'Failed'}
              color={value ? 'success' : 'error'}
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
        ))}
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
                {health.errors.map((error, index) => (
                  <Typography component="li" key={index} variant="caption">
                    {error}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}

          <Typography variant="caption" color="text.secondary">
            System health monitoring active
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default SystemHealthMonitor;
