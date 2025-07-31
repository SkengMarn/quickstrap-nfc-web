import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, EventWithStats } from '../services/supabase'
import { CalendarPlus, Users, Activity } from 'lucide-react'
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
  interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
        <div className="ml-5">
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          <div className="mt-1 text-3xl font-semibold text-gray-900">
            {value}
          </div>
        </div>
      </div>
    </div>
  )
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          to="/events/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <CalendarPlus size={16} className="mr-2" />
          New Event
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Events"
            value={stats.totalEvents}
            icon={<CalendarPlus size={24} className="text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            title="Active Events"
            value={stats.activeEvents}
            icon={<Activity size={24} className="text-green-600" />}
            color="bg-green-50"
          />
          <StatCard
            title="Total Wristbands"
            value={stats.totalWristbands}
            icon={<Users size={24} className="text-purple-600" />}
            color="bg-purple-50"
          />
          <StatCard
            title="Total Check-ins"
            value={stats.totalCheckins}
            icon={<Activity size={24} className="text-amber-600" />}
            color="bg-amber-50"
          />
        </div>
      )}
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
