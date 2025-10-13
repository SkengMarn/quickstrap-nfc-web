import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { AlertTriangle, Ban, Users, MapPin, MessageSquare, Power, Shield, Clock, Download } from 'lucide-react';

interface EmergencyState {
  is_active: boolean;
  type: 'capacity' | 'security' | 'weather' | 'medical' | 'evacuation' | 'system';
  reason: string;
  activated_at: string;
  activated_by: string;
  affected_areas: string[];
  restrictions: {
    checkins_disabled: boolean;
    specific_gates_closed: string[];
    categories_blocked: string[];
    staff_only_mode: boolean;
  };
}

interface EmergencyControlCenterProps {
  eventId: string;
  eventName: string;
}

const EmergencyControlCenter: React.FC<EmergencyControlCenterProps> = ({ eventId, eventName }) => {
  const [emergencyState, setEmergencyState] = useState<EmergencyState | null>(null);
  const [currentCapacity, setCurrentCapacity] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(1000);
  const [activeGates, setActiveGates] = useState<any[]>([]);
  const [onlineStaff, setOnlineStaff] = useState<any[]>([]);
  const [emergencyLog, setEmergencyLog] = useState<any[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmergencyState();
    fetchCurrentMetrics();
    fetchEmergencyLog();
    setupRealtimeUpdates();
  }, [eventId]);

  const fetchEmergencyState = async () => {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      if (error) throw error;

      const emergencyConfig = event.config?.emergency_state;
      if (emergencyConfig?.is_active) {
        setEmergencyState(emergencyConfig);
      }
    } catch (error) {
      console.error('Error fetching emergency state:', error);
    }
  };

  const fetchCurrentMetrics = async () => {
    try {
      // Get current check-ins
      const { data: checkins } = await supabase
        .from('checkin_logs')
        .select('id')
        .eq('event_id', eventId)
        .eq('status', 'success');

      // Get event capacity
      const { data: event } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      // Get active gates
      const { data: gates } = await supabase
        .from('gates')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'approved');

      // Get online staff
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: staffActivity } = await supabase
        .from('checkin_logs')
        .select('staff_id, profiles:staff_id(full_name)')
        .eq('event_id', eventId)
        .gte('timestamp', fiveMinutesAgo)
        .not('staff_id', 'is', null);

      setCurrentCapacity(checkins?.length || 0);
      setMaxCapacity(event?.config?.capacity_settings?.max_capacity || 1000);
      setActiveGates(gates || []);
      
      // Get unique staff
      const uniqueStaff = Array.from(
        new Map(staffActivity?.map(s => [s.staff_id, s]) || []).values()
      );
      setOnlineStaff(uniqueStaff);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmergencyLog = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('event_id', eventId)
        .ilike('action', '%emergency%')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setEmergencyLog(data || []);
    } catch (error) {
      console.error('Error fetching emergency log:', error);
    }
  };

  const setupRealtimeUpdates = () => {
    const subscription = supabase
      .channel(`emergency_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`
        },
        (payload) => {
          const emergencyConfig = payload.new.config?.emergency_state;
          if (emergencyConfig?.is_active !== emergencyState?.is_active) {
            setEmergencyState(emergencyConfig?.is_active ? emergencyConfig : null);
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const activateEmergency = async (type: EmergencyState['type'], reason: string, restrictions: any) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const emergencyConfig: EmergencyState = {
        is_active: true,
        type,
        reason,
        activated_at: new Date().toISOString(),
        activated_by: currentUser.user?.id || '',
        affected_areas: [], // TODO: Allow selection of specific areas
        restrictions
      };

      // Update event config
      const { data: event } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      const newConfig = {
        ...event?.config,
        emergency_state: emergencyConfig,
        check_ins_enabled: !restrictions.checkins_disabled
      };

      const { error } = await supabase
        .from('events')
        .update({ config: newConfig })
        .eq('id', eventId);

      if (error) throw error;

      // Log the emergency activation
      await supabase
        .from('audit_log')
        .insert({
          event_id: eventId,
          action: 'emergency_activated',
          table_name: 'events',
          record_id: eventId,
          new_values: { type, reason, restrictions }
        });

      setEmergencyState(emergencyConfig);
      
      // Send alert to all staff
      await sendEmergencyAlert(`EMERGENCY ACTIVATED: ${type.toUpperCase()} - ${reason}`);
      
      alert('Emergency mode activated successfully');
    } catch (error) {
      console.error('Error activating emergency:', error);
      alert('Error activating emergency mode');
    }
  };

  const deactivateEmergency = async () => {
    if (!confirm('Are you sure you want to deactivate emergency mode?')) return;

    try {
      const { data: event } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      const newConfig = {
        ...event?.config,
        emergency_state: { is_active: false },
        check_ins_enabled: true
      };

      const { error } = await supabase
        .from('events')
        .update({ config: newConfig })
        .eq('id', eventId);

      if (error) throw error;

      // Log the deactivation
      await supabase
        .from('audit_log')
        .insert({
          event_id: eventId,
          action: 'emergency_deactivated',
          table_name: 'events',
          record_id: eventId,
          new_values: { deactivated_at: new Date().toISOString() }
        });

      setEmergencyState(null);
      
      // Notify staff
      await sendEmergencyAlert('Emergency mode has been deactivated. Normal operations resumed.');
      
      alert('Emergency mode deactivated');
    } catch (error) {
      console.error('Error deactivating emergency:', error);
      alert('Error deactivating emergency mode');
    }
  };

  const capacityLockdown = async () => {
    await activateEmergency('capacity', 'Maximum capacity reached', {
      checkins_disabled: true,
      specific_gates_closed: [],
      categories_blocked: [],
      staff_only_mode: false
    });
  };

  const securityLockdown = async () => {
    const reason = prompt('Security incident reason:');
    if (!reason) return;

    await activateEmergency('security', reason, {
      checkins_disabled: true,
      specific_gates_closed: activeGates.map(g => g.id),
      categories_blocked: [],
      staff_only_mode: true
    });
  };

  const evacuationMode = async () => {
    const reason = prompt('Evacuation reason:');
    if (!reason) return;

    await activateEmergency('evacuation', reason, {
      checkins_disabled: true,
      specific_gates_closed: [],
      categories_blocked: [],
      staff_only_mode: true
    });

    // Send evacuation instructions
    await sendEmergencyAlert(`EVACUATION NOTICE: ${reason}. Please follow evacuation procedures immediately.`);
  };

  const blockCategory = async (_category: string) => {
    try {
      const { data: event } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      const currentBlocked = event?.config?.emergency_state?.restrictions?.categories_blocked || [];
      const newBlocked = [...currentBlocked, _category];

      const newConfig = {
        ...event?.config,
        emergency_state: {
          ...event?.config?.emergency_state,
          restrictions: {
            ...event?.config?.emergency_state?.restrictions,
            categories_blocked: newBlocked
          }
        }
      };

      const { error } = await supabase
        .from('events')
        .update({ config: newConfig })
        .eq('id', eventId);

      if (error) throw error;

      await sendEmergencyAlert(`Category ${_category} has been blocked from check-ins.`);
      fetchEmergencyState();
    } catch (error) {
      console.error('Error blocking category:', error);
    }
  };

  const closeGate = async (gateId: string, gateName: string) => {
    try {
      const { error } = await supabase
        .from('gates')
        .update({ status: 'inactive' })
        .eq('id', gateId);

      if (error) throw error;

      await sendEmergencyAlert(`Gate ${gateName} has been closed for security reasons.`);
      fetchCurrentMetrics();
    } catch (error) {
      console.error('Error closing gate:', error);
    }
  };

  const sendEmergencyAlert = async (message: string) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      // Get all staff for this event
      const { data: eventStaff } = await supabase
        .from('event_access')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (eventStaff) {
        const staffIds = eventStaff.map(s => s.user_id);
        
        // Send messages to all staff
        for (const staffId of staffIds) {
          await supabase
            .from('staff_messages')
            .insert({
              event_id: eventId,
              from_user_id: currentUser.user?.id,
              to_user_id: staffId,
              message_type: 'alert',
              subject: 'EMERGENCY ALERT',
              message,
              priority: 'urgent'
            });
        }
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error);
    }
  };

  const sendBroadcastMessage = async () => {
    if (!broadcastMessage.trim()) return;

    try {
      await sendEmergencyAlert(broadcastMessage);
      setBroadcastMessage('');
      alert('Broadcast message sent to all staff');
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert('Error sending broadcast message');
    }
  };

  const exportCurrentState = async () => {
    try {
      const exportData = {
        event_id: eventId,
        event_name: eventName,
        timestamp: new Date().toISOString(),
        emergency_state: emergencyState,
        current_capacity: currentCapacity,
        max_capacity: maxCapacity,
        capacity_percentage: (currentCapacity / maxCapacity) * 100,
        active_gates: activeGates.length,
        online_staff: onlineStaff.length,
        gates: activeGates.map(g => ({
          id: g.id,
          name: g.name,
          status: g.status
        })),
        staff: onlineStaff.map(s => ({
          id: s.staff_id,
          name: s.profiles?.full_name || 'Unknown'
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emergency-state-${eventId}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting state:', error);
    }
  };

  const capacityPercentage = (currentCapacity / maxCapacity) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Emergency Status Banner */}
      {emergencyState?.is_active && (
        <div className="bg-red-600 text-white p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 mr-3" />
              <div>
                <p className="font-bold text-lg">EMERGENCY MODE ACTIVE</p>
                <p className="text-sm">
                  Type: {emergencyState.type.toUpperCase()} | 
                  Reason: {emergencyState.reason} | 
                  Since: {new Date(emergencyState.activated_at).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={deactivateEmergency}
              className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800"
            >
              Deactivate Emergency
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Emergency Control Center</h3>
          <p className="text-sm text-gray-600">Crisis management and emergency response</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={exportCurrentState}
            className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export State
          </button>
        </div>
      </div>

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${
          capacityPercentage > 95 ? 'bg-red-100 border-red-200' :
          capacityPercentage > 85 ? 'bg-yellow-100 border-yellow-200' :
          'bg-green-100 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Capacity</p>
              <p className="text-2xl font-bold">{capacityPercentage.toFixed(1)}%</p>
              <p className="text-xs">{currentCapacity} / {maxCapacity}</p>
            </div>
            <Users className="w-8 h-8 opacity-60" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Gates</p>
              <p className="text-2xl font-bold text-gray-900">{activeGates.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Staff Online</p>
              <p className="text-2xl font-bold text-gray-900">{onlineStaff.length}</p>
            </div>
            <Shield className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${
          emergencyState?.is_active ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">System Status</p>
              <p className="text-lg font-bold">
                {emergencyState?.is_active ? 'EMERGENCY' : 'NORMAL'}
              </p>
            </div>
            <Power className={`w-8 h-8 ${emergencyState?.is_active ? 'text-red-600' : 'text-green-600'}`} />
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Emergency Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Emergency Actions</h4>
          
          <div className="space-y-3">
            <button
              onClick={capacityLockdown}
              disabled={emergencyState?.is_active}
              className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Ban className="w-5 h-5 mr-2" />
              Capacity Lockdown
            </button>
            
            <button
              onClick={securityLockdown}
              disabled={emergencyState?.is_active}
              className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Shield className="w-5 h-5 mr-2" />
              Security Lockdown
            </button>
            
            <button
              onClick={evacuationMode}
              disabled={emergencyState?.is_active}
              className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Evacuation Mode
            </button>
          </div>
        </div>

        {/* Broadcast Message */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Emergency Broadcast</h4>
          
          <div className="space-y-3">
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Enter emergency message to broadcast to all staff..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              onClick={sendBroadcastMessage}
              disabled={!broadcastMessage.trim()}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send to All Staff ({onlineStaff.length})
            </button>
          </div>
        </div>
      </div>

      {/* Gate Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Gate Controls</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeGates.map(gate => (
            <div key={gate.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">{gate.name}</h5>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  gate.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {gate.status}
                </span>
              </div>
              
              <button
                onClick={() => closeGate(gate.id, gate.name)}
                className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Emergency Close
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Log */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Emergency Log</h4>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {emergencyLog.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No emergency events recorded</p>
          ) : (
            emergencyLog.map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {log.new_values && (
                  <div className="text-right text-xs text-gray-500">
                    {log.new_values.type && <p>Type: {log.new_values.type}</p>}
                    {log.new_values.reason && <p>Reason: {log.new_values.reason}</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyControlCenter;
