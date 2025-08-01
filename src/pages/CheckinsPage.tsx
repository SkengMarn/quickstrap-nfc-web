import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { Search, Download, Filter } from 'lucide-react'
const CheckinsPage = () => {
  const [searchParams] = useSearchParams()
  const eventIdParam = searchParams.get('eventId')
  const [checkins, setCheckins] = useState<any[]>([])
  interface EventBasic {
    id: string;
    name: string;
  }

  const [events, setEvents] = useState<EventBasic[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string | null>(
    eventIdParam,
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null,
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 50
  useEffect(() => {
    fetchEvents()
    if (selectedEvent) {
      fetchCheckins(selectedEvent, 1)
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
      if (!selectedEvent && data && data.length > 0) {
        setSelectedEvent(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }
  const fetchCheckins = async (eventId: string, pageNum: number) => {
    setLoading(true)
    try {
      let query = supabase
        .from('checkin_logs')
        .select(
          `
          *,
          wristbands (
            nfc_id,
            category
          ),
          staff:profiles!checkin_logs_staff_id_fkey (
            email,
            full_name
          )
        `,
          {
            count: 'exact',
          },
        )
        .eq('event_id', eventId)
        .order('timestamp', {
          ascending: false,
        })
        .range((pageNum - 1) * pageSize, pageNum * pageSize - 1)
      if (searchTerm) {
        query = query.or(
          `wristbands.nfc_id.ilike.%${searchTerm}%,wristbands.category.ilike.%${searchTerm}%`,
        )
      }
      if (dateRange.start) {
        query = query.gte('timestamp', dateRange.start)
      }
      if (dateRange.end) {
        // Add a day to include the end date fully
        const endDate = new Date(dateRange.end)
        endDate.setDate(endDate.getDate() + 1)
        query = query.lt('timestamp', endDate.toISOString())
      }
      const { data, count, error } = await query
      if (error) throw error
      setCheckins(data || [])
      setTotalCount(count || 0)
      setPage(pageNum)
    } catch (error) {
      console.error('Error fetching check-ins:', error)
    } finally {
      setLoading(false)
    }
  }
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedEvent) {
      fetchCheckins(selectedEvent, 1)
    }
  }
  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: value || null,
    }))
  }
  const handleFilterApply = () => {
    if (selectedEvent) {
      fetchCheckins(selectedEvent, 1)
    }
  }
  const exportCheckins = async () => {
    if (!selectedEvent) return
    try {
      // Get all check-ins for the selected event
      let query = supabase
        .from('checkin_logs')
        .select(
          `
          id,
          timestamp,
          location,
          notes,
          wristbands (
            nfc_id,
            category
          ),
          staff:profiles!checkin_logs_staff_id_fkey (
            email,
            full_name
          )
        `,
        )
        .eq('event_id', selectedEvent)
        .order('timestamp', {
          ascending: false,
        })
      if (searchTerm) {
        query = query.or(
          `wristbands.nfc_id.ilike.%${searchTerm}%,wristbands.category.ilike.%${searchTerm}%`,
        )
      }
      if (dateRange.start) {
        query = query.gte('timestamp', dateRange.start)
      }
      if (dateRange.end) {
        // Add a day to include the end date fully
        const endDate = new Date(dateRange.end)
        endDate.setDate(endDate.getDate() + 1)
        query = query.lt('timestamp', endDate.toISOString())
      }
      const { data, error } = await query
        .select(`
          *,
          wristbands (nfc_id, category),
          staff:profiles (email, full_name)
        `)
      if (error) throw error
      if (!data || data.length === 0) {
        alert('No check-ins to export')
        return
      }
      // Format data for CSV
      let csv = 'Timestamp,NFC ID,Category,Location,Staff,Notes\n'
      data.forEach((checkin) => {
        const timestamp = new Date(checkin.timestamp).toLocaleString()
        const nfcId = checkin.wristbands?.nfc_id || ''
        const category = checkin.wristbands?.category || ''
        const location = checkin.location || ''
        const staff = checkin.staff?.full_name || checkin.staff?.email || ''
        const notes = checkin.notes
          ? `"${checkin.notes.replace(/"/g, '""')}"`
          : ''
        csv += `${timestamp},${nfcId},${category},${location},${staff},${notes}\n`
      })
      // Create and download the CSV file
      const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `checkins_${new Date().toISOString()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting check-ins:', error)
      alert('Failed to export check-ins')
    }
  }
  const totalPages = Math.ceil(totalCount / pageSize)
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">Check-in Logs</h1>
        {selectedEvent && (
          <button
            onClick={exportCheckins}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download size={16} className="mr-2" />
            Export to CSV
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
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
              <div>
                <label
                  htmlFor="start-date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={dateRange.start || ''}
                  onChange={(e) =>
                    handleDateRangeChange('start', e.target.value)
                  }
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
              </div>
              <div>
                <label
                  htmlFor="end-date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  End Date
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={dateRange.end || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="flex-1">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by NFC ID or category..."
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
              <button
                onClick={handleFilterApply}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter size={16} className="mr-2" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
        {!selectedEvent ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              Please select an event to view check-in logs
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
        ) : checkins.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Timestamp
                    </th>
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
                      Location
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Staff
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {checkins.map((checkin) => (
                    <tr key={checkin.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(checkin.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {checkin.wristbands?.nfc_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {checkin.wristbands?.category || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {checkin.location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {checkin.staff?.full_name ||
                          checkin.staff?.email ||
                          'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {checkin.notes || '-'}
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
                    onClick={() => fetchCheckins(selectedEvent, page - 1)}
                    disabled={page <= 1}
                    className={`px-3 py-1 border rounded ${page <= 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchCheckins(selectedEvent, page + 1)}
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
              {searchTerm || dateRange.start || dateRange.end
                ? 'No check-ins found matching your criteria'
                : 'No check-ins found for this event'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
export default CheckinsPage
