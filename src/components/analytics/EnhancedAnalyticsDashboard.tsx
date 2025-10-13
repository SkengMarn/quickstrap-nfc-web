import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Clock,
  Activity,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchEventAnalytics,
  fetchTimeSeriesData,
  fetchGatePerformance,
  fetchCategoryInsights,
} from '../../services/analyticsService';
import type {
  EventAnalytics,
  TimeSeriesData,
  GatePerformanceComparison,
  CategoryInsights,
} from '../../types/portal';
import { formatDate } from '../../lib/utils';

const COLORS = ['#7B61FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];

export interface EnhancedAnalyticsDashboardProps {
  eventId: string;
}

const EnhancedAnalyticsDashboard: React.FC<EnhancedAnalyticsDashboardProps> = ({ eventId }) => {
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [gatePerformance, setGatePerformance] = useState<GatePerformanceComparison[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsights[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeInterval, setTimeInterval] = useState<'hour' | 'day'>('hour');
  const [error, setError] = useState<string | null>(null);

  // Early return if no eventId provided
  if (!eventId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">No event selected for analytics</p>
        </div>
      </div>
    );
  }

  const loadAnalytics = async () => {
    if (!eventId) return;

    setLoading(true);
    setError(null);
    
    try {
      // Load analytics with individual error handling to prevent crashes
      const results = await Promise.allSettled([
        fetchEventAnalytics(eventId),
        fetchTimeSeriesData(eventId, timeInterval),
        fetchGatePerformance(eventId),
        fetchCategoryInsights(eventId),
      ]);

      // Handle each result individually
      const [analyticsRes, timeSeriesRes, gateRes, categoryRes] = results;

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.success && analyticsRes.value.data) {
        setAnalytics(analyticsRes.value.data);
      } else if (analyticsRes.status === 'rejected') {
        console.warn('Analytics fetch failed:', analyticsRes.reason);
      }

      if (timeSeriesRes.status === 'fulfilled' && timeSeriesRes.value.success && timeSeriesRes.value.data) {
        setTimeSeriesData(timeSeriesRes.value.data);
      } else if (timeSeriesRes.status === 'rejected') {
        console.warn('Time series fetch failed:', timeSeriesRes.reason);
      }

      if (gateRes.status === 'fulfilled' && gateRes.value.success && gateRes.value.data) {
        setGatePerformance(gateRes.value.data);
      } else if (gateRes.status === 'rejected') {
        console.warn('Gate performance fetch failed:', gateRes.reason);
      }

      if (categoryRes.status === 'fulfilled' && categoryRes.value.success && categoryRes.value.data) {
        setCategoryInsights(categoryRes.value.data);
      } else if (categoryRes.status === 'rejected') {
        console.warn('Category insights fetch failed:', categoryRes.reason);
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    if (eventId) {
      loadAnalytics().catch((error) => {
        if (error.name === 'AbortError') {
          return; // Ignore abort errors
        }
        if (isMounted) {
          console.error('Error in useEffect:', error);
          setError(error instanceof Error ? error.message : 'Failed to initialize analytics');
          setLoading(false);
        }
      });
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eventId, timeInterval]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert('Export functionality coming soon!');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Error loading analytics</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button 
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load analytics</p>
          <button 
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Prepare data for charts with error handling
  let categoryDistributionData: Array<{name: string, value: number}> = [];
  try {
    categoryDistributionData = analytics.category_distribution 
      ? Object.entries(analytics.category_distribution).map(([name, value]) => ({ name, value }))
      : [];
  } catch (error) {
    console.warn('Error preparing category distribution data:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{analytics.event_name}</h1>
            <p className="text-gray-600">
              Comprehensive Analytics • {formatDate(analytics.start_date)} -{' '}
              {formatDate(analytics.end_date)}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleExport} variant="default" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Attendance</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics.unique_attendees.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {analytics.total_checkins.toLocaleString()} check-ins
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics.avg_processing_time.toFixed(1)}
                    <span className="text-lg text-gray-500">ms</span>
                  </p>
                  <p className="text-sm text-green-600 flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Excellent
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gates Used</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.gates_used}</p>
                  <p className="text-sm text-gray-500">{analytics.staff_worked} staff members</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Capacity Utilization</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics.capacity_utilization?.toFixed(1) || 'N/A'}
                    <span className="text-lg text-gray-500">%</span>
                  </p>
                  <p className="text-sm text-gray-500">Peak efficiency</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">Timeline Analysis</TabsTrigger>
            <TabsTrigger value="gates">Gate Performance</TabsTrigger>
            <TabsTrigger value="categories">Category Insights</TabsTrigger>
            <TabsTrigger value="summary">Event Summary</TabsTrigger>
          </TabsList>

          {/* Timeline Analysis */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Check-in Timeline</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={timeInterval === 'hour' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeInterval('hour')}
                    >
                      Hourly
                    </Button>
                    <Button
                      variant={timeInterval === 'day' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeInterval('day')}
                    >
                      Daily
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={(value: any) =>
                          timeInterval === 'hour'
                            ? new Date(value).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : formatDate(value)
                        }
                      />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e0e4e7' }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="checkins"
                        stroke="#7B61FF"
                        fill="#7B61FF"
                        fillOpacity={0.3}
                        name="Check-ins"
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative_checkins"
                        stroke="#4ECDC4"
                        fill="#4ECDC4"
                        fillOpacity={0.1}
                        name="Cumulative"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {analytics.peak_attendance_time && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Peak Attendance: {new Date(analytics.peak_attendance_time).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gate Performance */}
          <TabsContent value="gates">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gate Check-in Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gatePerformance} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
                        <XAxis type="number" stroke="#6b7280" fontSize={12} />
                        <YAxis
                          type="category"
                          dataKey="gate_name"
                          stroke="#6b7280"
                          fontSize={12}
                          width={120}
                        />
                        <Tooltip />
                        <Bar dataKey="total_checkins" fill="#7B61FF" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gate Efficiency Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {gatePerformance.map((gate) => (
                      <div key={gate.gate_id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{gate.gate_name}</h4>
                          <span className="text-sm text-gray-500">
                            {gate.total_checkins} check-ins
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Avg Time</p>
                            <p className="font-medium">{gate.avg_processing_time_ms.toFixed(0)}ms</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Utilization</p>
                            <p className="font-medium">{gate.utilization_percentage.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Efficiency</p>
                            <p className="font-medium">{gate.staff_efficiency.toFixed(1)}</p>
                          </div>
                        </div>
                        {gate.bottleneck_score > 50 && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                            ⚠️ Potential bottleneck detected
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Category Insights */}
          <TabsContent value="categories">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Category Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryDistributionData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={(props: any) =>
                            `${props.name} (${(props.percent * 100).toFixed(0)}%)`
                          }
                        >
                          {categoryDistributionData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Performance Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto">
                    {categoryInsights.map((category, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{category.category}</h4>
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-gray-600">Total Wristbands</p>
                            <p className="font-medium">{category.total_wristbands}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Check-ins</p>
                            <p className="font-medium">{category.total_checkins}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">No-Show Rate</p>
                            <p
                              className={`font-medium ${
                                category.no_show_rate > 20 ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {category.no_show_rate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Avg Check-in</p>
                            <p className="font-medium text-xs">
                              {category.avg_checkin_time
                                ? new Date(category.avg_checkin_time).toLocaleTimeString()
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                        {category.preferred_gates.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-600 mb-1">Preferred Gates:</p>
                            <div className="flex flex-wrap gap-1">
                              {category.preferred_gates.map((gate) => (
                                <span
                                  key={gate}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  {gate}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Event Summary */}
          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle>Event Summary Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4">Attendance Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Unique Attendees:</span>
                          <span className="font-medium">
                            {analytics.unique_attendees.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Check-ins:</span>
                          <span className="font-medium">
                            {analytics.total_checkins.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Check-ins per Attendee:</span>
                          <span className="font-medium">
                            {(analytics.total_checkins / analytics.unique_attendees).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4">Operational Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gates Deployed:</span>
                          <span className="font-medium">{analytics.gates_used}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Staff Members:</span>
                          <span className="font-medium">{analytics.staff_worked}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Processing Time:</span>
                          <span className="font-medium">
                            {analytics.avg_processing_time.toFixed(1)}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Key Insights</h4>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        <span>
                          Processing times averaged {analytics.avg_processing_time.toFixed(1)}ms,
                          indicating {analytics.avg_processing_time < 2000 ? 'excellent' : 'good'}{' '}
                          gate efficiency
                        </span>
                      </li>
                      {gatePerformance.length > 0 && (
                        <li className="flex items-start">
                          <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>
                            Busiest gate: {gatePerformance[0].gate_name} with{' '}
                            {gatePerformance[0].total_checkins} check-ins
                          </span>
                        </li>
                      )}
                      {categoryInsights.length > 0 && (
                        <li className="flex items-start">
                          <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          <span>
                            Most popular category: {categoryInsights[0].category} (
                            {categoryInsights[0].total_wristbands} wristbands)
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAnalyticsDashboard;
