import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventSeriesService } from '../services/eventSeriesService';
import { supabase } from '../services/supabase';
import type { EventSeries } from '../types/series';

interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

export default function SeriesManagementPage() {
  const { eventId, seriesId } = useParams<{ eventId: string; seriesId: string }>();
  const navigate = useNavigate();
  const [series, setSeries] = useState<EventSeries | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeriesAndEvent();
  }, [seriesId, eventId]);

  const loadSeriesAndEvent = async () => {
    if (!seriesId || !eventId) return;

    try {
      setLoading(true);
      setError(null);

      // Load series data
      const result = await eventSeriesService.getSeriesById(seriesId);
      if (result.error) throw result.error;
      if (result.data) {
        setSeries(result.data as EventSeries);
      }

      // Load parent event data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, start_date, end_date')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);
    } catch (err) {
      console.error('Error loading series:', err);
      setError(err instanceof Error ? err.message : 'Failed to load series');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/events/${eventId}/series/${seriesId}/edit`);
  };

  const handleDelete = async () => {
    if (!seriesId || !window.confirm('Are you sure you want to delete this series? This action cannot be undone.')) {
      return;
    }

    try {
      await eventSeriesService.deleteSeries(seriesId);
      navigate(`/events/${eventId}`);
    } catch (err) {
      console.error('Error deleting series:', err);
      alert('Failed to delete series: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading series...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !series || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error || 'Series not found'}</p>
          <Link
            to={`/events/${eventId}`}
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Back to Event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center text-sm text-gray-600">
        <Link to="/events" className="hover:text-blue-600">Events</Link>
        <span className="mx-2">/</span>
        <Link to={`/events/${eventId}`} className="hover:text-blue-600">{event.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{series.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{series.name}</h1>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Series #{series.sequence_number}
              </span>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                series.lifecycle_status === 'active' ? 'bg-green-100 text-green-800' :
                series.lifecycle_status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                series.lifecycle_status === 'completed' ? 'bg-gray-100 text-gray-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {series.lifecycle_status}
              </span>
            </div>
            <p className="text-gray-600">
              {new Date(series.start_date).toLocaleDateString()} - {new Date(series.end_date).toLocaleDateString()}
            </p>
            {series.description && (
              <p className="mt-2 text-gray-700">{series.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Series
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Capacity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Capacity</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Max Capacity:</span>
              <span className="font-medium">{series.capacity || 'Unlimited'}</span>
            </div>
            {series.capacity && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(50, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">50% full (example)</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Linking */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Ticket Linking</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Mode:</span>
              <span className="font-medium capitalize">{series.config?.ticket_linking_mode || 'disabled'}</span>
            </div>
            {series.config?.ticket_linking_mode === 'inherit' && (
              <p className="text-xs text-gray-500 mt-2">Inherited from main event</p>
            )}
          </div>
        </div>

        {/* Check-in Window */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Check-in Window</h3>
          <div className="space-y-2">
            {series.checkin_window_start_offset !== null && series.checkin_window_end_offset !== null ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Opens:</span>
                  <span className="font-medium">{Math.abs(Number(series.checkin_window_start_offset))}h before</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Closes:</span>
                  <span className="font-medium">{series.checkin_window_end_offset}h after</span>
                </div>
              </>
            ) : (
              <p className="text-gray-600">Always open</p>
            )}
          </div>
        </div>
      </div>

      {/* Management Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Management Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate(`/events/${eventId}/series/${seriesId}/wristbands`)}
            className="p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="text-2xl mb-2">🎫</div>
            <h3 className="font-semibold text-gray-900 mb-1">Manage Wristbands</h3>
            <p className="text-sm text-gray-600">Assign and manage wristbands for this series</p>
          </button>

          <button
            onClick={() => navigate(`/events/${eventId}/series/${seriesId}/gates`)}
            className="p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="text-2xl mb-2">🚪</div>
            <h3 className="font-semibold text-gray-900 mb-1">Manage Gates</h3>
            <p className="text-sm text-gray-600">Configure gate access for this series</p>
          </button>

          <button
            onClick={() => navigate(`/events/${eventId}/series/${seriesId}/analytics`)}
            className="p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900 mb-1">View Analytics</h3>
            <p className="text-sm text-gray-600">See detailed analytics for this series</p>
          </button>

          <button
            onClick={() => navigate(`/events/${eventId}/series/${seriesId}/checkins`)}
            className="p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="text-2xl mb-2">✅</div>
            <h3 className="font-semibold text-gray-900 mb-1">Check-in History</h3>
            <p className="text-sm text-gray-600">View check-in logs and history</p>
          </button>
        </div>
      </div>
    </div>
  );
}
