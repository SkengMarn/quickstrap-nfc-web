import {
    ChevronDown,
    ChevronUp,
    Copy,
    Eye,
    Filter,
    Flag,
    RefreshCw,
    Search,
    Settings,
    Download,
    Trash2,
    X
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { createSafeSearchTerm } from '../utils/inputSanitizer'
import { logger } from '../services/logger'
import { ConfirmModal } from '../components/ui/Modal'
interface EventBasic {
  id: string;
  name: string;
  is_series?: boolean;
  main_event_id?: string;
}

interface CheckinRecord {
  id: string;
  timestamp: string;
  location: string;
  notes: string;
  staff_id: string;
  event_id: string;
  wristband_id: string;
  wristbands?: {
    nfc_id: string;
    category: string;
  };
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface ColumnFilter {
  [key: string]: string;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const CheckinsPage = () => {
  const [searchParams] = useSearchParams()
  const eventIdParam = searchParams.get('eventId')

  // Core data state
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [events, setEvents] = useState<EventBasic[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string | null>(eventIdParam)
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Table controls
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [globalSearch, setGlobalSearch] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({})
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' })

  // UI state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'compact' | 'comfortable' | 'expanded'>('comfortable')
  const [autoRefresh, setAutoRefresh] = useState<number | null>(null)
  const [showColumnControls, setShowColumnControls] = useState(false)

  // Date range filter
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  // Modal states
  const [selectedCheckin, setSelectedCheckin] = useState<CheckinRecord | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)

  // Bulk operations state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false)

  // Column definitions
  const columns = [
    { key: 'timestamp', label: 'Timestamp', sortable: true, filterable: true },
    { key: 'nfc_id', label: 'NFC ID', sortable: true, filterable: true },
    { key: 'category', label: 'Category', sortable: true, filterable: true },
    { key: 'location', label: 'Location', sortable: true, filterable: true },
    { key: 'staff_name', label: 'Staff', sortable: true, filterable: true },
    { key: 'notes', label: 'Notes', sortable: false, filterable: true }
  ]

  // Fetch events
  useEffect(() => {
    fetchEvents()
  }, [])
  // Fetch checkins when dependencies change
  useEffect(() => {
    if (selectedEvent) {
      fetchCheckins()
    }
  }, [selectedEvent, page, pageSize, sortConfig, globalSearch, columnFilters, dateRange])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !selectedEvent) return

    const interval = setInterval(() => {
      fetchCheckins()
    }, autoRefresh * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, selectedEvent])

  const fetchEvents = async () => {
    try {
      // Fetch parent events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name')
        .order('start_date', { ascending: false })

      if (eventsError) throw eventsError

      // Fetch all series for these events
      const eventIds = eventsData?.map(e => e.id) || []
      const { data: seriesData, error: seriesError } = await supabase
        .from('event_series')
        .select('id, name, main_event_id, sequence_number')
        .in('main_event_id', eventIds)
        .order('main_event_id', { ascending: false })
        .order('sequence_number', { ascending: true })

      if (seriesError) throw seriesError

      // Combine events and series into a flat list
      const combinedList: EventBasic[] = []
      
      eventsData?.forEach(event => {
        // Add parent event
        combinedList.push({
          ...event,
          is_series: false
        })
        
        // Add its series as indented items
        const eventSeries = seriesData?.filter(s => s.main_event_id === event.id) || []
        eventSeries.forEach(series => {
          combinedList.push({
            id: series.id,
            name: `  ↳ ${series.name}`,
            is_series: true,
            main_event_id: series.main_event_id
          })
        })
      })

      setEvents(combinedList)

      if (!selectedEvent && combinedList.length > 0) {
        setSelectedEvent(combinedList[0].id)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const fetchCheckins = async () => {
    if (!selectedEvent) return

    setLoading(true)
    try {
      // Determine if selected item is a series
      const selectedItem = events.find(e => e.id === selectedEvent)
      const isSeries = selectedItem?.is_series || false
      
      let query = supabase
        .from('checkin_logs')
        .select(`
          *,
          wristbands!inner (
            nfc_id,
            category
          )
        `, { count: 'exact' })
      
      // Filter by series_id or event_id based on selection
      if (isSeries) {
        query = query.eq('series_id', selectedEvent)
      } else {
        query = query.eq('event_id', selectedEvent).is('series_id', null)
      }

      // Apply sorting
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })

      // Apply global search
      if (globalSearch) {
        const safeSearchTerm = createSafeSearchTerm(globalSearch);
        if (safeSearchTerm) {
          query = query.or(`
            wristbands.nfc_id.ilike.%${safeSearchTerm}%,
            wristbands.category.ilike.%${safeSearchTerm}%,
            location.ilike.%${safeSearchTerm}%,
            staff_id.ilike.%${safeSearchTerm}%,
            notes.ilike.%${safeSearchTerm}%
          `)
        }
      }

      // Apply column filters
      Object.entries(columnFilters).forEach(([column, value]) => {
        if (value) {
          const safeValue = createSafeSearchTerm(value);
          if (safeValue) {
            if (column === 'nfc_id' || column === 'category') {
              query = query.filter(`wristbands.${column}`, 'ilike', `%${safeValue}%`)
            } else if (column === 'staff_name') {
              query = query.filter('staff_id', 'ilike', `%${safeValue}%`)
            } else {
              query = query.filter(column, 'ilike', `%${safeValue}%`)
            }
          }
        }
      })

      // Apply date range
      if (dateRange.start) {
        query = query.gte('timestamp', dateRange.start)
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end)
        endDate.setDate(endDate.getDate() + 1)
        query = query.lt('timestamp', endDate.toISOString())
      }

      // Apply pagination
      const start = (page - 1) * pageSize
      const end = start + pageSize - 1
      query = query.range(start, end)

      const { data, count, error } = await query
      if (error) throw error

      // Fetch staff names for the returned check-ins
      const checkinData = data || []
      const staffIds = [...new Set(checkinData.map(c => c.staff_id).filter(Boolean))]

      let staffMap = new Map()
      if (staffIds.length > 0) {
        try {
          const { data: staffData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', staffIds)

          if (staffData) {
            staffData.forEach(staff => {
              staffMap.set(staff.id, staff)
            })
          }
        } catch (staffError) {
          console.warn('Could not fetch staff profiles:', staffError)
        }
      }

      // Enhance checkin data with staff info
      const enhancedCheckins = checkinData.map(checkin => ({
        ...checkin,
        profiles: staffMap.get(checkin.staff_id) || null
      }))

      setCheckins(enhancedCheckins)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching check-ins:', error)
    } finally {
      setLoading(false)
    }
  }

  // Utility functions
  const handleSort = (columnKey: string) => {
    setSortConfig(prev => {
      if (prev.key === columnKey) {
        return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      } else {
        return { key: columnKey, direction: 'asc' }
      }
    })
  }

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }))
    setPage(1)
  }

  const clearAllFilters = () => {
    setColumnFilters({})
    setGlobalSearch('')
    setDateRange({ start: '', end: '' })
    setPage(1)
  }

  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedRows.size === checkins.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(checkins.map(c => c.id)))
    }
  }

  // Action handlers
  const handleViewDetails = (checkin: CheckinRecord) => {
    setSelectedCheckin(checkin)
    setShowDetailsModal(true)
  }

  const handleFlagForReview = (checkin: CheckinRecord) => {
    setSelectedCheckin(checkin)
    setShowFlagModal(true)
  }

  const handleCopyId = async (checkin: CheckinRecord) => {
    try {
      await navigator.clipboard.writeText(checkin.id)
      logger.info('Check-in ID copied', 'CheckinsPage', { checkinId: checkin.id });
    } catch (error) {
      logger.error('Failed to copy to clipboard', 'CheckinsPage', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = checkin.id
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  // Bulk operation handlers
  const handleBulkExport = async () => {
    if (selectedRows.size === 0) return;

    setBulkOperationInProgress(true);
    try {
      const selectedCheckins = checkins.filter(c => selectedRows.has(c.id));

      // Create CSV content
      const headers = ['Timestamp', 'NFC ID', 'Category', 'Location', 'Staff', 'Notes'];
      const csvRows = [
        headers.join(','),
        ...selectedCheckins.map(c => [
          new Date(c.timestamp).toLocaleString(),
          c.wristbands?.nfc_id || 'N/A',
          c.wristbands?.category || 'N/A',
          c.location || '',
          c.staff?.full_name || c.staff?.email || 'N/A',
          `"${(c.notes || '').replace(/"/g, '""')}"`
        ].join(','))
      ];

      // Create and download file
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `checkins-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.info(`Exported ${selectedRows.size} check-ins`, 'CheckinsPage');
      setSelectedRows(new Set());
    } catch (error) {
      logger.error('Failed to export check-ins', 'CheckinsPage', error);
      alert('Failed to export check-ins');
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return;

    setBulkOperationInProgress(true);
    try {
      const { error } = await supabase
        .from('checkin_logs')
        .delete()
        .in('id', Array.from(selectedRows));

      if (error) throw error;

      // Update local state
      setCheckins(prev => prev.filter(c => !selectedRows.has(c.id)));
      setTotalCount(prev => prev - selectedRows.size);

      logger.info(`Deleted ${selectedRows.size} check-ins`, 'CheckinsPage');
      setSelectedRows(new Set());
      setShowBulkDeleteModal(false);
    } catch (error) {
      logger.error('Failed to delete check-ins', 'CheckinsPage', error);
      alert('Failed to delete check-ins');
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  const submitFlagForReview = async (reason: string) => {
    if (!selectedCheckin) return

    try {
      // Create a fraud detection record
      const { error } = await supabase
        .from('fraud_detections')
        .insert({
          event_id: selectedCheckin.event_id,
          wristband_id: selectedCheckin.wristband_id,
          detection_type: 'suspicious_pattern',
          severity: 'medium',
          details: {
            checkin_id: selectedCheckin.id,
            reason: reason,
            flagged_by: 'manual_review',
            timestamp: new Date().toISOString()
          }
        })

      if (error) throw error

      setShowFlagModal(false)
      setSelectedCheckin(null)
      // You could add a success toast here
      console.log('Check-in flagged for review successfully')
    } catch (error) {
      console.error('Error flagging check-in:', error)
      // You could add an error toast here
    }
  }

  const exportCheckins = async (format: 'csv' | 'excel' | 'pdf' = 'csv') => {
    if (!selectedEvent) return

    try {
      let query = supabase
        .from('checkin_logs')
        .select(`
          id, timestamp, location, notes, staff_id,
          wristbands!inner (nfc_id, category)
        `)
        .eq('event_id', selectedEvent)
        .order('timestamp', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      if (!data || data.length === 0) {
        alert('No check-ins to export')
        return
      }

      // Fetch staff names
      const staffIds = [...new Set(data.map(c => c.staff_id).filter(Boolean))]
      let staffMap = new Map()

      if (staffIds.length > 0) {
        try {
          const { data: staffData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', staffIds)

          if (staffData) {
            staffData.forEach(staff => {
              staffMap.set(staff.id, staff)
            })
          }
        } catch (staffError) {
          console.warn('Could not fetch staff profiles:', staffError)
        }
      }

      if (format === 'csv') {
        let csv = 'Timestamp,NFC ID,Category,Location,Staff,Notes\n'
        data.forEach((checkin) => {
          const timestamp = new Date(checkin.timestamp).toLocaleString()
          const nfcId = (checkin.wristbands as any)?.nfc_id || ''
          const category = (checkin.wristbands as any)?.category || ''
          const location = checkin.location || ''
          const staffInfo = staffMap.get(checkin.staff_id)
          const staff = staffInfo?.full_name || staffInfo?.email || checkin.staff_id || 'Unknown'
          const notes = checkin.notes ? `"${checkin.notes.replace(/"/g, '""')}"` : ''
          csv += `${timestamp},${nfcId},${category},${location},${staff},${notes}\n`
        })

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `checkins_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting check-ins:', error)
      alert('Failed to export check-ins')
    }
  }

  // Computed values
  const totalPages = Math.ceil(totalCount / pageSize)
  const startRecord = (page - 1) * pageSize + 1
  const endRecord = Math.min(page * pageSize, totalCount)

  // View mode configurations
  const getViewModeStyles = () => {
    switch (viewMode) {
      case 'compact':
        return {
          rowHeight: 'h-8',
          cellPadding: 'px-2 py-1',
          textSize: 'text-xs',
          headerPadding: 'px-2 py-2'
        }
      case 'expanded':
        return {
          rowHeight: 'h-16',
          cellPadding: 'px-4 py-4',
          textSize: 'text-sm',
          headerPadding: 'px-4 py-4'
        }
      default: // comfortable
        return {
          rowHeight: 'h-12',
          cellPadding: 'px-3 py-3',
          textSize: 'text-sm',
          headerPadding: 'px-3 py-3'
        }
    }
  }

  const viewStyles = getViewModeStyles()
  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check-in Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Showing {startRecord}–{endRecord} of {totalCount.toLocaleString()} records
          </p>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
          >
            <Filter size={14} className="mr-1" />
            Filters
          </button>

          <div className="relative">
            <button
              onClick={() => setShowColumnControls(!showColumnControls)}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              <Settings size={14} className="mr-1" />
              Export
            </button>
            {showColumnControls && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="p-2">
                  <button
                    onClick={() => exportCheckins('csv')}
                    className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            )}
          </div>

          {autoRefresh && (
            <div className="flex items-center text-sm text-gray-500">
              <RefreshCw size={14} className="mr-1 animate-spin" />
              Auto-refresh: {autoRefresh}s
            </div>
          )}
        </div>
      </div>

      {/* Event Selection & Global Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Event
            </label>
            <select
              value={selectedEvent || ''}
              onChange={(e) => setSelectedEvent(e.target.value || null)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              style={{ zIndex: 7 }}
            >
              <option value="">Select an event</option>
              {events.map((event) => (
                <option 
                  key={event.id} 
                  value={event.id}
                  style={event.is_series ? { 
                    color: '#6366f1',
                    fontStyle: 'italic',
                    paddingLeft: '1rem'
                  } : {
                    fontWeight: '600'
                  }}
                >
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Global Search
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search all columns..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Advanced Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, start: e.target.value }))
                  setPage(1) // Reset to first page when filtering
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange(prev => ({ ...prev, end: e.target.value }))
                  setPage(1) // Reset to first page when filtering
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto Refresh
                {autoRefresh && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ON
                  </span>
                )}
              </label>
              <select
                value={autoRefresh || ''}
                onChange={(e) => setAutoRefresh(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Off</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                View Mode
              </label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="expanded">Expanded</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(dateRange.start || dateRange.end || autoRefresh) && (
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setDateRange({ start: '', end: '' })
                  setAutoRefresh(null)
                  setPage(1)
                }}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Clear Date Filters & Auto-refresh
              </button>
            </div>
          )}
        </div>
      )}

      {/* Metrics Summary */}
      {checkins.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalCount.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Check-ins</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {new Set(checkins.map(c => c.wristbands?.nfc_id)).size}
              </div>
              <div className="text-sm text-gray-500">Unique Wristbands</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {new Set(checkins.map(c => c.staff_id)).size}
              </div>
              <div className="text-sm text-gray-500">Active Staff</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {new Set(checkins.map(c => c.location)).size}
              </div>
              <div className="text-sm text-gray-500">Locations</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!selectedEvent ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Please select an event to view check-in logs</p>
          </div>
        ) : loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : checkins.length > 0 ? (
          <>
            {/* Bulk Actions Bar */}
            {selectedRows.size > 0 && (
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedRows.size} {selectedRows.size === 1 ? 'item' : 'items'} selected
                  </span>
                  <button
                    onClick={() => setSelectedRows(new Set())}
                    className="text-sm text-blue-700 hover:text-blue-900 flex items-center gap-1"
                  >
                    <X size={16} />
                    Clear selection
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkExport}
                    disabled={bulkOperationInProgress}
                    className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <Download size={16} />
                    Export Selected
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    disabled={bulkOperationInProgress}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            <div className="w-full">
              <table className="w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === checkins.length && checkins.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`${viewStyles.headerPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            <span>{column.label}</span>
                            {column.sortable && (
                              <button
                                onClick={() => handleSort(column.key)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {sortConfig.key === column.key && sortConfig.direction === 'asc' ? (
                                  <ChevronUp size={14} />
                                ) : (
                                  <ChevronDown size={14} />
                                )}
                              </button>
                            )}
                          </div>
                          {column.filterable && (
                            <input
                              type="text"
                              value={columnFilters[column.key] || ''}
                              onChange={(e) => handleColumnFilter(column.key, e.target.value)}
                              placeholder={`Filter ${column.label.toLowerCase()}...`}
                              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                            />
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {checkins.map((checkin) => (
                    <tr key={checkin.id} className={`${viewStyles.rowHeight} hover:bg-gray-50`}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(checkin.id)}
                          onChange={() => handleRowSelect(checkin.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className={`${viewStyles.cellPadding} ${viewStyles.textSize} text-gray-900 w-32`}>
                        <div className="break-words">
                          {new Date(checkin.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className={`${viewStyles.cellPadding} ${viewStyles.textSize} font-medium text-blue-600 w-28`}>
                        <div className="break-all">
                          {checkin.wristbands?.nfc_id || 'N/A'}
                        </div>
                      </td>
                      <td className={`${viewStyles.cellPadding} w-24`}>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full ${viewMode === 'compact' ? 'text-xs' : 'text-xs'} font-medium bg-blue-100 text-blue-800 break-words`}>
                          {checkin.wristbands?.category || 'Unknown'}
                        </span>
                      </td>
                      <td className={`${viewStyles.cellPadding} ${viewStyles.textSize} text-gray-500 w-28`}>
                        <div className="break-words">
                          {checkin.location || 'N/A'}
                        </div>
                      </td>
                      <td className={`${viewStyles.cellPadding} ${viewStyles.textSize} text-gray-500 w-40`}>
                        <div className="break-words">
                          {checkin.profiles?.full_name || checkin.profiles?.email || checkin.staff_id || 'Unknown'}
                        </div>
                      </td>
                      <td className={`${viewStyles.cellPadding} ${viewStyles.textSize} text-gray-500`}>
                        <div className={`break-words ${viewMode === 'expanded' ? 'line-clamp-5' : 'line-clamp-3'}`}>
                          {checkin.notes || '-'}
                        </div>
                      </td>
                      <td className={`${viewStyles.cellPadding} text-right ${viewStyles.textSize} font-medium w-24`}>
                        <div className="flex items-center space-x-2">
                          <div className="relative group">
                            <button
                              onClick={() => handleViewDetails(checkin)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye size={14} />
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none whitespace-nowrap z-10">
                              View check-in details
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              onClick={() => handleFlagForReview(checkin)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <Flag size={14} />
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none whitespace-nowrap z-10">
                              Flag for review
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              onClick={() => handleCopyId(checkin)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy size={14} />
                            </button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none whitespace-nowrap z-10">
                              Copy check-in ID
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enhanced Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startRecord}</span> to{' '}
                  <span className="font-medium">{endRecord}</span> of{' '}
                  <span className="font-medium">{totalCount.toLocaleString()}</span> results
                  {selectedRows.size > 0 && (
                    <span className="ml-2 text-blue-600">
                      ({selectedRows.size} selected)
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {globalSearch || Object.values(columnFilters).some(f => f) || dateRange.start || dateRange.end
                ? 'No check-ins found matching your criteria'
                : 'No check-ins found for this event'}
            </p>
          </div>
        )}
      </div>


      {/* Details Modal */}
      {showDetailsModal && selectedCheckin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Check-in Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-in ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedCheckin.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900">{new Date(selectedCheckin.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">NFC ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedCheckin.wristbands?.nfc_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="text-sm text-gray-900">{selectedCheckin.wristbands?.category || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm text-gray-900">{selectedCheckin.location || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Staff</label>
                  <p className="text-sm text-gray-900">
                    {selectedCheckin.profiles?.full_name || selectedCheckin.profiles?.email || selectedCheckin.staff_id || 'Unknown'}
                  </p>
                </div>
              </div>

              {selectedCheckin.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedCheckin.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && selectedCheckin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Flag for Review</h2>
              <button
                onClick={() => setShowFlagModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const reason = formData.get('reason') as string
              if (reason.trim()) {
                submitFlagForReview(reason.trim())
              }
            }}>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Flagging check-in for: <span className="font-mono">{selectedCheckin.wristbands?.nfc_id}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for flagging
                  </label>
                  <textarea
                    name="reason"
                    required
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="Describe why this check-in needs review..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowFlagModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700"
                >
                  Flag for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Check-ins"
        message={`Are you sure you want to delete ${selectedRows.size} check-in record${selectedRows.size === 1 ? '' : 's'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={bulkOperationInProgress}
      />
    </div>
  )
}
export default CheckinsPage
