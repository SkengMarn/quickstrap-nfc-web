import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, Event } from '../services/supabase';
import { CalendarPlus, Edit, Trash2, Search } from 'lucide-react';
import notification from '../utils/notifications';
import LoadingButton from '../components/common/LoadingButton';
const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      notification.error('Could not load events', error, {
        entity: 'events',
        operation: 'read',
        severity: 'error',
        technicalDetails: error instanceof Error ? error.message : 'Failed to fetch events',
        context: {
          error: error instanceof Error ? error : new Error('Failed to fetch events')
        },
        toastOptions: {
          autoClose: 10000
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    const eventToDelete = events.find(e => e.id === id);
    if (!eventToDelete) return;

    if (!window.confirm(
      `Are you sure you want to delete "${eventToDelete.name}"? This will permanently delete the event and all associated data including wristbands and check-in logs.`
    )) {
      return;
    }

    setDeletingId(id);
    try {
      // Show warning about related data deletion
      notification.warning(`Deleting "${eventToDelete.name}" and all its related data...`, {
        entity: 'event',
        operation: 'delete',
        severity: 'warning',
        technicalDetails: 'Initiating deletion of event and all related data',
        context: {
          eventId: id,
          eventName: eventToDelete.name
        },
        toastOptions: {
          autoClose: 3000
        }
      });

      // Delete related records first (due to foreign key constraints)
      const deletePromises = [
        supabase.from('checkin_logs').delete().eq('event_id', id),
        supabase.from('wristbands').delete().eq('event_id', id),
        supabase.from('event_access').delete().eq('event_id', id)
      ];
      
      await Promise.all(deletePromises);
      
      // Then delete the event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update the UI
      setEvents(events.filter((event) => event.id !== id));
      
      // Show success message with details
      notification.success(
        `Event "${eventToDelete.name}" was successfully deleted.\n` +
        'Note: This action cannot be undone. All related data has been removed.',
        {
          entity: 'event',
          operation: 'delete',
          severity: 'success',
          technicalDetails: 'Event and all related data have been permanently removed',
          context: {
            eventId: id,
            eventName: eventToDelete.name
          },
          toastOptions: {
            autoClose: 8000
          }
      });
      
    } catch (error) {
      notification.error(
        `Failed to delete event "${eventToDelete?.name || 'Unknown'}". Please try again.`,
        error,
        {
          entity: 'event',
          operation: 'delete',
          severity: 'error',
          technicalDetails: error instanceof Error ? error.message : 'Failed to delete event',
          context: {
            eventId: id,
            eventName: eventToDelete?.name,
            error: error instanceof Error ? error : new Error(String(error))
          },
          toastOptions: { 
            autoClose: 10000 
          }
      });
    } finally {
      setDeletingId(null);
    }
  }
  const filteredEvents = React.useMemo(() => 
    events.filter(
      (event) =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.location &&
          event.location.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [events, searchTerm]
  );
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <LoadingButton
          onClick={() => navigate('/events/new')}
          variant="primary"
        >
          <CalendarPlus size={16} className="mr-2" />
          Create Event
        </LoadingButton>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search events..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-6 py-4 border-b border-gray-200">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Event Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Location
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Capacity
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => {
                  const startDate = new Date(event.start_date)
                  const endDate = new Date(event.end_date)
                  const isActive =
                    new Date() >= startDate && new Date() <= endDate
                  const isPast = new Date() > endDate
                  return (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <Link
                              to={`/events/${event.id}`}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              {event.name}
                            </Link>
                            {isActive && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            )}
                            {isPast && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Past
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {startDate.toLocaleDateString()} -{' '}
                        {endDate.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.total_capacity > 0
                          ? event.total_capacity
                          : 'Unlimited'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/events/${event.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <Edit size={16} />
                        </Link>
                        <LoadingButton
                          onClick={() => deleteEvent(event.id)}
                          variant="danger"
                          isLoading={deletingId === event.id}
                          loadingText="Deleting..."
                          className="p-2 text-red-600 hover:bg-red-50 hover:text-red-900"
                          title="Delete event"
                        >
                          <Trash2 size={18} />
                        </LoadingButton>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              {searchTerm
                ? 'No events found matching your search'
                : 'No events found'}
            </p>
            {!searchTerm && (
              <Link
                to="/events/new"
                className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                Create your first event
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
export default EventsPage
