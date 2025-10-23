import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { BarChart3, TrendingUp, Users, Clock, MapPin, Shield, Download, Calendar } from 'lucide-react';

interface AnalyticsData {
  summary: {
    total_attendance: number;
    unique_attendees: number;
    peak_attendance_time: string;
    avg_entry_time: number;
    capacity_utilization: number;
    no_show_rate: number;
  };
  hourly_checkins: { hour: string; count: number }[];
  gate_performance: { gate: string; checkins: number; avg_time: number; efficiency: number }[];
  category_breakdown: { category: string; count: number; percentage: number }[];
  staff_performance: { name: string; scans: number; efficiency: number }[];
  fraud_incidents: { type: string; count: number; prevented_loss: number }[];
}

interface EventAnalyticsDashboardProps {
  eventId: string;
  eventName: string;
}

const EventAnalyticsDashboard: React.FC<EventAnalyticsDashboardProps> = ({ eventId, eventName }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('all');
  const [selectedView, setSelectedView] = useState<'overview' | 'gates' | 'categories' | 'staff' | 'security'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [eventId, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [summary, hourly, gates, categories, staff, security] = await Promise.all([
        fetchEventSummary(),
        fetchHourlyCheckins(),
        fetchGatePerformance(),
        fetchCategoryBreakdown(),
        fetchStaffPerformance(),
        fetchSecurityMetrics()
      ]);

      setAnalyticsData({
        summary,
        hourly_checkins: hourly,
        gate_performance: gates,
        category_breakdown: categories,
        staff_performance: staff,
        fraud_incidents: security
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventSummary = async () => {
    const { data: checkins } = await supabase
      .from('checkin_logs')
      .select('wristband_id, timestamp, status')
      .eq('event_id', eventId);

    const { data: event } = await supabase
      .from('events')
      .select('config, start_date, end_date')
      .eq('id', eventId)
      .single();

    const { data: wristbands } = await supabase
      .from('wristbands')
      .select('id')
      .eq('event_id', eventId);

    const successfulCheckins = checkins?.filter(c => c.status === 'success') || [];
    const uniqueAttendees = new Set(successfulCheckins.map(c => c.wristband_id)).size;
    const totalWristbands = wristbands?.length || 0;
    const maxCapacity = event?.config?.capacity_settings?.max_capacity || 1000;

    // Calculate peak time
    const hourlyData = successfulCheckins.reduce((acc: any, checkin) => {
      const hour = new Date(checkin.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const peakHour = Object.entries(hourlyData).reduce((max: any, [hour, count]: any) =>
      count > max.count ? { hour, count } : max, { hour: '0', count: 0 });

    // Calculate actual average entry time from checkin logs with processing time
    let avgEntryTime = 0;
    if (successfulCheckins.length > 1) {
      // Calculate time between consecutive check-ins
      const sortedCheckins = successfulCheckins
        .map(c => new Date(c.timestamp).getTime())
        .sort((a, b) => a - b);

      const timeDeltas = sortedCheckins.slice(1).map((time, i) =>
        (time - sortedCheckins[i]) / 1000 // Convert to seconds
      ).filter(delta => delta > 0 && delta < 300); // Filter outliers (< 5 minutes)

      if (timeDeltas.length > 0) {
        avgEntryTime = timeDeltas.reduce((sum, delta) => sum + delta, 0) / timeDeltas.length;
      }
    }

    return {
      total_attendance: successfulCheckins.length,
      unique_attendees: uniqueAttendees,
      peak_attendance_time: `${peakHour.hour}:00`,
      avg_entry_time: Number(avgEntryTime.toFixed(1)) || 2.3,
      capacity_utilization: (uniqueAttendees / maxCapacity) * 100,
      no_show_rate: totalWristbands > 0 ? ((totalWristbands - uniqueAttendees) / totalWristbands) * 100 : 0
    };
  };

  const fetchHourlyCheckins = async () => {
    const { data: checkins } = await supabase
      .from('checkin_logs')
      .select('timestamp')
      .eq('event_id', eventId)
      .eq('status', 'success');

    const hourlyData = (checkins || []).reduce((acc: any, checkin) => {
      const hour = new Date(checkin.timestamp).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      acc[hourKey] = (acc[hourKey] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(hourlyData).map(([hour, count]) => ({
      hour,
      count: count as number
    })).sort((a, b) => a.hour.localeCompare(b.hour));
  };

  const fetchGatePerformance = async () => {
    const { data: gates } = await supabase
      .from('gates')
      .select('id, name')
      .eq('event_id', eventId);

    const gatePerformance = await Promise.all(
      (gates || []).map(async (gate) => {
        const { data: checkins } = await supabase
          .from('checkin_logs')
          .select('timestamp, created_at')
          .eq('event_id', eventId)
          .eq('location', gate.name)
          .eq('status', 'success')
          .order('timestamp', { ascending: true });

        // Calculate actual average processing time between consecutive check-ins at this gate
        let avgProcessingTime = 1.8;
        if (checkins && checkins.length > 1) {
          const timestamps = checkins.map(c => new Date(c.timestamp).getTime());
          const timeDeltas = timestamps.slice(1).map((time, i) =>
            (time - timestamps[i]) / 1000 // Convert to seconds
          ).filter(delta => delta > 0 && delta < 60); // Filter outliers (< 1 minute)

          if (timeDeltas.length > 0) {
            avgProcessingTime = Number((timeDeltas.reduce((sum, delta) => sum + delta, 0) / timeDeltas.length).toFixed(1));
          }
        }

        return {
          gate: gate.name,
          checkins: checkins?.length || 0,
          avg_time: avgProcessingTime,
          efficiency: Math.min(100, ((checkins?.length || 0) / 50) * 100) // Assuming 50 is optimal
        };
      })
    );

    return gatePerformance.sort((a, b) => b.checkins - a.checkins);
  };

  const fetchCategoryBreakdown = async () => {
    const { data: checkins } = await supabase
      .from('checkin_logs')
      .select(`
        wristband_id,
        wristbands!inner(category)
      `)
      .eq('event_id', eventId)
      .eq('status', 'success');

    const categoryData = (checkins || []).reduce((acc: any, checkin) => {
      const category = (checkin.wristbands as any)?.category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const total = Object.values(categoryData).reduce((sum: number, count: any) => sum + count, 0);

    return Object.entries(categoryData).map(([category, count]) => ({
      category,
      count: count as number,
      percentage: total > 0 ? ((count as number) / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  };

  const fetchStaffPerformance = async () => {
    const { data: performance } = await supabase
      .from('staff_performance_cache')
      .select(`
        user_id,
        total_scans,
        efficiency_score,
        profiles:user_id(full_name)
      `)
      .eq('event_id', eventId)
      .order('efficiency_score', { ascending: false });

    return (performance || []).map(p => ({
      name: (p.profiles as any)?.full_name || 'Unknown',
      scans: p.total_scans,
      efficiency: p.efficiency_score
    }));
  };

  const fetchSecurityMetrics = async () => {
    const { data: alerts } = await supabase
      .from('system_alerts')
      .select('alert_type, data')
      .eq('event_id', eventId)
      .eq('alert_type', 'fraud_detection');

    const fraudTypes = (alerts || []).reduce((acc: any, alert) => {
      const type = alert.data?.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(fraudTypes).map(([type, count]) => ({
      type,
      count: count as number,
      prevented_loss: (count as number) * 50 // Estimated value per incident
    }));
  };

  const exportReport = async () => {
    if (!analyticsData) return;

    const report = {
      event_name: eventName,
      event_id: eventId,
      generated_at: new Date().toISOString(),
      summary: analyticsData.summary,
      detailed_data: {
        hourly_checkins: analyticsData.hourly_checkins,
        gate_performance: analyticsData.gate_performance,
        category_breakdown: analyticsData.category_breakdown,
        staff_performance: analyticsData.staff_performance,
        security_incidents: analyticsData.fraud_incidents
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${eventId}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !analyticsData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Event Analytics</h3>
          <p className="text-sm text-gray-600">{eventName} • Comprehensive Analysis</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange((e.target as any).value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
          </select>
          
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Attendance</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.total_attendance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Unique Attendees</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.unique_attendees.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Peak Time</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.peak_attendance_time}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Capacity Used</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.capacity_utilization.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">No-Show Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.summary.no_show_rate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Security Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.fraud_incidents.reduce((sum, f) => sum + f.count, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'gates', label: 'Gates', icon: MapPin },
          { id: 'categories', label: 'Categories', icon: Users },
          { id: 'staff', label: 'Staff', icon: Shield },
          { id: 'security', label: 'Security', icon: Shield }
        ].map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setSelectedView(view.id as any)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                selectedView === view.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Check-ins Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Hourly Check-ins</h4>
            <div className="space-y-2">
              {analyticsData.hourly_checkins.map(item => (
                <div key={item.hour} className="flex items-center">
                  <span className="w-12 text-sm text-gray-600">{item.hour}</span>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(item.count / Math.max(...analyticsData.hourly_checkins.map(h => h.count))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Category Distribution</h4>
            <div className="space-y-3">
              {analyticsData.category_breakdown.slice(0, 5).map(item => (
                <div key={item.category} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{item.category}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{item.count}</span>
                    <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedView === 'gates' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Gate Performance Analysis</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-ins</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData.gate_performance.map(gate => (
                  <tr key={gate.gate}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {gate.gate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gate.checkins.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {gate.avg_time}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${gate.efficiency}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{gate.efficiency}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedView === 'staff' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Staff Performance Review</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData.staff_performance.map((staff, index) => (
              <div key={staff.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{staff.name}</h5>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Scans:</span>
                    <span className="font-medium">{staff.scans}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Efficiency:</span>
                    <span className="font-medium">{staff.efficiency}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventAnalyticsDashboard;
