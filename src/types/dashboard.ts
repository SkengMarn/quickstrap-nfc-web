// Types for the dashboard application

export interface CheckInLog {
  id: string;
  timestamp: string;
  location: string | null;
  wristband_id: string;
  status?: string;
  created_at: string;
  wristbands?: {
    nfc_id: string;
    category: string;
  };
  events?: {
    name: string;
  };
}

export interface VerificationLog {
  id: string;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
  duration?: number;
  wristband_id: string;
  event_id: string;
}

export interface Wristband {
  id: string;
  nfc_id: string;
  status: 'active' | 'inactive' | 'lost' | 'stolen';
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface EventOverview {
  totalEvents: number;
  publicEvents: number;
  totalCapacity: number;
  currentAttendance: number;
  avgEventDuration: number;
}

export interface CheckinTrend {
  eventId: string;
  eventName: string;
  checkinCount: number;
}

export interface UserRoleDistribution {
  role: string;
  count: number;
}

export interface WristbandUsage {
  category: string;
  active: number;
  inactive: number;
  total: number;
}

export interface RecentActivityItem {
  id: string;
  timestamp: string;
  eventName: string;
  location: string;
  wristbandId: string;
  staffName: string;
  staffAvatar: string | null;
}

export interface DashboardMetrics {
  // Existing metrics
  totalEvents: number;
  activeEvents: number;
  totalWristbands: number;
  activeWristbands: number;
  totalCheckins: number;
  totalVerifications: number;
  successRate: number;
  avgVerificationTime: number;
  locationCounts: Record<string, number>;
  hourlyData: Array<{ hour: string; count: number }>;
  recentCheckins: Array<{ id: string; time: string; location: string }>;
  systemStatus: 'online' | 'offline' | 'degraded';
  lastUpdated: string;
  
  // New analytics data
  eventOverview: EventOverview;
  checkinTrends: CheckinTrend[];
  userRoles: UserRoleDistribution[];
  wristbandUsage: WristbandUsage[];
  recentActivity: RecentActivityItem[];
}

export interface ActivityChartProps {
  metrics: {
    hourlyData: Array<{ hour: string; count: number }>;
  };
}

export interface LiveFeedProps {
  metrics: {
    recentCheckins: Array<{ id: string; time: string; location: string }>;
  };
}

export interface LocationHeatmapProps {
  metrics: {
    locationCounts: Record<string, number>;
  };
}

export interface StatsPanelProps {
  metrics: {
    totalCheckins: number;
    totalVerifications: number;
    avgVerificationTime: number;
    systemStatus: string;
    lastUpdated: string;
  };
}

export interface AnalyticsOverviewProps {
  metrics: {
    hourlyData: Array<{ hour: string; count: number }>;
    successRate: number;
    avgVerificationTime: number;
  };
}

export interface MetricsGridProps {
  metrics: {
    totalEvents: number;
    activeEvents: number;
    totalWristbands: number;
    activeWristbands: number;
    totalCheckins: number;
    totalVerifications: number;
    successRate: number;
    avgVerificationTime: number;
    locationCounts: Record<string, number>;
    hourlyData: Array<{ hour: string; count: number }>;
    recentCheckins: Array<{ id: string; time: string; location: string }>;
    systemStatus: string;
    lastUpdated: string;
    eventOverview: EventOverview;
    checkinTrends: CheckinTrend[];
    userRoles: UserRoleDistribution[];
    wristbandUsage: WristbandUsage[];
    recentActivity: RecentActivityItem[];
  };
}
