import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase, Wristband } from '../services/supabase'
import {
  QrCode,
  Edit,
  Trash2,
  Download,
  Upload,
  Search,
} from 'lucide-react'
const WristbandsPage = () => {
  const [searchParams] = useSearchParams()
  const eventIdParam = searchParams.get('eventId')
  const [wristbands, setWristbands] = useState<Wristband[]>([])
  interface EventBasic {
    id: string;
    name: string;
  }

  const [events, setEvents] = useState<EventBasic[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string | null>(
    eventIdParam,
  )
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50
  useEffect(() => {
    fetchEvents()
    if (selectedEvent) {
      fetchCategories(selectedEvent)
      fetchWristbands(selectedEvent, selectedCategory, 1)
    }
  }, [selectedEvent, selectedCategory])
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
      if (!selectedEvent && data && data.length > 0) {
        setSelectedEvent(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }
  const fetchCategories = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('wristbands')
        .select('category')
        .eq('event_id', eventId)
        .order('category')
      if (error) throw error
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map((w) => w.category))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }
  const fetchWristbands = async (
    eventId: string,
    category: string | null,
    pageNum: number,
  ) => {
    setLoading(true)
    try {
      let query = supabase
        .from('wristbands')
        .select('*', {
          count: 'exact',
        })
        .eq('event_id', eventId)
        .order('created_at', {
          ascending: false,
        })
        .range((pageNum - 1) * pageSize, pageNum * pageSize - 1)
      if (category) {
        query = query.eq('category', category)
      }
      if (searchTerm) {
        query = query.ilike('nfc_id', `%${searchTerm}%`)
      }
      const { data, count, error } = await query
      if (error) throw error
      setWristbands(data || [])
      setTotalCount(count || 0)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching wristbands:', error)
    } finally {
      setLoading(false)
    }
  }
  const deleteWristband = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this wristband?')) {
      return
    }
    try {
      // Check if wristband has been used
      const { count } = await supabase
        .from('checkin_logs')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('wristband_id', id)
      if (count && count > 0) {
        if (
          !window.confirm(
            'This wristband has check-in records. Deleting it will also delete all check-in records. Continue?',
          )
        ) {
          return
        }
        // Delete check-in logs first
        await supabase.from('checkin_logs').delete().eq('wristband_id', id)
      }
      // Then delete the wristband
      const { error } = await supabase.from('wristbands').delete().eq('id', id)
      if (error) throw error
      // Update the UI
      setWristbands(wristbands.filter((wb) => wb.id !== id))
      setTotalCount((prev) => prev - 1)
    } catch (error) {
      console.error('Error deleting wristband:', error)
      alert('Failed to delete wristband. Please try again.')
    }
  }
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedEvent) {
      fetchWristbands(selectedEvent, selectedCategory, 1)
    }
  }
  const totalPages = Math.ceil(totalCount / pageSize)
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Wristbands</h1>
        <Link
          to={selectedEvent ? `/wristbands/new?event_id=${selectedEvent}` : "/wristbands/new"}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          <QrCode size={16} className="mr-2" />
          Register Wristband
        </Link>
        <div className="flex space-x-3">
          {selectedEvent && (
            <>
              <Link
                to={`/wristbands/new?eventId=${selectedEvent}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <QrCode size={16} className="mr-2" />
                Add Wristband
              </Link>
              <Link
                to={`/wristbands/bulk?eventId=${selectedEvent}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Upload size={16} className="mr-2" />
                Bulk Upload
              </Link>
              <Link
                to={`/wristbands/export?eventId=${selectedEvent}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download size={16} className="mr-2" />
                Export
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="w-full md:w-1/3">
              <label
                htmlFor="event-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Event
              </label>
              <select
                id="event-select"
                value={selectedEvent || ''}
                onChange={(e) => setSelectedEvent(e.target.value || null)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Select an event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
            {categories.length > 0 && (
              <div className="w-full md:w-1/3">
                <label
                  htmlFor="category-select"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Filter by Category
                </label>
                <select
                  id="category-select"
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="w-full md:w-1/3">
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Search by NFC ID
              </label>
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-gray-400" />
                  </div>
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 px-3 flex items-center bg-blue-600 rounded-r-md text-white"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {!selectedEvent ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              Please select an event to view wristbands
            </p>
          </div>
        ) : loading ? (
          <div className="animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-6 py-4 border-b border-gray-200">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : wristbands.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      NFC ID
                    </th>
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
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Created
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
                  {wristbands.map((wristband) => (
                    <tr key={wristband.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {wristband.nfc_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {wristband.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${wristband.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {wristband.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(wristband.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/wristbands/${wristband.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => deleteWristband(wristband.id)}
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
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(page - 1) * pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(page * pageSize, totalCount)}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      fetchWristbands(
                        selectedEvent!,
                        selectedCategory,
                        page - 1,
                      )
                    }
                    disabled={page <= 1}
                    className={`px-3 py-1 border rounded ${page <= 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      fetchWristbands(
                        selectedEvent!,
                        selectedCategory,
                        page + 1,
                      )
                    }
                    disabled={page >= totalPages}
                    className={`px-3 py-1 border rounded ${page >= totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              {searchTerm || selectedCategory
                ? 'No wristbands found matching your criteria'
                : 'No wristbands found for this event'}
            </p>
            <Link
              to={`/wristbands/new?eventId=${selectedEvent}`}
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Add your first wristband
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
export default WristbandsPage
