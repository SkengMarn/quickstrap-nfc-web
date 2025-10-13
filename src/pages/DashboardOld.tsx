import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DashboardMetrics,
  fetchDashboardData,
  CheckinTrend,
  LocationData,
  UserRoleDistribution
} from '../services/dashboardService';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import LiveCheckinFeed from '../components/dashboard/LiveCheckinFeed';

// Icons from lucide-react
import {
  Activity,
  Clock,
  RefreshCw,
  CheckCircle,
  Users,
  MapPin,
  Wifi,
  WifiOff,
  TrendingUp,
  User,
  Watch,
  Brain
} from 'lucide-react';

// Chart components from recharts
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Extend DashboardMetrics with UI-specific state
interface DashboardState extends DashboardMetrics {
  isLoading: boolean;
  error: string | null;
  lastRefreshed: string;
  autoRefresh: boolean;
}

// Initial state with type safety
const getInitialState = (): DashboardState => ({
  // Core metrics from DashboardMetrics
  totalEvents: 0,
  activeEvents: 0,
  totalWristbands: 0,
  activeWristbands: 0,
  totalCheckins: 0,
  totalVerifications: 0,
  successRate: 0,
  avgVerificationTime: 0,
  locationCounts: {},
  hourlyData: [],
  recentCheckins: [],
  systemStatus: 'offline' as const,
  lastUpdated: new Date().toISOString(),
  eventOverview: {
    totalEvents: 0,
    publicEvents: 0,
    totalCapacity: 0,
    currentAttendance: 0,
    avgEventDuration: 0
  },
  checkinTrends: [],
  userRoles: [],
  wristbandUsage: [],
  recentActivity: [],
  checkInsToday: 0,
  wristbandsInUse: 0,
  totalUsers: 0,
  userRolesDistribution: [],
  locationData: [],
  performanceMetrics: {
    uptime: 0,
    responseTime: 0,
    errorRate: 0,
    throughput: 0
  },
  // UI state
  isLoading: true,
  error: null,
  lastRefreshed: new Date().toISOString(),
  autoRefresh: true
});

// Chart Components
const DashboardActivityChart = ({ data }: { data: CheckinTrend[] }) => (
  <div className="h-[300px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
        <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
        <YAxis stroke="#6b7280" fontSize={12} />
        <RechartsTooltip />
        <Area type="monotone" dataKey="checkins" stroke="#7B61FF" fill="#7B61FF" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const DashboardLocationHeatmap = ({ data }: { data: LocationData[] }) => (
  <div className="h-[300px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
        <XAxis type="number" domain={[0, 100]} stroke="#6b7280" fontSize={12} />
        <YAxis type="category" dataKey="location" stroke="#6b7280" fontSize={12} width={100} />
        <RechartsTooltip />
        <Bar dataKey="utilization" fill="#7B61FF" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const DashboardUserRolesPieChart = ({ data }: { data: UserRoleDistribution[] }) => (
  <div className="h-[300px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="count">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  description?: string; 
}) => (
  <Card className="hover:scale-105 transition-transform duration-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>(getInitialState);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch data from the API
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchDashboardData();
      setState(prev => ({
        ...data,
        isLoading: false,
        error: null,
        lastRefreshed: new Date().toISOString(),
        autoRefresh: prev.autoRefresh
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch dashboard data',
        isLoading: false
      }));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    fetchData();
    if (state.autoRefresh) {
      refreshInterval.current = setInterval(fetchData, 30000);
    }
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [state.autoRefresh, fetchData]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (!isRefreshing) {
      fetchData();
    }
  }, [isRefreshing, fetchData]);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }));
  }, []);

  // Render loading state
  if (state.isLoading && !state.lastRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 max-w-md mx-auto bg-red-50 rounded-lg">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{state.error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">NFC Portal Dashboard</h1>
            <p className="text-gray-600">AI-powered autonomous wristband system with real-time intelligence</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-sm text-gray-600">AI Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                state.systemStatus === 'online' ? 'bg-green-500' : 
                state.systemStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600">
                {state.systemStatus === 'online' ? 'All Systems Operational' : 
                 state.systemStatus === 'degraded' ? 'Degraded Performance' : 'System Offline'}
              </span>
            </div>
            <Button
              onClick={() => window.open('/autonomous-operations', '_blank', 'noopener,noreferrer')}
              variant="outline"
              size="sm"
              className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
            >
              <Brain className="w-4 h-4 mr-2" />
              AI Operations Center
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={toggleAutoRefresh}
              variant={state.autoRefresh ? "default" : "outline"}
              size="sm"
            >
              {state.autoRefresh ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
              Auto Refresh
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Events"
            value={formatNumber(state.totalEvents)}
            icon={Activity}
            description={`${state.activeEvents} active`}
          />
          <MetricCard
            title="Total Wristbands"
            value={formatNumber(state.totalWristbands)}
            icon={Watch}
            description={`${state.activeWristbands} active`}
          />
          <MetricCard
            title="Check-ins Today"
            value={formatNumber(state.checkInsToday)}
            icon={Users}
            description={`${state.totalCheckins} total`}
          />
          <MetricCard
            title="Success Rate"
            value={`${state.successRate.toFixed(1)}%`}
            icon={CheckCircle}
            description={`${state.avgVerificationTime.toFixed(1)}s avg time`}
          />
        </div>

        {/* Charts */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity">Activity Trends</TabsTrigger>
            <TabsTrigger value="locations">Location Usage</TabsTrigger>
            <TabsTrigger value="users">User Roles</TabsTrigger>
            <TabsTrigger value="wristbands">Wristband Usage</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                  Check-in Activity Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardActivityChart data={state.checkinTrends} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-600" />
                  Location Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardLocationHeatmap data={state.locationData || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-purple-600" />
                  User Role Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DashboardUserRolesPieChart data={state.userRolesDistribution} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wristbands">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Watch className="w-5 h-5 mr-2 text-orange-600" />
                  Wristband Usage Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {state.wristbandUsage.map((usage, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: usage.color }}
                          />
                          <span className="font-medium text-gray-900">{usage.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {usage.active} / {usage.total}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">({usage.percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${usage.percentage}%`,
                            backgroundColor: usage.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {state.recentActivity.map((item) => (
                <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className={`h-3 w-3 rounded-full mt-2 flex-shrink-0 ${
                    item.status === 'completed' ? 'bg-green-500' :
                    item.status === 'in-progress' ? 'bg-yellow-500' :
                    item.status === 'pending' ? 'bg-blue-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.eventName}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center mt-1 text-sm text-gray-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="truncate">{item.location}</span>
                      <span className="mx-2">•</span>
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {item.action && (
                      <p className="text-xs text-gray-600 mt-1">
                        <User className="w-3 h-3 inline mr-1" />
                        {item.userRole}: {item.action}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Check-in Feed */}
        <div className="mt-8">
          <LiveCheckinFeed />
        </div>

        {/* Footer */}
        <footer className="mt-12 py-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 italic">
            "Faith by itself, if it does not have works, is dead." - James 2:17
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
