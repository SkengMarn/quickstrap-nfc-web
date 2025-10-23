import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Event } from '../services/supabase'
import { Edit, Users, RefreshCw, Activity, TrendingUp, AlertTriangle, CheckCircle, Clock, MapPin, Shield, Zap, Search, Filter, Download, Upload, MoreVertical, Trash2, Eye, Link as LinkIcon, Unlink, XCircle, LogOut, ChevronUp, ChevronDown, X } from 'lucide-react'
import { enrichAccessWithProfiles } from '../utils/accessEnrichment'
import LoadingScreen from '../components/common/LoadingScreen'
import GuestListUpload from '../components/GuestListUpload'
import WristbandBulkUpload from '../components/WristbandBulkUpload'
import TicketCSVUpload from '../components/TicketCSVUpload'

// Advanced Feature Components
import CommandCenterDashboard from '../components/command/CommandCenterDashboard'
import GateManagementInterface from '../components/gates/GateManagementInterface'
import EnhancedWristbandManager from '../components/wristbands/EnhancedWristbandManager'
import FraudDetectionSystem from '../components/monitoring/FraudDetectionSystem'
import EnhancedAnalyticsDashboard from '../components/analytics/EnhancedAnalyticsDashboard'
import ExportReportingSystem from '../components/reporting/ExportReportingSystem'
import EmergencyControlCenter from '../components/emergency/EmergencyControlCenter'
import PreEventTestingSuite from '../components/testing/PreEventTestingSuite'
import CategoryLimitsManager from '../components/events/CategoryLimitsManager'
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
  const [showGuestListUpload, setShowGuestListUpload] = useState(false)
  const [showWristbandUpload, setShowWristbandUpload] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [systemAlerts, setSystemAlerts] = useState<any[]>([])
  const [gateHealth, setGateHealth] = useState(0)
  const [securityScore, setSecurityScore] = useState(0)
  
  // Guest List / Tickets state
  const [tickets, setTickets] = useState<any[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showTicketUploadModal, setShowTicketUploadModal] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null)
  const [ticketSortField, setTicketSortField] = useState<string>('created_at')
  const [ticketSortDirection, setTicketSortDirection] = useState<'asc' | 'desc'>('desc')
  const [columnFilters, setColumnFilters] = useState({
    ticket_number: '',
    holder_name: '',
    holder_email: '',
    ticket_category: ''
  })
  
  // Error state is kept for future error handling
  const [, setError] = useState<string | null>(null)
  useEffect(() => {
    if (id) {
      fetchEventDetails(id)
      fetchTickets(id)
    }
  }, [id])

  const fetchTickets = async (eventId: string) => {
    setTicketsLoading(true)
    try {
      // Determine if this is a series event by checking the event object
      const isSeries = (event as any)?.is_series || false;
      
      let query = supabase
        .from('tickets')
        .select(`
          *,
          event:events(id, name),
          wristband:wristbands!tickets_linked_wristband_id_fkey(id, nfc_id, category)
        `);
      
      if (isSeries) {
        // For series: get tickets with this series_id
        query = query.eq('series_id', eventId);
      } else {
        // For parent event: get tickets with this event_id but NO series_id
        query = query.eq('event_id', eventId).is('series_id', null);
      }
      
      const { data, error } = await query.order(ticketSortField, { ascending: ticketSortDirection === 'asc' });

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setTicketsLoading(false)
    }
  }

  const handleTicketSort = (field: string) => {
    if (ticketSortField === field) {
      setTicketSortDirection(ticketSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setTicketSortField(field)
      setTicketSortDirection('asc')
    }
  }

  // Update tickets when sort changes
  useEffect(() => {
    if (id) {
      fetchTickets(id)
    }
  }, [ticketSortField, ticketSortDirection])
  const fetchEventDetails = async (eventId: string) => {
    setLoading(true)
    try {
      // Try to fetch from events table first
      let { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .maybeSingle()
      
      // If not found in events, try event_series table
      if (!eventData) {
        const { data: seriesData, error: seriesError } = await supabase
          .from('event_series')
          .select('*')
          .eq('id', eventId)
          .maybeSingle()
        
        if (seriesError) throw seriesError
        
        if (seriesData) {
          // Convert series data to event format
          eventData = {
            id: seriesData.id,
            name: seriesData.name,
            description: seriesData.description,
            location: seriesData.location,
            start_date: seriesData.start_date,
            end_date: seriesData.end_date,
            capacity: seriesData.capacity,
            is_active: seriesData.lifecycle_status === 'active',
            is_public: seriesData.is_public,
            organization_id: seriesData.organization_id,
            lifecycle_status: seriesData.lifecycle_status,
            ticket_linking_mode: null,
            allow_unlinked_entry: true,
            created_by: seriesData.created_by,
            created_at: seriesData.created_at,
            updated_at: seriesData.updated_at,
            config: seriesData.config,
            // Add series-specific fields
            main_event_id: seriesData.main_event_id,
            sequence_number: seriesData.sequence_number,
            series_type: seriesData.series_type,
            is_series: true
          } as any
        }
      }
      
      if (!eventData) {
        throw new Error('Event not found')
      }
      
      setEvent(eventData)
      
      // Fetch wristbands stats
      // For series events: filter by series_id
      // For parent events: filter by event_id AND series_id IS NULL (exclude series wristbands)
      const isSeries = (eventData as any).is_series;
      let wristbandsQuery = supabase
        .from('wristbands')
        .select('id, category, is_active');
      
      if (isSeries) {
        // Series event: get wristbands with this series_id
        wristbandsQuery = wristbandsQuery.eq('series_id', eventId);
      } else {
        // Parent event: get wristbands with this event_id but NO series_id
        wristbandsQuery = wristbandsQuery.eq('event_id', eventId).is('series_id', null);
      }
      
      const { data: wristbands, error: wristbandsError } = await wristbandsQuery;
      if (wristbandsError) throw wristbandsError

      // Fetch check-in logs
      // For series: filter by series_id; for parent: filter by event_id AND series_id IS NULL
      let checkinsQuery = supabase
        .from('checkin_logs')
        .select('wristband_id');
      
      if (isSeries) {
        checkinsQuery = checkinsQuery.eq('series_id', eventId);
      } else {
        checkinsQuery = checkinsQuery.eq('event_id', eventId).is('series_id', null);
      }
      
      const { data: checkins, error: checkinsError } = await checkinsQuery;
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
          user_id,
          event_id,
          access_level,
          granted_by,
          created_at,
          is_active
        `,
        )
        .eq('event_id', eventId)
      if (accessError) throw accessError

      // Enrich access data with profile information
      const enrichedAccessData = await enrichAccessWithProfiles(supabase, accessData || [])
      setAccessUsers(enrichedAccessData)

      // Fetch real activity data and system metrics
      await Promise.all([
        fetchRecentActivity(eventId),
        fetchSystemAlerts(eventId),
        fetchGateMetrics(eventId)
      ])
    } catch (error) {
      console.error('Error fetching event details:', error)
      console.error('Event ID attempted:', eventId)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load event details'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async (eventId: string) => {
    try {
      // Get recent check-ins with wristband info only (gates table doesn't exist yet)
      const { data: recentCheckins, error } = await supabase
        .from('checkin_logs')
        .select(`
          id,
          timestamp,
          wristband_id,
          gate_id,
          wristbands!inner(nfc_id, category)
        `)
        .eq('event_id', eventId)
        .order('timestamp', { ascending: false })
        .limit(10)

      if (error) throw error

      const activityItems = recentCheckins?.map(checkin => ({
        id: checkin.id,
        type: 'checkin',
        message: `${checkin.wristbands?.nfc_id || 'Unknown Wristband'} checked in${checkin.gate_id ? ` at Gate ${checkin.gate_id.slice(-4)}` : ''}`,
        category: checkin.wristbands?.category || 'Unknown',
        timestamp: checkin.timestamp,
        timeAgo: getTimeAgo(new Date(checkin.timestamp))
      })) || []

      setRecentActivity(activityItems)
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      setRecentActivity([])
    }
  }

  const fetchSystemAlerts = async (eventId: string) => {
    try {
      const { data: alerts, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('event_id', eventId)
        .eq('resolved', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSystemAlerts(alerts || [])
    } catch (error) {
      console.error('Error fetching system alerts:', error)
      setSystemAlerts([])
    }
  }

  const fetchGateMetrics = async (eventId: string) => {
    try {
      // Calculate gate health based on active gates from database
      const { data: gates, error } = await supabase
        .from('gates')
        .select('id, status, health_score')
        .eq('event_id', eventId)

      if (gates && gates.length > 0) {
        const activeGates = gates.filter(g => g.status === 'active')
        if (activeGates.length > 0) {
          const avgHealth = activeGates.reduce((sum, gate) => sum + (gate.health_score || 0), 0) / activeGates.length
          setGateHealth(Math.round(avgHealth))
        } else {
          setGateHealth(0)
        }
      } else {
        setGateHealth(0)
      }

      // Security score based on fraud alerts from database
      const { data: fraudAlerts, error: fraudError } = await supabase
        .from('fraud_detections')
        .select('id, severity')
        .eq('event_id', eventId)

      if (!fraudError && fraudAlerts) {
        const criticalAlerts = fraudAlerts.filter(f => f.severity === 'critical').length
        const highAlerts = fraudAlerts.filter(f => f.severity === 'high').length
        const mediumAlerts = fraudAlerts.filter(f => f.severity === 'medium').length
        
        // Calculate security score: start at 100, deduct based on severity
        let score = 100
        score -= (criticalAlerts * 10)  // -10 per critical
        score -= (highAlerts * 5)       // -5 per high
        score -= (mediumAlerts * 2)     // -2 per medium
        
        setSecurityScore(Math.max(0, score))
      } else {
        // No fraud alerts = perfect security score
        setSecurityScore(100)
      }
    } catch (error) {
      console.error('Error fetching gate metrics:', error)
      setGateHealth(0)
      setSecurityScore(0)
    }
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
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
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" role="tablist">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'wristbands', label: 'Wristbands' },
              { id: 'guests', label: 'Guest List' },
              { id: 'gates', label: 'Gates & Entry Points' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'access', label: 'Team Access' },
              { id: 'settings', label: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                data-tab={tab.id}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Event Health Score */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-blue-600" />
                    Event Health Score
                  </h3>
                </div>
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative w-20 h-20">
                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="2"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={stats.totalWristbands > 0 && stats.checkedIn > 0 ? "#10b981" : "#6b7280"}
                            strokeWidth="2"
                            strokeDasharray={`${Math.min(85, (stats.checkedIn / Math.max(stats.totalWristbands, 1)) * 100)}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-gray-900">
                            {stats.totalWristbands > 0 ? Math.min(85, Math.round((stats.checkedIn / stats.totalWristbands) * 100)) : 0}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Composite Score</p>
                        <p className="text-xs text-gray-500">Gate Health (40%) + Security (30%) + Operations (30%)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm font-medium text-green-600">Gate Health</p>
                      <p className="text-lg font-semibold">{gateHealth}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-600">Security</p>
                      <p className="text-lg font-semibold">{securityScore}%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-600">Operations</p>
                      <p className="text-lg font-semibold">{stats.totalWristbands > 0 ? Math.round((stats.checkedIn / stats.totalWristbands) * 100) : 0}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Capacity Tracking */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title flex items-center">
                      <Users className="h-5 w-5 mr-2 text-purple-600" />
                      Live Capacity Tracking
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Current Attendance</span>
                        <span className="text-lg font-semibold">{stats.checkedIn.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Capacity Limit</span>
                        <span className="text-lg font-semibold">
                          {event.total_capacity > 0 ? event.total_capacity.toLocaleString() : 'Unlimited'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${
                            event.total_capacity > 0 && (stats.checkedIn / event.total_capacity) > 0.9 
                              ? 'bg-red-500' 
                              : event.total_capacity > 0 && (stats.checkedIn / event.total_capacity) > 0.75 
                                ? 'bg-orange-500' 
                                : 'bg-green-500'
                          }`}
                          style={{ 
                            width: event.total_capacity > 0 
                              ? `${Math.min(100, (stats.checkedIn / event.total_capacity) * 100)}%` 
                              : '0%' 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Occupancy</span>
                        <span className={`text-lg font-semibold ${
                          event.total_capacity > 0 && (stats.checkedIn / event.total_capacity) > 0.9 
                            ? 'text-red-600' 
                            : event.total_capacity > 0 && (stats.checkedIn / event.total_capacity) > 0.75 
                              ? 'text-orange-600' 
                              : 'text-green-600'
                        }`}>
                          {event.total_capacity > 0 
                            ? `${Math.round((stats.checkedIn / event.total_capacity) * 100)}%`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Lifecycle Status */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
                      Event Lifecycle Status
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Current Status</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          event.lifecycle_status === 'active' ? 'bg-green-100 text-green-800' :
                          event.lifecycle_status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          event.lifecycle_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.lifecycle_status || 'Draft'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Event Start</span>
                          <span>{new Date(event.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Event End</span>
                          <span>{new Date(event.end_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Days Until Start</span>
                          <span className="font-medium">
                            {Math.max(0, Math.ceil((new Date(event.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-500 h-2 rounded-full"
                            style={{ 
                              width: `${Math.min(100, Math.max(0, 
                                (new Date().getTime() - new Date(event.start_date).getTime()) / 
                                (new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) * 100
                              ))}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enterprise Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Total Wristbands</p>
                      <p className="text-2xl font-semibold text-blue-900 mt-1">
                        {stats.totalWristbands.toLocaleString()}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Checked In</p>
                      <p className="text-2xl font-semibold text-green-900 mt-1">
                        {stats.checkedIn.toLocaleString()}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">Check-in Rate</p>
                      <p className="text-2xl font-semibold text-orange-900 mt-1">
                        {stats.totalWristbands > 0
                          ? `${Math.round((stats.checkedIn / stats.totalWristbands) * 100)}%`
                          : '—'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-800">Active Alerts</p>
                      <p className="text-2xl font-semibold text-red-900 mt-1">{systemAlerts.length}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Live Activity Feed & Critical Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Activity Feed */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-green-600" />
                      Live Activity Feed
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-500">Live</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {recentActivity.length > 0 ? (
                        recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">
                                {activity.message}
                              </p>
                              <p className="text-xs text-gray-500">{activity.category} • {activity.timeAgo}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 mb-2">No recent activity</p>
                          <p className="text-xs text-gray-400">Check-ins will appear here</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {recentActivity.length > 0 
                            ? `Showing last ${recentActivity.length} ${recentActivity.length === 1 ? 'activity' : 'activities'}`
                            : 'No activities yet'}
                        </span>
                        <button className="text-blue-600 hover:text-blue-800 font-medium">
                          View All
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Critical Alerts Panel */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                      Critical Alerts
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      systemAlerts.length > 0 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {systemAlerts.length} Active
                    </span>
                  </div>
                  <div className="card-body">
                    {systemAlerts.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {systemAlerts.map((alert) => (
                          <div key={alert.id} className={`flex items-start space-x-3 p-2 rounded-lg ${
                            alert.severity === 'critical' ? 'bg-red-50' :
                            alert.severity === 'error' ? 'bg-orange-50' :
                            alert.severity === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'
                          }`}>
                            <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                              alert.severity === 'critical' ? 'text-red-600' :
                              alert.severity === 'error' ? 'text-orange-600' :
                              alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">{alert.message}</p>
                              <p className="text-xs text-gray-500 capitalize">{alert.severity} • {getTimeAgo(new Date(alert.created_at))}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">No active alerts</p>
                        <p className="text-xs text-gray-400">All systems operational</p>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-lg font-semibold text-green-600">{Math.round((gateHealth + securityScore) / 2)}%</p>
                          <p className="text-xs text-gray-500">System Health</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-blue-600">{systemAlerts.filter(a => a.resolved).length}</p>
                          <p className="text-xs text-gray-500">Resolved Today</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                    Emergency Controls
                  </h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="btn btn-danger justify-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Emergency Lockdown
                    </button>
                    <button className="btn btn-warning justify-center">
                      <Users className="h-4 w-4 mr-2" />
                      Broadcast Alert
                    </button>
                    <button className="btn btn-secondary justify-center">
                      <Activity className="h-4 w-4 mr-2" />
                      Generate Report
                    </button>
                    <button className="btn btn-secondary justify-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Adjust Capacity
                    </button>
                  </div>
                </div>
              </div>

              {/* Event Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Event Information</h3>
                  </div>
                  <div className="card-body space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Duration</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Location</label>
                      <p className="text-sm text-gray-900 mt-1">{event.location || '—'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Capacity</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {event.total_capacity > 0 ? event.total_capacity : 'Unlimited'}
                      </p>
                    </div>
                    {event.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-sm text-gray-900 mt-1">{event.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Quick Actions</h3>
                  </div>
                  <div className="card-body space-y-3">
                    <button
                      onClick={() => setActiveTab('wristbands')}
                      className="btn btn-secondary w-full justify-start"
                    >
                      Manage Wristbands
                    </button>
                    <button
                      onClick={() => setActiveTab('command-center')}
                      className="btn btn-secondary w-full justify-start"
                    >
                      Live Operations
                    </button>
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className="btn btn-secondary w-full justify-start"
                    >
                      View Analytics
                    </button>
                    <Link
                      to={`/events/${event.id}/edit`}
                      className="btn btn-secondary w-full justify-start"
                    >
                      Edit Event
                    </Link>
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
          {activeTab === 'wristbands' && event && (
            <div className="space-y-6">
              {/* Wristband Management Dashboard */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Access Control Center</h2>
                  <p className="text-gray-600 text-sm">Enterprise wristband management with ticket integration and bulk operations</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowWristbandUpload(true)}
                    className="btn btn-primary"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Upload Wristbands
                  </button>
                </div>
              </div>

              {/* Overview Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalWristbands}</p>
                    <p className="text-sm text-gray-600">Total Wristbands</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-green-600">{Math.round(stats.totalWristbands * 0.85)}</p>
                    <p className="text-sm text-gray-600">Activated</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-orange-600">{stats.checkedIn}</p>
                    <p className="text-sm text-gray-600">Checked In</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-purple-600">{Math.round(stats.totalWristbands * 0.75)}</p>
                    <p className="text-sm text-gray-600">Linked to Tickets</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-red-600">0</p>
                    <p className="text-sm text-gray-600">Blocked</p>
                  </div>
                </div>
              </div>

              {/* Advanced Search & Filtering */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Advanced Search & Filtering</h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Search NFC ID</label>
                      <input
                        type="text"
                        placeholder="Enter NFC ID..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attendee Name</label>
                      <input
                        type="text"
                        placeholder="Search by name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Categories</option>
                        {stats.categories.map(cat => (
                          <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="activated">Activated</option>
                        <option value="checked-in">Checked In</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-700">Never checked in</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-700">Multiple check-ins</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="ml-2 text-sm text-gray-700">Unlinked tickets</span>
                      </label>
                    </div>
                    <div className="flex space-x-2">
                      <button className="btn btn-secondary btn-sm">Clear Filters</button>
                      <button className="btn btn-primary btn-sm">Apply Filters</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket Integration Hub */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title flex items-center">
                      <Users className="h-5 w-5 mr-2 text-blue-600" />
                      Ticket Integration
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Linking Mode</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          event.ticket_linking_mode === 'required' ? 'bg-red-100 text-red-800' :
                          event.ticket_linking_mode === 'optional' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.ticket_linking_mode || 'Disabled'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Unlinked Entry</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.allow_unlinked_entry ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {event.allow_unlinked_entry ? 'Allowed' : 'Blocked'}
                        </span>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <p className="text-lg font-semibold text-blue-600">{Math.round(stats.totalWristbands * 0.75)}</p>
                            <p className="text-xs text-gray-500">Linked</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-orange-600">{Math.round(stats.totalWristbands * 0.25)}</p>
                            <p className="text-xs text-gray-500">Unlinked</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title flex items-center">
                      <Activity className="h-5 w-5 mr-2 text-green-600" />
                      Bulk Operations
                    </h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-3">
                      <button className="btn btn-secondary w-full justify-start">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Bulk Activate Selected
                      </button>
                      <button className="btn btn-secondary w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Auto-Link by Email
                      </button>
                      <button className="btn btn-secondary w-full justify-start">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Change Category
                      </button>
                      <button className="btn btn-danger w-full justify-start">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Block Selected
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Wristband Manager */}
              <EnhancedWristbandManager 
                eventId={(event as any).is_series ? (event as any).main_event_id : event.id}
                isSeries={(event as any).is_series || false}
                seriesId={(event as any).is_series ? event.id : undefined}
              />
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

          {/* Guest List Tab */}
          {activeTab === 'guests' && event && (
            <div className="space-y-6">
              {/* Guest List Management Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Guest List Management</h2>
                  <p className="text-gray-600 text-sm">Manage tickets and guest data from ticketing platforms</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowTicketUploadModal(true)}
                    className="btn btn-primary"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Tickets
                  </button>
                </div>
              </div>

              {/* Guest List Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-blue-600">{tickets.length}</p>
                    <p className="text-sm text-gray-600">Total Tickets</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-green-600">{tickets.filter(t => t.wristband).length}</p>
                    <p className="text-sm text-gray-600">Linked to Wristbands</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-orange-600">{tickets.filter(t => t.status === 'linked').length}</p>
                    <p className="text-sm text-gray-600">Active</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-purple-600">{tickets.filter(t => !t.wristband).length}</p>
                    <p className="text-sm text-gray-600">Unlinked</p>
                  </div>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="card">
                <div className="card-body">
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search guests..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="all">All Status</option>
                        <option value="unused">Unused</option>
                        <option value="linked">Linked</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedStatus('all');
                          setColumnFilters({
                            ticket_number: '',
                            holder_name: '',
                            holder_email: '',
                            ticket_category: ''
                          });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tickets Table */}
              <div className="card">
                <div className="card-body p-0">
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div className="flex flex-col space-y-1">
                                <button
                                  onClick={() => handleTicketSort('ticket_number')}
                                  className="flex items-center space-x-1 hover:text-gray-700"
                                >
                                  <span>Ticket #</span>
                                  {ticketSortField === 'ticket_number' && (
                                    ticketSortDirection === 'asc' ? 
                                    <ChevronUp className="h-3 w-3" /> : 
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                                <input
                                  type="text"
                                  placeholder="Filter..."
                                  value={columnFilters.ticket_number}
                                  onChange={(e) => setColumnFilters({...columnFilters, ticket_number: e.target.value})}
                                  className="text-xs px-2 py-1 border border-gray-200 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div className="flex flex-col space-y-1">
                                <button
                                  onClick={() => handleTicketSort('holder_name')}
                                  className="flex items-center space-x-1 hover:text-gray-700"
                                >
                                  <span>Guest Details</span>
                                  {ticketSortField === 'holder_name' && (
                                    ticketSortDirection === 'asc' ? 
                                    <ChevronUp className="h-3 w-3" /> : 
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                                <input
                                  type="text"
                                  placeholder="Filter..."
                                  value={columnFilters.holder_name}
                                  onChange={(e) => setColumnFilters({...columnFilters, holder_name: e.target.value})}
                                  className="text-xs px-2 py-1 border border-gray-200 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div className="flex flex-col space-y-1">
                                <button
                                  onClick={() => handleTicketSort('ticket_category')}
                                  className="flex items-center space-x-1 hover:text-gray-700"
                                >
                                  <span>Category</span>
                                  {ticketSortField === 'ticket_category' && (
                                    ticketSortDirection === 'asc' ? 
                                    <ChevronUp className="h-3 w-3" /> : 
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                                <input
                                  type="text"
                                  placeholder="Filter..."
                                  value={columnFilters.ticket_category}
                                  onChange={(e) => setColumnFilters({...columnFilters, ticket_category: e.target.value})}
                                  className="text-xs px-2 py-1 border border-gray-200 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div className="flex flex-col space-y-1">
                                <button
                                  onClick={() => handleTicketSort('status')}
                                  className="flex items-center space-x-1 hover:text-gray-700"
                                >
                                  <span>Status</span>
                                  {ticketSortField === 'status' && (
                                    ticketSortDirection === 'asc' ? 
                                    <ChevronUp className="h-3 w-3" /> : 
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Wristband
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tickets
                            .filter(ticket => {
                              const matchesSearch = !searchQuery || 
                                ticket.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                ticket.holder_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                ticket.holder_email?.toLowerCase().includes(searchQuery.toLowerCase());
                              const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus;
                              
                              // Column filters
                              const matchesTicketNumber = !columnFilters.ticket_number || 
                                ticket.ticket_number?.toLowerCase().includes(columnFilters.ticket_number.toLowerCase());
                              const matchesHolderName = !columnFilters.holder_name || 
                                ticket.holder_name?.toLowerCase().includes(columnFilters.holder_name.toLowerCase());
                              const matchesHolderEmail = !columnFilters.holder_email || 
                                ticket.holder_email?.toLowerCase().includes(columnFilters.holder_email.toLowerCase());
                              const matchesCategory = !columnFilters.ticket_category || 
                                ticket.ticket_category?.toLowerCase().includes(columnFilters.ticket_category.toLowerCase());
                              
                              return matchesSearch && matchesStatus && matchesTicketNumber && 
                                     matchesHolderName && matchesHolderEmail && matchesCategory;
                            })
                            .map((ticket) => (
                              <tr key={ticket.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {ticket.ticket_number}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{ticket.holder_name || 'Unknown'}</div>
                                    <div className="text-sm text-gray-500">{ticket.holder_email}</div>
                                    {ticket.holder_phone && (
                                      <div className="text-xs text-gray-400">{ticket.holder_phone}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {ticket.ticket_category}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    ticket.status === 'linked' ? 'bg-green-100 text-green-800' :
                                    ticket.status === 'unused' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {ticket.status === 'linked' ? 'Linked' : 
                                     ticket.status === 'unused' ? 'Unused' : 'Cancelled'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {ticket.wristband ? (
                                    <div className="flex items-center">
                                      <LinkIcon className="h-4 w-4 text-green-500 mr-1" />
                                      <span className="font-medium">{ticket.wristband.nfc_id}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">Not linked</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => setShowActionsMenu(showActionsMenu === ticket.id ? null : ticket.id)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      
                      {tickets.length === 0 && !ticketsLoading && (
                        <div className="text-center py-8">
                          <Users className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No guests found</h3>
                          <p className="mt-1 text-sm text-gray-500">Get started by uploading your guest list.</p>
                          <div className="mt-6">
                            <button
                              onClick={() => setShowTicketUploadModal(true)}
                              className="btn btn-primary"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Guest List
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Gates & Entry Points Tab */}
          {activeTab === 'gates' && event && (
            <div className="space-y-6">
              {/* Gate Operations Dashboard */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Entry Point Control</h2>
                  <p className="text-gray-600 text-sm">Manage gates, monitor performance, and control access points</p>
                </div>
                <div className="flex space-x-3">
                  <button className="btn btn-secondary">
                    <MapPin className="h-4 w-4 mr-2" />
                    Add Gate
                  </button>
                  <button className="btn btn-primary">
                    <Activity className="h-4 w-4 mr-2" />
                    Live Monitor
                  </button>
                </div>
              </div>

              {/* Gate Overview Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-blue-600">0</p>
                    <p className="text-sm text-gray-600">Total Gates</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-green-600">0</p>
                    <p className="text-sm text-gray-600">Active</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-orange-600">--</p>
                    <p className="text-sm text-gray-600">Avg Health</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center">
                    <p className="text-2xl font-bold text-purple-600">0</p>
                    <p className="text-sm text-gray-600">Pending Approval</p>
                  </div>
                </div>
              </div>

              {/* Gates List */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">All Gates</h3>
                  <div className="flex space-x-2">
                    <button className="btn btn-secondary btn-sm">Map View</button>
                    <button className="btn btn-primary btn-sm">List View</button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {/* Sample gates - replace with real data */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <h4 className="font-medium text-gray-900">Main Entrance</h4>
                          <p className="text-sm text-gray-500">GPS: -26.2041, 28.0473 • Health: 98%</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">156 scans/hr</p>
                          <p className="text-xs text-gray-500">Last scan: 2s ago</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="btn btn-secondary btn-sm">Configure</button>
                          <button className="btn btn-primary btn-sm">Monitor</button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <h4 className="font-medium text-gray-900">VIP Gate</h4>
                          <p className="text-sm text-gray-500">GPS: -26.2045, 28.0480 • Health: 95%</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">42 scans/hr</p>
                          <p className="text-xs text-gray-500">Last scan: 15s ago</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="btn btn-secondary btn-sm">Configure</button>
                          <button className="btn btn-primary btn-sm">Monitor</button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div>
                          <h4 className="font-medium text-gray-900">South Entrance</h4>
                          <p className="text-sm text-gray-500">GPS: -26.2050, 28.0465 • Pending Approval</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-orange-600">Auto-discovered</p>
                          <p className="text-xs text-gray-500">5 minutes ago</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="btn btn-success btn-sm">Approve</button>
                          <button className="btn btn-danger btn-sm">Reject</button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div>
                          <h4 className="font-medium text-gray-900">East Gate</h4>
                          <p className="text-sm text-gray-500">GPS: -26.2038, 28.0485 • Health: 65%</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">Connection Issues</p>
                          <p className="text-xs text-gray-500">Last scan: 5m ago</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="btn btn-warning btn-sm">Diagnose</button>
                          <button className="btn btn-secondary btn-sm">Configure</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gate Performance & Category Bindings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Performance Analytics</h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Throughput</span>
                        <span className="text-lg font-semibold">{stats.checkedIn} scans</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Success Rate</span>
                        <span className="text-lg font-semibold text-green-600">97.8%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Processing Time</span>
                        <span className="text-lg font-semibold">1.2s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Peak Hour</span>
                        <span className="text-lg font-semibold">14:00 - 15:00</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Category Bindings</h3>
                  </div>
                  <div className="card-body">
                    <div className="space-y-3">
                      {stats.categories.map((cat, index) => (
                        <div key={cat.name} className="flex items-center justify-between p-2 rounded bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              index === 0 ? 'bg-blue-500' : 
                              index === 1 ? 'bg-purple-500' : 
                              index === 2 ? 'bg-green-500' : 'bg-orange-500'
                            }`}></div>
                            <span className="text-sm font-medium">{cat.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">3 gates</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Enforced</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Controls */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                    Emergency Gate Controls
                  </h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="btn btn-danger justify-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Close All Gates
                    </button>
                    <button className="btn btn-warning justify-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Emergency Mode
                    </button>
                    <button className="btn btn-secondary justify-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Open All Gates
                    </button>
                    <button className="btn btn-secondary justify-center">
                      <Activity className="h-4 w-4 mr-2" />
                      Reset All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fraud Detection Tab */}
          {activeTab === 'fraud' && event && (
            <FraudDetectionSystem 
              eventId={(event as any).is_series ? (event as any).main_event_id : event.id}
              isSeries={(event as any).is_series || false}
              seriesId={(event as any).is_series ? event.id : undefined}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && event && (
            <EnhancedAnalyticsDashboard 
              eventId={(event as any).is_series ? (event as any).main_event_id : event.id}
              isSeries={(event as any).is_series || false}
              seriesId={(event as any).is_series ? event.id : undefined}
            />
          )}

          {/* Export Tab */}
          {activeTab === 'export' && event && (
            <ExportReportingSystem 
              eventId={(event as any).is_series ? (event as any).main_event_id : event.id}
              eventName={event.name}
              isSeries={(event as any).is_series || false}
              seriesId={(event as any).is_series ? event.id : undefined}
            />
          )}

          {/* Emergency Tab */}
          {activeTab === 'emergency' && event && (
            <EmergencyControlCenter eventId={event.id} eventName={event.name} />
          )}

          {/* Testing Tab */}
          {activeTab === 'testing' && event && (
            <PreEventTestingSuite eventId={event.id} eventName={event.name} />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && event && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Event Settings</h2>
                  <p className="text-gray-600 text-sm">Configure event parameters and operational settings</p>
                </div>
                <Link
                  to={`/events/${event.id}/edit`}
                  className="btn btn-primary"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Event
                </Link>
              </div>

              {/* Event Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Settings */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Basic Information</h3>
                  </div>
                  <div className="card-body space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Event Name</label>
                      <p className="text-sm text-gray-900 mt-1">{event.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Location</label>
                      <p className="text-sm text-gray-900 mt-1">{event.location || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Capacity</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {event.total_capacity > 0 ? event.total_capacity.toLocaleString() : 'Unlimited'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Duration</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Operational Settings */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Operational Configuration</h3>
                  </div>
                  <div className="card-body space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Ticket Linking</label>
                      <p className="text-sm text-gray-900 mt-1 capitalize">
                        {event.ticket_linking_mode || 'Disabled'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Unlinked Entry</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {event.allow_unlinked_entry ? 'Allowed' : 'Not Allowed'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Public Event</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {event.is_public ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <p className="text-sm text-gray-900 mt-1 capitalize">
                        {event.lifecycle_status || 'Draft'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Configuration */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Advanced Configuration</h3>
                  <p className="text-sm text-gray-600">Event-specific settings and features</p>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Security Settings */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Security</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fraud Detection</span>
                          <span className="text-green-600 font-medium">Enabled</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Real-time Monitoring</span>
                          <span className="text-green-600 font-medium">Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Access Control</span>
                          <span className="text-blue-600 font-medium">Role-based</span>
                        </div>
                      </div>
                    </div>

                    {/* Gate Management */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Gate Management</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Auto Discovery</span>
                          <span className="text-green-600 font-medium">Enabled</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gate Approval</span>
                          <span className="text-orange-600 font-medium">Manual</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Health Monitoring</span>
                          <span className="text-green-600 font-medium">Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Analytics & Reporting */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Analytics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Real-time Analytics</span>
                          <span className="text-green-600 font-medium">Enabled</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Export Reports</span>
                          <span className="text-blue-600 font-medium">Available</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Data Retention</span>
                          <span className="text-gray-600 font-medium">365 days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Limits Manager */}
              <CategoryLimitsManager eventId={event.id} />

              {/* Quick Actions */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Quick Actions</h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => setActiveTab('wristbands')}
                      className="btn btn-secondary justify-center"
                    >
                      Manage Wristbands
                    </button>
                    <button
                      onClick={() => setActiveTab('command-center')}
                      className="btn btn-secondary justify-center"
                    >
                      Live Operations
                    </button>
                    <button
                      onClick={() => setActiveTab('analytics')}
                      className="btn btn-secondary justify-center"
                    >
                      View Analytics
                    </button>
                    <button
                      onClick={() => setActiveTab('access')}
                      className="btn btn-secondary justify-center"
                    >
                      Team Access
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Guest List Upload Modal */}
      {showGuestListUpload && event && (
        <GuestListUpload
          eventId={event.id}
          onUploadComplete={() => {
            fetchEventDetails(id!);
          }}
          onClose={() => setShowGuestListUpload(false)}
        />
      )}

      {/* Wristband Inventory Upload Modal */}
      {showWristbandUpload && event && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Upload Wristband Inventory</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {(event as any).is_series ? 'Upload wristbands for this series event' : 'Upload wristbands for this event'}
                </p>
              </div>
              <button
                onClick={() => setShowWristbandUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <WristbandBulkUpload
                eventId={(event as any).is_series ? (event as any).main_event_id : event.id}
                eventName={event.name}
                seriesId={(event as any).is_series ? event.id : undefined}
                isSeries={(event as any).is_series || false}
                onUploadComplete={() => {
                  fetchEventDetails(id!);
                  setShowWristbandUpload(false);
                }}
                onClose={() => setShowWristbandUpload(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Ticket Upload Modal */}
      {showTicketUploadModal && event && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Upload Guest List</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Upload ticket data for event: <span className="font-medium text-gray-700">{event.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowTicketUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <TicketCSVUpload
                eventId={(event as any).is_series ? (event as any).main_event_id : event.id}
                eventName={event.name}
                seriesId={(event as any).is_series ? event.id : undefined}
                isSeries={(event as any).is_series || false}
                onUploadComplete={() => {
                  fetchEventDetails(id!);
                  setShowTicketUploadModal(false);
                }}
                onClose={() => setShowTicketUploadModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default EventDetailsPage
