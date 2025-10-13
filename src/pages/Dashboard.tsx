import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { 
  Calendar, 
  CreditCard, 
  CheckSquare, 
  Users, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Activity,
  AlertTriangle,
  Clock,
  Shield,
  Zap,
  BarChart3,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react'

interface DashboardStats {
  totalEvents: number
  activeEvents: number
  totalWristbands: number
  totalCheckins: number
  recentEvents: any[]
  liveEvents: any[]
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical'
    uptime: string
    responseTime: number
    activeConnections: number
  }
  realtimeMetrics: {
    checkinsLastHour: number
    peakHourToday: string
    fraudAlertsToday: number
    staffOnline: number
  }
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    activeEvents: 0,
    totalWristbands: 0,
    totalCheckins: 0,
    recentEvents: [],
    liveEvents: [],
    systemHealth: {
      status: 'healthy',
      uptime: '--',
      responseTime: 0,
      activeConnections: 0
    },
    realtimeMetrics: {
      checkinsLastHour: 0,
      peakHourToday: '--',
      fraudAlertsToday: 0,
      staffOnline: 0
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch events
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (eventsError) throw eventsError

      // Fetch wristbands
      const { data: wristbands, error: wristbandsError } = await supabase
        .from('wristbands')
        .select('*')
      
      if (wristbandsError) throw wristbandsError

      // Fetch checkins
      const { data: checkins, error: checkinsError } = await supabase
        .from('checkin_logs')
        .select('*')

      if (checkinsError) throw checkinsError

      // Calculate active events
      const now = new Date()
      const activeEvents = events?.filter((event: any) => {
        const startDate = new Date(event.start_date)
        const endDate = new Date(event.end_date)
        return now >= startDate && now <= endDate
      }) || []

      // Calculate check-ins in last hour
      const oneHourAgo = new Date(Date.now() - 3600000)
      const checkinsLastHour = checkins?.filter((c: any) =>
        new Date(c.created_at) > oneHourAgo
      ).length || 0

      // Calculate peak hour from today's check-ins
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayCheckins = checkins?.filter((c: any) =>
        new Date(c.created_at) >= today
      ) || []

      const hourCounts: { [hour: string]: number } = {}
      todayCheckins.forEach((c: any) => {
        const hour = new Date(c.created_at).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })

      let peakHour = '--'
      let maxCount = 0
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > maxCount) {
          maxCount = count
          const h = parseInt(hour)
          peakHour = h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`
        }
      })

      // Get unique staff who have checked in people today
      const { data: staffSessions, error: staffError } = await supabase
        .from('checkin_logs')
        .select('staff_id')
        .gte('created_at', today.toISOString())
        .not('staff_id', 'is', null)

      const uniqueStaff = new Set(staffSessions?.map(s => s.staff_id) || [])

      setStats(prev => ({
        ...prev,
        totalEvents: events?.length || 0,
        activeEvents: activeEvents.length,
        totalWristbands: wristbands?.length || 0,
        totalCheckins: checkins?.length || 0,
        recentEvents: events?.slice(0, 5) || [],
        liveEvents: activeEvents.slice(0, 3),
        realtimeMetrics: {
          ...prev.realtimeMetrics,
          checkinsLastHour,
          peakHourToday: peakHour,
          staffOnline: uniqueStaff.size
        }
      }))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
          <p className="text-gray-600">Real-time portal overview and system status</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
            Refresh
          </button>
          <Link
            to="/events/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            New Event
          </Link>
        </div>
      </div>

      {/* System Health Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">System Health</h2>
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            stats.systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800' :
            stats.systemHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {stats.systemHealth.status === 'healthy' ? '🟢' : stats.systemHealth.status === 'warning' ? '🟡' : '🔴'}
            {stats.systemHealth.status.toUpperCase()}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.systemHealth.uptime}</div>
            <div className="text-sm text-gray-500">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.systemHealth.responseTime}ms</div>
            <div className="text-sm text-gray-500">Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.systemHealth.activeConnections}</div>
            <div className="text-sm text-gray-500">Active Connections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.realtimeMetrics.staffOnline}</div>
            <div className="text-sm text-gray-500">Staff Online</div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.totalEvents}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Events</p>
                <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.activeEvents}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Wristbands</p>
                <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.totalWristbands}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Check-ins</p>
                <p className="text-3xl font-semibold text-gray-900 mt-1">{stats.totalCheckins}</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Events */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="card-title">Recent Events</h2>
                <Link to="/events" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all
                </Link>
              </div>
            </div>
            <div className="card-body">
              {stats.recentEvents.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentEvents.map((event) => {
                    const startDate = new Date(event.start_date)
                    const endDate = new Date(event.end_date)
                    const now = new Date()
                    const isActive = now >= startDate && now <= endDate
                    const isPast = now > endDate
                    
                    return (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium text-gray-900">{event.name}</h3>
                              {isActive && (
                                <span className="status-badge status-success">Active</span>
                              )}
                              {isPast && (
                                <span className="status-badge status-neutral">Completed</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                              {event.location && ` • ${event.location}`}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No events yet</p>
                  <Link to="/events/new" className="btn btn-primary mt-4">
                    Create your first event
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
            </div>
            <div className="card-body space-y-3">
              <Link to="/events/new" className="btn btn-secondary w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Create Event
              </Link>
              <Link to="/wristbands" className="btn btn-secondary w-full justify-start">
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Wristbands
              </Link>
              <Link to="/access" className="btn btn-secondary w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                User Access
              </Link>
              <Link to="/checkins" className="btn btn-secondary w-full justify-start">
                <CheckSquare className="h-4 w-4 mr-2" />
                View Check-ins
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">System Status</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="status-badge status-success">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">NFC Scanning</span>
                <span className="status-badge status-success">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Real-time Sync</span>
                <span className="status-badge status-success">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
