import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Users, Edit, Trash2, Search } from 'lucide-react'
const AccessPage = () => {
  const [accessList, setAccessList] = useState<any[]>([])
  interface EventBasic {
    id: string;
    name: string;
  }

  const [events, setEvents] = useState<EventBasic[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchEvents()
  }, [])
  useEffect(() => {
    if (selectedEvent) {
      fetchAccess(selectedEvent)
    } else {
      fetchAllAccess()
    }
  }, [selectedEvent])
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('start_date', {
          ascending: false,
        })
      if (error) throw error
      setEvents((data as EventBasic[]) || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }
  const fetchAllAccess = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('event_access')
        .select(
          `
          id,
          access_level,
          user_id,
          event_id,
          granted_by,
          created_at,
          events (
            name
          )
        `,
        )
        .order('created_at', {
          ascending: false,
        })
      if (error) throw error
      
      // Fetch profile information separately
      if (data && data.length > 0) {
        const userIds = [...new Set([...data.map(access => access.user_id), ...data.map(access => access.granted_by).filter(Boolean)])]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)

        // Merge access data with profile data
        const enrichedData = data.map(access => ({
          ...access,
          profiles: profilesData?.find(profile => profile.id === access.user_id) || null,
          grantedBy: profilesData?.find(profile => profile.id === access.granted_by) || null
        }))
        
        setAccessList(enrichedData)
      } else {
        setAccessList([])
      }
    } catch (error) {
      console.error('Error fetching access list:', error)
    } finally {
      setLoading(false)
    }
  }
  const fetchAccess = async (eventId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('event_access')
        .select(
          `
          id,
          access_level,
          user_id,
          event_id,
          granted_by,
          created_at,
          events (
            name
          )
        `,
        )
        .eq('event_id', eventId)
        .order('created_at', {
          ascending: false,
        })
      if (error) throw error
      
      // Fetch profile information separately
      if (data && data.length > 0) {
        const userIds = [...new Set([...data.map(access => access.user_id), ...data.map(access => access.granted_by).filter(Boolean)])]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)

        // Merge access data with profile data
        const enrichedData = data.map(access => ({
          ...access,
          profiles: profilesData?.find(profile => profile.id === access.user_id) || null,
          grantedBy: profilesData?.find(profile => profile.id === access.granted_by) || null
        }))
        
        setAccessList(enrichedData)
      } else {
        setAccessList([])
      }
    } catch (error) {
      console.error('Error fetching access list:', error)
    } finally {
      setLoading(false)
    }
  }
  const deleteAccess = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this access?')) {
      return
    }
    try {
      const { error } = await supabase
        .from('event_access')
        .delete()
        .eq('id', id)
      if (error) throw error
      // Update the UI
      setAccessList(accessList.filter((access) => access.id !== id))
    } catch (error) {
      console.error('Error deleting access:', error)
      alert('Failed to revoke access. Please try again.')
    }
  }
  const filteredAccessList = searchTerm
    ? accessList.filter(
        (access) =>
          (access.profiles?.email &&
            access.profiles.email
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (access.profiles?.full_name &&
            access.profiles.full_name
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (access.events?.name &&
            access.events.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase())),
      )
    : accessList
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Access Management</h1>
        <Link
          to={selectedEvent ? `/access/new?event_id=${selectedEvent}` : "/access/new"}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <Users size={16} className="mr-2" />
          Grant Access
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="event-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filter by Event
              </label>
              <select
                id="event-select"
                value={selectedEvent || ''}
                onChange={(e) => setSelectedEvent(e.target.value || null)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Events</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by user or event name..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
              </div>
            </div>
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
        ) : filteredAccessList.length > 0 ? (
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
                    Event
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
                {filteredAccessList.map((access) => (
                  <tr key={access.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {access.profiles?.full_name || 'Unnamed User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {access.profiles?.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {access.events?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${access.access_level === 'owner' ? 'bg-purple-100 text-purple-800' : access.access_level === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
                      >
                        {access.access_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {access.grantedBy?.full_name ||
                        access.grantedBy?.email ||
                        '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(access.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/access/${access.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => deleteAccess(access.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              {searchTerm || selectedEvent
                ? 'No access records found matching your criteria'
                : 'No access records found'}
            </p>
            <Link
              to="/access/new"
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Grant access to users
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
export default AccessPage
