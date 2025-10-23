import { useState, useEffect } from 'react';
import { TrendingUp, Users, Activity, Award, Calendar, Clock, BarChart3, Download } from 'lucide-react';
import seriesAnalyticsService, {
  MainEventAnalyticsDetailed,
  SeriesAnalyticsDetailed
} from '../../services/seriesAnalyticsService';

interface SeriesAnalyticsOverviewProps {
  eventId: string;
  eventName: string;
}

export default function SeriesAnalyticsOverview({ eventId, eventName }: SeriesAnalyticsOverviewProps) {
  const [mainEventAnalytics, setMainEventAnalytics] = useState<MainEventAnalyticsDetailed | null>(null);
  const [seriesAnalytics, setSeriesAnalytics] = useState<SeriesAnalyticsDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'comparison' | 'timeline'>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [eventId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [mainResult, seriesResult] = await Promise.all([
        seriesAnalyticsService.getMainEventAnalytics(eventId),
        seriesAnalyticsService.getMainEventSeriesAnalytics(eventId)
      ]);

      if (mainResult.data) setMainEventAnalytics(mainResult.data);
      if (seriesResult.data) setSeriesAnalytics(seriesResult.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (seriesAnalytics.length > 0) {
      seriesAnalyticsService.exportSeriesAnalyticsToCsv(
        seriesAnalytics,
        `${eventName}_series_analytics.csv`
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!mainEventAnalytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{eventName} Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Multi-series event performance overview</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <Download size={16} className="mr-2" />
          Export CSV
        </button>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4">
          {['overview', 'comparison', 'timeline'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${
                selectedView === view
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {view}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Event Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Series */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Series</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {mainEventAnalytics.total_series}
              </p>
              <div className="flex items-center space-x-2 mt-2 text-xs">
                <span className="text-green-600">{mainEventAnalytics.completed_series} completed</span>
                <span className="text-blue-600">{mainEventAnalytics.active_series} active</span>
                <span className="text-gray-500">{mainEventAnalytics.upcoming_series} upcoming</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Total Check-ins */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Check-ins</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {mainEventAnalytics.total_unique_checkins.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {mainEventAnalytics.total_checkins.toLocaleString()} total scans
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Average per Series */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg per Series</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {mainEventAnalytics.avg_checkins_per_series.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                check-ins per series
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Active Wristbands */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Wristbands</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {mainEventAnalytics.active_wristbands.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                of {mainEventAnalytics.total_wristbands.toLocaleString()} total
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Series-specific vs Direct Event */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Check-in Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Series Check-ins</span>
                <span className="text-sm font-medium text-gray-900">
                  {mainEventAnalytics.series_unique_checkins.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(mainEventAnalytics.series_unique_checkins / mainEventAnalytics.total_unique_checkins) * 100}%`
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Direct Event Check-ins</span>
                <span className="text-sm font-medium text-gray-900">
                  {mainEventAnalytics.direct_unique_checkins.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${(mainEventAnalytics.direct_unique_checkins / mainEventAnalytics.total_unique_checkins) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Operational Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {mainEventAnalytics.total_staff}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Gates</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {mainEventAnalytics.total_gates}
              </p>
            </div>
            <div className="col-span-2 pt-4 border-t">
              <p className="text-sm text-gray-600">First Check-in</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {mainEventAnalytics.first_checkin
                  ? new Date(mainEventAnalytics.first_checkin).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Series Performance */}
      {selectedView === 'overview' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Series Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Series
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unique Check-ins
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Scans
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Gates
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {seriesAnalytics.map((series) => (
                  <tr key={series.series_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {series.sequence_number && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                            #{series.sequence_number}
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {series.series_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {series.unique_checkins.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {series.total_checkins.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(series.utilization_percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">
                          {series.utilization_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {series.staff_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {series.gates_used}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
