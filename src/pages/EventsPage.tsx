import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Event } from '../services/supabase'
import { Plus, Calendar } from 'lucide-react'
import accessControlService from '../services/accessControlService'
import { eventActivationService } from '../services/eventActivationService'
import CompactEventsTable from '../components/events/CompactEventsTable'
import { logger } from '../services/logger'
import { LoadingSpinner } from '../components/ui/LoadingStates'
import { EmptyEvents } from '../components/ui/LoadingStates'

interface EnhancedEvent extends Event {
  tickets_sold?: number;
  tickets_remaining?: number;
  checked_in_count?: number;
  wristbands_count?: number;
  created_by_name?: string;
  updated_by_name?: string;
  status_changed_by_name?: string;
  series?: any[];
}

const EventsPage = () => {
  const [events, setEvents] = useState<EnhancedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async (silent: boolean = false) => {
    const startTime = performance.now();

    try {
      // Only show loading state if not a silent refresh
      if (!silent) {
        setLoading(true);
      }

      // First, refresh event activations to ensure scheduled events are activated
      await eventActivationService.autoRefreshIfNeeded();

      // Get user's accessible event IDs with error handling
      let accessibleEventIds: string[] | 'all' = [];
      try {
        accessibleEventIds = await accessControlService.getAccessibleEventIds();
      } catch (accessError) {
        logger.error('Failed to get accessible event IDs', 'EventsPage', accessError);
        setEvents([]);
        setLoading(false);
        return;
      }

      // Use the enhanced event fetching with automatic activation
      const allEvents = await eventActivationService.getEventsWithAutoActivation();

      // Filter by accessible events if needed
      let filteredData = allEvents;
      if (accessibleEventIds !== 'all') {
        if (accessibleEventIds.length === 0) {
          logger.info('User has no accessible events', 'EventsPage');
          setEvents([]);
          setLoading(false);
          return;
        }
        filteredData = allEvents.filter((event: any) => accessibleEventIds.includes(event.id));
      }

      if (filteredData.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // OPTIMIZED: Fetch all metrics in parallel using batch queries
      const eventIds = filteredData.map((e: any) => e.id);

      // Batch fetch all counts and related data
      const [ticketsData, checkinsData, wristbandsData, seriesData, seriesWristbandsData, seriesTicketsData, seriesCheckinsData] = await Promise.all([
        // Tickets count per event (only those NOT belonging to a series)
        supabase
          .from('tickets')
          .select('event_id')
          .in('event_id', eventIds)
          .is('series_id', null),

        // Checkins count per event (only those NOT belonging to a series)
        supabase
          .from('checkin_logs')
          .select('event_id')
          .in('event_id', eventIds)
          .is('series_id', null),

        // Wristbands count per event (only those NOT belonging to a series)
        supabase
          .from('wristbands')
          .select('event_id')
          .in('event_id', eventIds)
          .is('series_id', null),

        // Series data for all events
        supabase
          .from('event_series')
          .select('*')
          .in('main_event_id', eventIds)
          .order('sequence_number', { ascending: true }),

        // Wristbands for series events (by series_id)
        supabase
          .from('wristbands')
          .select('series_id')
          .not('series_id', 'is', null),

        // Tickets for series events (by series_id)
        supabase
          .from('tickets')
          .select('series_id')
          .not('series_id', 'is', null),

        // Check-ins for series events (by series_id)
        supabase
          .from('checkin_logs')
          .select('series_id')
          .not('series_id', 'is', null)
      ]);

      // Get unique user IDs to fetch profiles in one query
      const userIds = new Set<string>();
      filteredData.forEach((event: any) => {
        if (event.created_by) userIds.add(event.created_by);
        if (event.updated_by) userIds.add(event.updated_by);
        if (event.status_changed_by) userIds.add(event.status_changed_by);
      });

      // Batch fetch all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', Array.from(userIds));

      // Create lookup maps for O(1) access
      const profileMap = new Map(
        profiles?.map(p => [p.id, p.full_name || p.email || 'Unknown']) || []
      );

      const ticketsCountMap = new Map<string, number>();
      ticketsData.data?.forEach(t => {
        ticketsCountMap.set(t.event_id, (ticketsCountMap.get(t.event_id) || 0) + 1);
      });

      const checkinsCountMap = new Map<string, number>();
      checkinsData.data?.forEach(c => {
        checkinsCountMap.set(c.event_id, (checkinsCountMap.get(c.event_id) || 0) + 1);
      });

      const wristbandsCountMap = new Map<string, number>();
      wristbandsData.data?.forEach(w => {
        wristbandsCountMap.set(w.event_id, (wristbandsCountMap.get(w.event_id) || 0) + 1);
      });

      // Count wristbands for series events
      const seriesWristbandsCountMap = new Map<string, number>();
      seriesWristbandsData.data?.forEach(w => {
        if (w.series_id) {
          seriesWristbandsCountMap.set(w.series_id, (seriesWristbandsCountMap.get(w.series_id) || 0) + 1);
        }
      });

      // Count tickets for series events
      const seriesTicketsCountMap = new Map<string, number>();
      seriesTicketsData.data?.forEach(t => {
        if (t.series_id) {
          seriesTicketsCountMap.set(t.series_id, (seriesTicketsCountMap.get(t.series_id) || 0) + 1);
        }
      });

      // Count check-ins for series events
      const seriesCheckinsCountMap = new Map<string, number>();
      seriesCheckinsData.data?.forEach(c => {
        if (c.series_id) {
          seriesCheckinsCountMap.set(c.series_id, (seriesCheckinsCountMap.get(c.series_id) || 0) + 1);
        }
      });

      const seriesMap = new Map<string, any[]>();
      seriesData.data?.forEach(s => {
        const existing = seriesMap.get(s.main_event_id) || [];
        existing.push({
          ...s,
          wristbands_count: seriesWristbandsCountMap.get(s.id) || 0,
          tickets_count: seriesTicketsCountMap.get(s.id) || 0,
          checked_in_count: seriesCheckinsCountMap.get(s.id) || 0,
        });
        seriesMap.set(s.main_event_id, existing);
      });

      // Enhance events using lookup maps (no additional queries!)
      const enhancedEvents: EnhancedEvent[] = filteredData.map((event: any) => {
        const ticketsSold = ticketsCountMap.get(event.id) || 0;
        const ticketsRemaining = event.capacity && event.capacity > 0
          ? event.capacity - ticketsSold
          : null;

        return {
          ...event,
          tickets_sold: ticketsSold,
          tickets_remaining: ticketsRemaining,
          checked_in_count: checkinsCountMap.get(event.id) || 0,
          wristbands_count: wristbandsCountMap.get(event.id) || 0,
          created_by_name: event.created_by ? profileMap.get(event.created_by) : null,
          updated_by_name: event.updated_by ? profileMap.get(event.updated_by) : null,
          status_changed_by_name: event.status_changed_by ? profileMap.get(event.status_changed_by) : null,
          series: seriesMap.get(event.id) || []
        } as EnhancedEvent;
      });

      setEvents(enhancedEvents);

      const loadTime = performance.now() - startTime;
      logger.info(`Loaded ${enhancedEvents.length} events in ${Math.round(loadTime)}ms`, 'EventsPage', {
        eventCount: enhancedEvents.length,
        loadTimeMs: Math.round(loadTime)
      });

    } catch (error) {
      logger.error('Failed to fetch events', 'EventsPage', error);
      setEvents([]);
    } finally {
      // Only update loading state if not a silent refresh
      if (!silent) {
        setLoading(false);
      }
    }
  }
  


  const deleteEvent = async (id: string) => {
    const event = events.find(e => e.id === id)
    if (!event || !confirm(`Delete "${event.name}"? This cannot be undone.`)) return

    // Check if user can manage (delete) this event
    const canManage = await accessControlService.canManageEvent(id);
    if (!canManage) {
      alert('You do not have permission to delete this event');
      return;
    }

    setDeletingId(id)
    try {
      // Delete related records first
      await Promise.all([
        supabase.from('checkin_logs').delete().eq('event_id', id),
        supabase.from('wristbands').delete().eq('event_id', id),
        supabase.from('event_access').delete().eq('event_id', id)
      ])

      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error

      setEvents(events.filter(e => e.id !== id))
      logger.info('Event deleted successfully', 'EventsPage', { eventId: id });
    } catch (error) {
      logger.error('Failed to delete event', 'EventsPage', error, { eventId: id });
      alert('Failed to delete event')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" message="Loading events..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your events</p>
        </div>
        <Link to="/events/new" className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Link>
      </div>

      {/* Events Table */}
      {events.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No events yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first event
            </p>
            <Link to="/events/new" className="btn btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <CompactEventsTable 
            events={events} 
            onDelete={deleteEvent} 
            deletingId={deletingId}
            onRefresh={() => fetchEvents(true)}
          />
        </div>
      )}
    </div>
  )
}

export default EventsPage
