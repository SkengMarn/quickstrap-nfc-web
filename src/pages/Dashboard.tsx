import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, EventWithStats } from '../services/supabase';
import { CalendarPlus, Users, Plus, Clock } from 'lucide-react';
import { EventMetrics } from '../components/EventMetrics';
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalWristbands: 0,
    totalCheckins: 0,
  })
  const [recentEvents, setRecentEvents] = useState<EventWithStats[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        // Fetch stats
        const { data: events } = await supabase
          .from('events')
          .select('id, name, start_date, end_date')
        const now = new Date()
        const activeEvents =
          events?.filter((event) => {
            const startDate = new Date(event.start_date)
            const endDate = new Date(event.end_date)
            return startDate <= now && endDate >= now
          }) || []
        const { count: wristbandsCount } = await supabase
          .from('wristbands')
          .select('id', {
            count: 'exact',
            head: true,
          })
        const { count: checkinsCount } = await supabase
          .from('checkin_logs')
          .select('id', {
            count: 'exact',
            head: true,
          })
        setStats({
          totalEvents: events?.length || 0,
          activeEvents: activeEvents.length,
          totalWristbands: wristbandsCount || 0,
          totalCheckins: checkinsCount || 0,
        })
        // Fetch recent events with stats
        const { data: recentEventsData } = await supabase
          .from('events')
          .select('*')
          .order('start_date', {
            ascending: false,
          })
          .limit(5)
        const eventsWithStats = await Promise.all(
          (recentEventsData || []).map(async (event) => {
            const { count: wristbandCount } = await supabase
              .from('wristbands')
              .select('id', {
                count: 'exact',
                head: true,
              })
              .eq('event_id', event.id)
            const { count: checkinCount } = await supabase
              .from('checkin_logs')
              .select('id', {
                count: 'exact',
                head: true,
              })
              .eq('event_id', event.id)
            return {
              ...event,
              total_wristbands: wristbandCount || 0,
              checked_in: checkinCount || 0,
            }
          }),
        )
        setRecentEvents(eventsWithStats)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Quick Actions */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div className="mb-4 md:mb-0">
          <h1 className="text-3xl font-bold text-gray-900">Event Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of your events and check-ins</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/events/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Link>
          <Link
            to="/wristbands"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Wristbands
          </Link>
        </div>
      </div>

      {/* Enhanced Metrics Section */}
      <EventMetrics />

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        ) : (
          <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-indigo-500">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 truncate">Total Events</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats.totalEvents}
                  </p>
                  <p className="mt-2 flex items-center text-sm text-gray-500">
                    <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    All time
                  </p>
                </div>
                <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 text-indigo-600">
                  <CalendarPlus className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Events Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Events</h2>
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
        ) : recentEvents.length > 0 ? (
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
                    Wristbands
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Check-ins
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentEvents.map((event) => {
                  const startDate = new Date(event.start_date)
                  const endDate = new Date(event.end_date)
                  const isActive =
                    new Date() >= startDate && new Date() <= endDate
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
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {startDate.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {event.total_wristbands}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <span className="font-medium">
                            {event.checked_in}
                          </span>
                          {event.total_wristbands > 0 && (
                            <span className="ml-2 text-gray-500">
                              (
                              {Math.round(
                                (event.checked_in / event.total_wristbands) *
                                  100,
                              )}
                              %)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No events found</p>
            <Link
              to="/events/new"
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Create your first event
            </Link>
          </div>
        )}
        {recentEvents.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Link
              to="/events"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all events
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
export default Dashboard
