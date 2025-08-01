import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Event } from '../services/supabase'
import { Edit, Download, Upload, Users, RefreshCw } from 'lucide-react'
import LoadingScreen from '../components/common/LoadingScreen'
const EventDetailsPage = () => {
  const { id } = useParams<{ id: string }>()
  
  interface EventStats {
    totalWristbands: number;
    checkedIn: number;
    categories: Array<{
      name: string;
      total: number;
      checkedIn: number;
    }>;
  }

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats>({
    totalWristbands: 0,
    checkedIn: 0,
    categories: [],
  })
  const [accessUsers, setAccessUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  // Error state is kept for future error handling
  const [, setError] = useState<string | null>(null)
  useEffect(() => {
    if (id) {
      fetchEventDetails(id)
    }
  }, [id])
  const fetchEventDetails = async (eventId: string) => {
    setLoading(true)
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      if (eventError) throw eventError
      setEvent(eventData)
      // Fetch wristbands stats
      const { data: wristbands, error: wristbandsError } = await supabase
        .from('wristbands')
        .select('id, category, is_active')
        .eq('event_id', eventId)
      if (wristbandsError) throw wristbandsError

      // Fetch check-in logs
      const { data: checkins, error: checkinsError } = await supabase
        .from('checkin_logs')
        .select('wristband_id')
        .eq('event_id', eventId)
      if (checkinsError) throw checkinsError

      // Calculate stats
      const totalWristbands = wristbands?.length || 0
      const checkedIn = checkins?.length || 0

      // Group by category
      const categoriesMap = new Map<string, { total: number; checkedIn: number }>()

      wristbands?.forEach((wb) => {
        const category = wb.category || 'Uncategorized'
        const current = categoriesMap.get(category) || { total: 0, checkedIn: 0 }
        current.total++
        if (checkins?.some((c) => c.wristband_id === wb.id)) {
          current.checkedIn++
        }
        categoriesMap.set(category, current)
      })

      const categoriesArray = Array.from(categoriesMap.entries()).map(([name, data]) => ({
        name,
        total: data.total,
        checkedIn: data.checkedIn,
      }))

      setStats({
        totalWristbands,
        checkedIn,
        categories: categoriesArray,
      })

      // Fetch users with access
      const { data: accessData, error: accessError } = await supabase
        .from('event_access')
        .select(
          `
          id,
          access_level,
          user_id,
          granted_by,
          created_at,
          profiles!event_access_user_id_fkey (
            email,
            full_name
          ),
          grantedBy:profiles!event_access_granted_by_fkey (
            email
          )
        `,
        )
        .eq('event_id', eventId)
      if (accessError) throw accessError
      setAccessUsers(accessData || [])
    } catch (error) {
      console.error('Error fetching event details:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load event details'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }
  if (loading) {
    return <LoadingScreen />
  }
  if (!event) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-gray-900">Event not found</h2>
        <p className="mt-2 text-gray-500">
          The event you're looking for doesn't exist or you don't have access to
          it.
        </p>
        <Link
          to="/events"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
        >
          Back to events
        </Link>
      </div>
    )
  }
  const startDate = new Date(event.start_date)
  const endDate = new Date(event.end_date)
  const isActive = new Date() >= startDate && new Date() <= endDate
  const isPast = new Date() > endDate
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            {isActive && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            )}
            {isPast && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Past
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            {event.location && ` • ${event.location}`}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => fetchEventDetails(id!)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw size={14} className="mr-1.5" />
            Refresh
          </button>
          <Link
            to={`/events/${event.id}/edit`}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit size={14} className="mr-1.5" />
            Edit
          </Link>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              className={`${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`${activeTab === 'wristbands' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('wristbands')}
            >
              Wristbands
            </button>
            <button
              className={`${activeTab === 'access' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              onClick={() => setActiveTab('access')}
            >
              User Access
            </button>
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Event details */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Event Details
                </h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Start Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {startDate.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      End Date
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {endDate.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Location
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event.location || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Capacity
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event.total_capacity > 0
                        ? event.total_capacity
                        : 'Unlimited'}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">
                      Description
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event.description || '-'}
                    </dd>
                  </div>
                </dl>
              </div>
              {/* Stats */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Statistics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-800">
                      Total Wristbands
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-blue-900">
                      {stats.totalWristbands}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800">
                      Checked In
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-green-900">
                      {stats.checkedIn}
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-amber-800">
                      Check-in Rate
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-amber-900">
                      {stats.totalWristbands > 0
                        ? `${Math.round((stats.checkedIn / stats.totalWristbands) * 100)}%`
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
              {/* Category breakdown */}
              {stats.categories.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Category Breakdown
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Category
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Total
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Active
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Checked In
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Check-in Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.categories.map((category) => (
                          <tr key={category.name}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {category.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {category.total}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {category.checkedIn}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {category.checkedIn}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {category.total > 0
                                ? `${Math.round((category.checkedIn / category.total) * 100)}%`
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'wristbands' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  Wristbands
                </h2>
                <div className="flex space-x-3">
                  <Link
                    to={`/wristbands/new?eventId=${event.id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Wristband
                  </Link>
                  <Link
                    to={`/wristbands/bulk?eventId=${event.id}`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Upload size={16} className="mr-2" />
                    Bulk Upload
                  </Link>
                  <Link
                    to={`/wristbands/export?eventId=${event.id}`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download size={16} className="mr-2" />
                    Export
                  </Link>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <Link
                  to={`/wristbands?eventId=${event.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  Manage Wristbands
                </Link>
              </div>
            </div>
          )}
          {activeTab === 'access' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">
                  User Access
                </h2>
                <Link
                  to={`/access/new?eventId=${event.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Users size={16} className="mr-2" />
                  Grant Access
                </Link>
              </div>
              {accessUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          User
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Access Level
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Granted By
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Granted On
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
                      {accessUsers.map((access) => (
                        <tr key={access.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {access.profiles?.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {access.profiles?.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${access.access_level === 'owner' ? 'bg-purple-100 text-purple-800' : access.access_level === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
                            >
                              {access.access_level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {access.grantedBy?.email || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(access.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              to={`/access/${access.id}/edit`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <p className="text-gray-500 mb-4">
                    No users have been granted access to this event yet.
                  </p>
                  <Link
                    to={`/access/new?eventId=${event.id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    Grant access to users
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default EventDetailsPage
