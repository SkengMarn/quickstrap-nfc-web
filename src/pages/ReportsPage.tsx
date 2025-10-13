import { useState, useEffect } from 'react';
import { FileText, Calendar } from 'lucide-react';
import { supabase } from '../services/supabase';
import ExportReportingSystem from '../components/reporting/ExportReportingSystem';

interface Event {
  id: string;
  name: string;
  start_date: string;
  is_active: boolean;
}

export default function ReportsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Events Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create an event first to generate reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="mt-2 text-sm text-gray-600">
              Generate and export detailed reports for your events
            </p>
          </div>
        </div>

        {/* Event Selector */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="inline h-4 w-4 mr-2" />
            Select Event
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
            Reports will be generated for the selected event
          </p>
        </div>
      </div>

      {/* Export/Reporting System */}
      {selectedEventId && (
        <ExportReportingSystem
          eventId={selectedEventId}
          eventName={events.find(e => e.id === selectedEventId)?.name || 'Unknown Event'}
        />
      )}
    </div>
  );
}
