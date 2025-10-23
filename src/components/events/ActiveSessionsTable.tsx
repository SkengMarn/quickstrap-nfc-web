import React, { useState, useEffect } from 'react';
import {
  Monitor, Smartphone, Tablet, Globe, MapPin, Clock, Activity,
  User, Mail, Shield, AlertCircle, CheckCircle, XCircle, Eye,
  Wifi, Navigation, RefreshCw, LogOut
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  phone: string | null;
}

interface ActiveSession {
  id: string;
  user_id: string;
  organization_id: string | null;
  current_route: string | null;
  current_resource_type: string | null;
  current_resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  last_activity_at: string;
  session_started_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: Profile;
  organization_name?: string;
  resource_name?: string;
}

interface ActiveSessionsTableProps {
  eventId?: string;
  organizationId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}

const ActiveSessionsTable: React.FC<ActiveSessionsTableProps> = ({
  eventId,
  organizationId,
  autoRefresh = true,
  refreshInterval = 30
}) => {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchSessions();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchSessions();
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [eventId, organizationId, autoRefresh, refreshInterval]);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      // Build query
      let query = supabase
        .from('active_sessions')
        .select(`
          *,
          profile:profiles!active_sessions_user_id_fkey (
            id,
            email,
            full_name,
            role,
            phone
          )
        `)
        .order('last_activity_at', { ascending: false });

      // Filter by organization if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      // Filter by event if provided (sessions viewing/working on this event)
      if (eventId) {
        query = query.or(`current_resource_id.eq.${eventId},current_route.ilike.%/events/${eventId}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enhance sessions with additional data
      const enhancedSessions = await Promise.all(
        (data || []).map(async (session: any) => {
          // Get organization name
          let organizationName = null;
          if (session.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('name')
              .eq('id', session.organization_id)
              .single();
            organizationName = org?.name || null;
          }

          // Get resource name (event, etc.)
          let resourceName = null;
          if (session.current_resource_id && session.current_resource_type) {
            if (session.current_resource_type === 'event') {
              const { data: event } = await supabase
                .from('events')
                .select('name')
                .eq('id', session.current_resource_id)
                .single();
              resourceName = event?.name || null;
            }
          }

          return {
            ...session,
            organization_name: organizationName,
            resource_name: resourceName
          };
        })
      );

      setSessions(enhancedSessions);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string | null, userAgent: string | null) => {
    const ua = (userAgent || '').toLowerCase();

    if (deviceType === 'mobile' || ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="h-5 w-5 text-blue-600" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="h-5 w-5 text-purple-600" />;
    }
    return <Monitor className="h-5 w-5 text-gray-600" />;
  };

  const getDeviceTypeLabel = (deviceType: string | null, userAgent: string | null) => {
    const ua = (userAgent || '').toLowerCase();

    if (deviceType) return deviceType;

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'Mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    }
    return 'Desktop';
  };

  const getAppType = (currentRoute: string | null, userAgent: string | null) => {
    const ua = (userAgent || '').toLowerCase();
    const route = (currentRoute || '').toLowerCase();

    // Check if iOS NFC app
    if (ua.includes('quickstrap') || ua.includes('nfc-scanner')) {
      return { type: 'iOS NFC App', color: 'text-blue-600 bg-blue-50', icon: <Smartphone className="h-4 w-4" /> };
    }

    // Check if portal
    if (route.includes('dashboard') || route.includes('events') || route.includes('portal')) {
      return { type: 'Web Portal', color: 'text-green-600 bg-green-50', icon: <Globe className="h-4 w-4" /> };
    }

    return { type: 'Unknown', color: 'text-gray-600 bg-gray-50', icon: <Activity className="h-4 w-4" /> };
  };

  const getStatusBadge = (lastActivity: string) => {
    const lastActivityDate = new Date(lastActivity);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastActivityDate.getTime()) / 60000);

    if (diffMinutes < 5) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        <Activity className="h-3 w-3 mr-1 animate-pulse" />
        Active
      </span>;
    }
    if (diffMinutes < 15) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        Idle
      </span>;
    }
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
      <XCircle className="h-3 w-3 mr-1" />
      Inactive
    </span>;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scanner':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBrowserInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();

    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';

    return 'Unknown';
  };

  const getOSInfo = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();

    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac os')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';

    return 'Unknown';
  };

  const toggleExpand = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
          <p className="text-sm text-gray-600 mt-1">
            {sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'}
            {' • '}
            Last updated: {getTimeAgo(lastRefresh.toISOString())}
          </p>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Sessions Table */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
          <p className="text-gray-600">No users are currently logged in.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device & App
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location & Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session) => {
                  const profile = session.profile;
                  const appType = getAppType(session.current_route, session.user_agent);
                  const isExpanded = expandedSessionId === session.id;
                  const browser = getBrowserInfo(session.user_agent);
                  const os = getOSInfo(session.user_agent);

                  return (
                    <React.Fragment key={session.id}>
                      <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleExpand(session.id)}>
                        {/* User Info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {profile?.full_name || 'Unknown User'}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center mt-1">
                                <Mail className="h-3 w-3 mr-1" />
                                {profile?.email || 'No email'}
                              </div>
                              <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleColor(profile?.role || 'user')}`}>
                                  <Shield className="h-3 w-3 mr-1" />
                                  {profile?.role || 'User'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Device & App */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start space-x-3">
                            {getDeviceIcon(session.device_type, session.user_agent)}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {getDeviceTypeLabel(session.device_type, session.user_agent)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {browser} • {os}
                              </div>
                              <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${appType.color}`}>
                                  {appType.icon}
                                  <span className="ml-1">{appType.type}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current Activity */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {session.current_route ? (
                              <div className="space-y-1">
                                <div className="flex items-center">
                                  <Navigation className="h-3 w-3 mr-1 text-gray-400" />
                                  <span className="font-mono text-xs truncate max-w-xs">
                                    {session.current_route}
                                  </span>
                                </div>
                                {session.resource_name && (
                                  <div className="text-xs text-gray-600">
                                    Viewing: <span className="font-medium">{session.resource_name}</span>
                                  </div>
                                )}
                                {session.organization_name && (
                                  <div className="text-xs text-gray-600">
                                    Org: <span className="font-medium">{session.organization_name}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No active route</span>
                            )}
                          </div>
                        </td>

                        {/* Location & Network */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {session.ip_address ? (
                              <div className="flex items-center text-sm text-gray-900">
                                <Wifi className="h-3 w-3 mr-1 text-gray-400" />
                                <span className="font-mono text-xs">{session.ip_address}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">No IP</span>
                            )}
                            {profile?.phone && (
                              <div className="text-xs text-gray-600">
                                Phone: {profile.phone}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Session Info */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Started:</span>{' '}
                              {new Date(session.session_started_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Last Active:</span>{' '}
                              {getTimeAgo(session.last_activity_at)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Duration: {Math.floor((new Date(session.last_activity_at).getTime() - new Date(session.session_started_at).getTime()) / 60000)}m
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(session.last_activity_at)}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(session.id);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              <h4 className="text-sm font-semibold text-gray-900">Session Details</h4>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                    User Information
                                  </h5>
                                  <dl className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <dt className="text-gray-600">User ID:</dt>
                                      <dd className="font-mono text-gray-900">{session.user_id.slice(0, 8)}...</dd>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <dt className="text-gray-600">Email:</dt>
                                      <dd className="text-gray-900">{profile?.email}</dd>
                                    </div>
                                    {profile?.phone && (
                                      <div className="flex justify-between text-xs">
                                        <dt className="text-gray-600">Phone:</dt>
                                        <dd className="text-gray-900">{profile.phone}</dd>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-xs">
                                      <dt className="text-gray-600">Role:</dt>
                                      <dd className="text-gray-900 capitalize">{profile?.role}</dd>
                                    </div>
                                  </dl>
                                </div>

                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                    Technical Details
                                  </h5>
                                  <dl className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <dt className="text-gray-600">Session ID:</dt>
                                      <dd className="font-mono text-gray-900">{session.id.slice(0, 8)}...</dd>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <dt className="text-gray-600">IP Address:</dt>
                                      <dd className="font-mono text-gray-900">{session.ip_address || 'N/A'}</dd>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <dt className="text-gray-600">Browser:</dt>
                                      <dd className="text-gray-900">{browser}</dd>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <dt className="text-gray-600">OS:</dt>
                                      <dd className="text-gray-900">{os}</dd>
                                    </div>
                                  </dl>
                                </div>
                              </div>

                              {session.user_agent && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                    User Agent
                                  </h5>
                                  <p className="text-xs font-mono text-gray-600 bg-white p-2 rounded border border-gray-200 break-all">
                                    {session.user_agent}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveSessionsTable;
