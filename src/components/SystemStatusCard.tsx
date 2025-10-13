import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SystemStatusCardProps {
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  lastUpdated: string;
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({
  status,
  lastUpdated,
  uptime,
  responseTime,
  errorRate,
  throughput
}) => {
  const statusConfig = {
    online: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      label: 'All Systems Operational',
    },
    degraded: {
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      label: 'Degraded Performance',
    },
    maintenance: {
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      label: 'Under Maintenance',
    },
    offline: {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      label: 'System Offline',
    },
  }[status];

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    
    return parts.join(' ');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          System Status
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
            {statusConfig.icon}
            <span className="ml-1">{statusConfig.label}</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">Uptime</div>
            <div className="text-lg font-semibold">{formatUptime(uptime)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">Response Time</div>
            <div className="text-lg font-semibold">{responseTime.toFixed(1)} ms</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">Error Rate</div>
            <div className="text-lg font-semibold">{errorRate.toFixed(1)}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">Throughput</div>
            <div className="text-lg font-semibold">{(throughput / 1000).toFixed(1)}k req/min</div>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};
