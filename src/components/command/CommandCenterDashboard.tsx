import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Users, Activity, AlertTriangle, MapPin, TrendingUp, Pause, Play, Volume2 } from 'lucide-react';

interface CommandCenterProps {
  eventId: string;
  eventName: string;
}

interface LiveMetrics {
  current_checkins: number;
  capacity_percentage: number;
  active_gates: number;
  staff_online: number;
  checkins_per_hour: number;
  last_updated: string;
}

interface Alert {
  id: string;
  type: 'capacity' | 'gate_error' | 'fraud' | 'staff' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  data?: any;
}

interface GateStatus {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'offline';
  checkins_last_hour: number;
  assigned_staff: string[];
  health_score: number;
  location?: string;
}

interface StaffActivity {
  user_id: string;
  name: string;
  status: 'online' | 'offline' | 'idle';
  last_scan: string;
  total_scans: number;
  current_gate?: string;
  efficiency_score: number;
}

const CommandCenterDashboard: React.FC<CommandCenterProps> = ({ eventId, eventName }) => {
  const [metrics, setMetrics] = useState<LiveMetrics>({
    current_checkins: 0,
    capacity_percentage: 0,
    active_gates: 0,
    staff_online: 0,
    checkins_per_hour: 0,
    last_updated: new Date().toISOString()
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [gates, setGates] = useState<GateStatus[]>([]);
  const [staffActivity, setStaffActivity] = useState<StaffActivity[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  // const [selectedTimeRange, setSelectedTimeRange] = useState('1h'); // Currently unused
  const [emergencyMode, setEmergencyMode] = useState(false);

  const alertSound = useRef<HTMLAudioElement | null>(null);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      alertSound.current = new Audio('/alert-sound.mp3');
    }
    
    startRealTimeUpdates();
    setupRealtimeSubscriptions();

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [eventId]);

  const startRealTimeUpdates = () => {
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
    }

    updateInterval.current = setInterval(() => {
      if (!isPaused) {
        fetchLiveMetrics();
        fetchGateStatus();
        fetchStaffActivity();
      }
    }, 3000); // Update every 3 seconds
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to check-ins
    const checkinSubscription = supabase
      .channel(`checkins_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkin_logs',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          handleNewCheckin(payload.new);
        }
      )
      .subscribe();

    // Subscribe to alerts
    const alertSubscription = supabase
      .channel(`alerts_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_alerts'
        },
        (payload) => {
          handleNewAlert(payload.new);
        }
      )
      .subscribe();

    return () => {
      checkinSubscription.unsubscribe();
      alertSubscription.unsubscribe();
    };
  };

  const fetchLiveMetrics = async () => {
    try {
      // Get current check-ins count
      const { data: checkins, error: checkinsError } = await supabase
        .from('checkin_logs')
        .select('id')
        .eq('event_id', eventId)
        .eq('status', 'success');

      if (checkinsError) throw checkinsError;

      // Get event capacity
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const maxCapacity = event.config?.capacity_settings?.max_capacity || 1000;
      const currentCheckins = checkins?.length || 0;

      // Get hourly check-ins
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: hourlyCheckins } = await supabase
        .from('checkin_logs')
        .select('id')
        .eq('event_id', eventId)
        .gte('timestamp', oneHourAgo);

      // Get active gates count
      const { data: activeGates } = await supabase
        .from('gates')
        .select('id')
        .eq('event_id', eventId)
        .eq('status', 'active');

      // Get online staff count
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: onlineStaff } = await supabase
        .from('checkin_logs')
        .select('staff_id')
        .eq('event_id', eventId)
        .gte('timestamp', fiveMinutesAgo)
        .not('staff_id', 'is', null);

      const uniqueStaff = new Set(onlineStaff?.map(s => s.staff_id) || []);

      setMetrics({
        current_checkins: currentCheckins,
        capacity_percentage: (currentCheckins / maxCapacity) * 100,
        active_gates: activeGates?.length || 0,
        staff_online: uniqueStaff.size,
        checkins_per_hour: hourlyCheckins?.length || 0,
        last_updated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error fetching live metrics:', error);
    }
  };

  const fetchGateStatus = async () => {
    try {
      const { data: gatesData, error } = await supabase
        .from('gates')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;

      const gateStatuses: GateStatus[] = await Promise.all(
        (gatesData || []).map(async (gate) => {
          // Get recent check-ins for this gate
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: recentCheckins } = await supabase
            .from('checkin_logs')
            .select('id, staff_id')
            .eq('event_id', eventId)
            .eq('location', gate.name)
            .gte('timestamp', oneHourAgo);

          const uniqueStaff = new Set(recentCheckins?.map(c => c.staff_id).filter(Boolean) || []);

          return {
            id: gate.id,
            name: gate.name,
            status: gate.status === 'approved' ? 'active' : gate.status,
            checkins_last_hour: recentCheckins?.length || 0,
            assigned_staff: Array.from(uniqueStaff),
            health_score: calculateGateHealthScore(recentCheckins?.length || 0),
            location: gate.location_description
          };
        })
      );

      setGates(gateStatuses);
    } catch (error) {
      console.error('Error fetching gate status:', error);
    }
  };

  const fetchStaffActivity = async () => {
    try {
      const { data: staffData, error } = await supabase
        .from('event_access')
        .select(`
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (error) throw error;

      const staffActivities: StaffActivity[] = await Promise.all(
        (staffData || []).map(async (staff) => {
          // Get recent activity
          const { data: recentScans } = await supabase
            .from('checkin_logs')
            .select('timestamp, location')
            .eq('event_id', eventId)
            .eq('staff_id', staff.user_id)
            .order('timestamp', { ascending: false })
            .limit(10);

          const totalScans = recentScans?.length || 0;
          const lastScan = recentScans?.[0]?.timestamp || '';
          const currentGate = recentScans?.[0]?.location || '';

          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const isOnline = lastScan && new Date(lastScan) > fiveMinutesAgo;

          return {
            user_id: staff.user_id,
            name: (staff.profiles as any)?.full_name || (staff.profiles as any)?.email || 'Unknown',
            status: isOnline ? 'online' : 'offline',
            last_scan: lastScan,
            total_scans: totalScans,
            current_gate: currentGate,
            efficiency_score: calculateEfficiencyScore(totalScans, lastScan)
          };
        })
      );

      setStaffActivity(staffActivities);
    } catch (error) {
      console.error('Error fetching staff activity:', error);
    }
  };

  const calculateGateHealthScore = (checkinsLastHour: number): number => {
    // Simple health score based on activity
    if (checkinsLastHour > 50) return 100;
    if (checkinsLastHour > 20) return 80;
    if (checkinsLastHour > 5) return 60;
    if (checkinsLastHour > 0) return 40;
    return 20;
  };

  const calculateEfficiencyScore = (totalScans: number, lastScan: string): number => {
    if (!lastScan) return 0;
    
    const hoursSinceLastScan = (Date.now() - new Date(lastScan).getTime()) / (1000 * 60 * 60);
    const scansPerHour = totalScans / Math.max(hoursSinceLastScan, 1);
    
    return Math.min(Math.round(scansPerHour * 10), 100);
  };

  const handleNewCheckin = (_checkin: any) => {
    if (!isPaused) {
      // Update metrics immediately
      setMetrics(prev => ({
        ...prev,
        current_checkins: prev.current_checkins + 1,
        last_updated: new Date().toISOString()
      }));

      // Check for capacity alerts
      checkCapacityAlert(metrics.current_checkins + 1);
    }
  };

  const handleNewAlert = (alert: any) => {
    const newAlert: Alert = {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.created_at,
      acknowledged: false,
      data: alert.data
    };

    setAlerts(prev => [newAlert, ...prev.slice(0, 9)]); // Keep last 10 alerts

    // Play sound for high/critical alerts
    if (soundEnabled && (alert.severity === 'high' || alert.severity === 'critical')) {
      alertSound.current?.play().catch(() => {
        // Ignore audio play errors
      });
    }
  };

  const checkCapacityAlert = async (currentCount: number) => {
    try {
      const { data: event } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      const capacitySettings = event?.config?.capacity_settings;
      if (!capacitySettings?.alerts_enabled) return;

      const maxCapacity = capacitySettings.max_capacity;
      const threshold = capacitySettings.alert_threshold || 90;
      const percentage = (currentCount / maxCapacity) * 100;

      if (percentage >= threshold) {
        const alert: Alert = {
          id: Date.now().toString(),
          type: 'capacity',
          severity: percentage >= 95 ? 'critical' : 'high',
          message: `Capacity at ${percentage.toFixed(1)}% (${currentCount}/${maxCapacity})`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        };

        setAlerts(prev => [alert, ...prev]);
      }
    } catch (error) {
      console.error('Error checking capacity alert:', error);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const toggleEmergencyStop = async () => {
    try {
      const { data: event } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      const newConfig = {
        ...event?.config,
        emergency_stop: !emergencyMode
      };

      const { error } = await supabase
        .from('events')
        .update({ config: newConfig })
        .eq('id', eventId);

      if (error) throw error;
      setEmergencyMode(!emergencyMode);
    } catch (error) {
      console.error('Error toggling emergency stop:', error);
    }
  };

  const sendBroadcastMessage = () => {
    // TODO: Implement broadcast messaging
    alert('Broadcast messaging feature coming soon!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'online': return 'text-green-600 bg-green-100';
      case 'idle': return 'text-yellow-600 bg-yellow-100';
      case 'error': case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Command Center</h2>
          <p className="text-gray-600">{eventName} • Live Operations</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-md ${soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            <Volume2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center px-3 py-2 rounded-md ${isPaused ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
          >
            {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          
          <button
            onClick={toggleEmergencyStop}
            className={`px-4 py-2 rounded-md font-medium ${
              emergencyMode 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            {emergencyMode ? 'EMERGENCY ACTIVE' : 'Emergency Stop'}
          </button>
        </div>
      </div>

      {/* Emergency Mode Banner */}
      {emergencyMode && (
        <div className="bg-red-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 mr-3" />
              <div>
                <p className="font-semibold">EMERGENCY MODE ACTIVE</p>
                <p className="text-sm">All check-ins are currently disabled</p>
              </div>
            </div>
            <button
              onClick={sendBroadcastMessage}
              className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800"
            >
              Send Alert to Staff
            </button>
          </div>
        </div>
      )}

      {/* Hero Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Check-ins</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.current_checkins.toLocaleString()}</p>
              <p className="text-sm text-gray-500">
                {metrics.checkins_per_hour}/hr rate
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Capacity</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.capacity_percentage.toFixed(1)}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    metrics.capacity_percentage > 90 ? 'bg-red-500' :
                    metrics.capacity_percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(metrics.capacity_percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Gates</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.active_gates}</p>
              <p className="text-sm text-gray-500">
                {gates.filter(g => g.status === 'active').length} operational
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Staff Online</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.staff_online}</p>
              <p className="text-sm text-gray-500">
                Last update: {new Date(metrics.last_updated).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {alerts.filter(a => !a.acknowledged).map(alert => (
              <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm opacity-75">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3 py-1 text-sm bg-white bg-opacity-50 rounded hover:bg-opacity-75"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gate Status Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gate Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gates.map(gate => (
            <div key={gate.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{gate.name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(gate.status)}`}>
                  {gate.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Check-ins (1h):</span>
                  <span className="font-medium">{gate.checkins_last_hour}</span>
                </div>
                <div className="flex justify-between">
                  <span>Health Score:</span>
                  <span className="font-medium">{gate.health_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Staff:</span>
                  <span className="font-medium">{gate.assigned_staff.length}</span>
                </div>
              </div>
              
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    gate.health_score > 80 ? 'bg-green-500' :
                    gate.health_score > 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${gate.health_score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Activity Monitor */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Activity</h3>
        <div className="space-y-3">
          {staffActivity.map(staff => (
            <div key={staff.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${staff.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <p className="font-medium text-gray-900">{staff.name}</p>
                  <p className="text-sm text-gray-500">
                    {staff.current_gate && `At: ${staff.current_gate}`}
                    {staff.last_scan && ` • Last scan: ${new Date(staff.last_scan).toLocaleTimeString()}`}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{staff.total_scans} scans</p>
                <p className="text-xs text-gray-500">Efficiency: {staff.efficiency_score}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandCenterDashboard;
