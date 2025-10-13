import { useState, useEffect } from 'react';
import { BarChart3, Calendar, TrendingUp, Users, Activity } from 'lucide-react';
import { supabase } from '../services/supabase';
import SafeAnalyticsDashboard from '../components/analytics/SafeAnalyticsDashboard';

interface Event {
  id: string;
  name: string;
  start_date: string;
  is_active: boolean;
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalCheckins: 0,
    totalWristbands: 0
  });

  useEffect(() => {
    fetchEvents();
    fetchOverallStats();
  }, []);

  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, start_date, is_active')
        .order('start_date', { ascending: false });

      if (error) throw error;

      setEvents(data || []);

      // Auto-select first active event
      const activeEvent = data?.find((e: Event) => e.is_active);
      if (activeEvent) {
        setSelectedEventId(activeEvent.id);
      } else if (data && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOverallStats() {
    try {
      // Total events
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      // Active events
      const { count: activeCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Total check-ins
      const { count: checkinsCount } = await supabase
        .from('checkin_logs')
        .select('*', { count: 'exact', head: true });

      // Total wristbands
      const { count: wristbandsCount } = await supabase
        .from('wristbands')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalEvents: eventsCount || 0,
        activeEvents: activeCount || 0,
        totalCheckins: checkinsCount || 0,
        totalWristbands: wristbandsCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="mt-2 text-sm text-gray-600">
              Advanced analytics and insights for your events
            </p>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.totalEvents}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Activity className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Events</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.activeEvents}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Check-ins</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.totalCheckins.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Wristbands</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.totalWristbands.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Selector */}
        {events.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-2">
              <BarChart3 className="inline h-4 w-4 mr-2" />
              Select Event for Detailed Analytics
            </label>
            <select
              id="event-select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.start_date).toLocaleDateString()}
                  {event.is_active ? ' (Active)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              View detailed analytics, charts, and insights for the selected event
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Analytics Dashboard */}
      {selectedEventId ? (
        <SafeAnalyticsDashboard eventId={selectedEventId as string} />
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Events Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create an event first to view analytics.
          </p>
        </div>
      ) : null}
    </div>
  );
}
