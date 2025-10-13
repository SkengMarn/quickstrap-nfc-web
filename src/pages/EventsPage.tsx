import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Event } from '../services/supabase'
import { Plus, Calendar, MapPin, Users, Clock, Search, Edit, Trash2 } from 'lucide-react'

const EventsPage = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [events, searchTerm, statusFilter])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = events

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      const now = new Date()
      filtered = filtered.filter(event => {
        const startDate = new Date(event.start_date)
        const endDate = new Date(event.end_date)
        const isActive = now >= startDate && now <= endDate
        const isPast = now > endDate
        const isUpcoming = now < startDate

        switch (statusFilter) {
          case 'active': return isActive
          case 'upcoming': return isUpcoming
          case 'past': return isPast
          default: return true
        }
      })
    }

    setFilteredEvents(filtered)
  }

  const deleteEvent = async (id: string) => {
    const event = events.find(e => e.id === id)
    if (!event || !confirm(`Delete "${event.name}"? This cannot be undone.`)) return

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
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    } finally {
      setDeletingId(null)
    }
  }

  const getEventStatus = (event: Event) => {
    const now = new Date()
    const startDate = new Date(event.start_date)
    const endDate = new Date(event.end_date)
    
    if (now >= startDate && now <= endDate) return 'active'
    if (now > endDate) return 'past'
    return 'upcoming'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  className="form-input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                className="form-input form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Events</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Events Table */}
      {filteredEvents.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {events.length === 0 ? 'No events yet' : 'No events match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {events.length === 0 
                ? 'Get started by creating your first event'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {events.length === 0 && (
              <Link to="/events/new" className="btn btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date Range</th>
                  <th>Location</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const status = getEventStatus(event)
                  const startDate = new Date(event.start_date)
                  const endDate = new Date(event.end_date)

                  return (
                    <tr key={event.id}>
                      <td>
                        <Link
                          to={`/events/${event.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700"
                        >
                          {event.name}
                        </Link>
                        {event.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {event.description}
                          </p>
                        )}
                      </td>
                      <td>
                        <div className="text-sm">
                          <div>{startDate.toLocaleDateString()}</div>
                          <div className="text-gray-500">to {endDate.toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center text-sm">
                          {event.location ? (
                            <>
                              <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                              {event.location}
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center text-sm">
                          <Users className="h-3 w-3 mr-1 text-gray-400" />
                          {event.total_capacity > 0 ? event.total_capacity : 'Unlimited'}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${
                          status === 'active' ? 'status-success' :
                          status === 'upcoming' ? 'status-warning' :
                          'status-neutral'
                        }`}>
                          {status === 'active' ? 'Active' :
                           status === 'upcoming' ? 'Upcoming' :
                           'Completed'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/events/${event.id}/edit`}
                            className="btn-ghost btn-sm p-2"
                            title="Edit event"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            disabled={deletingId === event.id}
                            className="btn-ghost btn-sm p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete event"
                          >
                            {deletingId === event.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventsPage
