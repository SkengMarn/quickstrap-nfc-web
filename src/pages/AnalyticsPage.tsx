import { useState, useEffect } from 'react';
import { BarChart3, Calendar, TrendingUp, Users, Activity } from 'lucide-react';
import { supabase } from '../services/supabase';
import SafeAnalyticsDashboard from '../components/analytics/SafeAnalyticsDashboard';

interface Event {
  id: string;
  name: string;
  start_date: string;
  is_active: boolean;
  is_series?: boolean;
  main_event_id?: string;
  sequence_number?: number;
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedIsSeries, setSelectedIsSeries] = useState<boolean>(false);
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
      // Fetch parent events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, start_date, is_active')
        .order('start_date', { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch all series for these events
      const eventIds = eventsData?.map(e => e.id) || [];
      const { data: seriesData, error: seriesError } = await supabase
        .from('event_series')
        .select('id, name, start_date, main_event_id, sequence_number, lifecycle_status')
        .in('main_event_id', eventIds)
        .order('main_event_id', { ascending: false })
        .order('sequence_number', { ascending: true });

      if (seriesError) throw seriesError;

      // Combine events and series into a flat list
      const combinedList: Event[] = [];
      
      eventsData?.forEach(event => {
        // Add parent event
        combinedList.push({
          ...event,
          is_series: false
        });
        
        // Add its series as indented items
        const eventSeries = seriesData?.filter(s => s.main_event_id === event.id) || [];
        eventSeries.forEach(series => {
          combinedList.push({
            id: series.id,
            name: `  ↳ ${series.name}`,
            start_date: series.start_date,
            is_active: series.lifecycle_status === 'active',
            is_series: true,
            main_event_id: series.main_event_id,
            sequence_number: series.sequence_number
          });
        });
      });

      setEvents(combinedList);

      // Auto-select first active event or series
      const activeItem = combinedList.find((e: Event) => e.is_active);
      if (activeItem) {
        setSelectedEventId(activeItem.id);
        setSelectedIsSeries(activeItem.is_series || false);
      } else if (combinedList.length > 0) {
        setSelectedEventId(combinedList[0].id);
        setSelectedIsSeries(combinedList[0].is_series || false);
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
              onChange={(e) => {
                const selected = events.find(ev => ev.id === e.target.value);
                setSelectedEventId(e.target.value);
                setSelectedIsSeries(selected?.is_series || false);
              }}
              className="block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              style={{ zIndex: 5 }}
            >
              {events.map((event) => (
                <option 
                  key={event.id} 
                  value={event.id}
                  style={event.is_series ? { 
                    color: '#6366f1',
                    fontStyle: 'italic',
                    paddingLeft: '1rem'
                  } : {
                    fontWeight: '600'
                  }}
                >
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
        <SafeAnalyticsDashboard 
          eventId={selectedEventId as string}
          isSeries={selectedIsSeries}
          seriesId={selectedIsSeries ? selectedEventId : undefined}
        />
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
