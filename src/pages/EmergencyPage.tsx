import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  Ban, 
  Users, 
  Megaphone, 
  Phone,
  MapPin,
  Clock,
  Activity,
  Zap,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Power,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface EmergencyStatus {
  level: 'normal' | 'elevated' | 'high' | 'critical';
  active: boolean;
  lastUpdated: string;
  activeIncidents: number;
  evacuationStatus: 'none' | 'partial' | 'full';
  systemsLocked: boolean;
}

interface EmergencyAction {
  id: string;
  type: 'lockdown' | 'evacuation' | 'broadcast' | 'staff_alert' | 'system_shutdown';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  requiresConfirmation: boolean;
  estimatedImpact: string;
  icon: any;
}

interface ActiveIncident {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  reportedAt: string;
  reportedBy: string;
  status: 'active' | 'investigating' | 'resolved';
  responders: string[];
  estimatedAffected: number;
}

const EmergencyPage: React.FC = () => {
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus>({
    level: 'normal',
    active: false,
    lastUpdated: new Date().toISOString(),
    activeIncidents: 0,
    evacuationStatus: 'none',
    systemsLocked: false
  });

  const [incidents, setIncidents] = useState<ActiveIncident[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState<EmergencyAction | null>(null);
  const [loading, setLoading] = useState(false);

  const emergencyActions: EmergencyAction[] = [
    {
      id: 'full_lockdown',
      type: 'lockdown',
      title: 'Full System Lockdown',
      description: 'Immediately lock all gates and prevent new check-ins',
      severity: 'critical',
      requiresConfirmation: true,
      estimatedImpact: 'All attendee movement stopped',
      icon: Lock
    },
    {
      id: 'partial_lockdown',
      type: 'lockdown',
      title: 'Partial Lockdown',
      description: 'Lock specific gates while maintaining emergency exits',
      severity: 'high',
      requiresConfirmation: true,
      estimatedImpact: 'Limited attendee movement',
      icon: Shield
    },
    {
      id: 'emergency_broadcast',
      type: 'broadcast',
      title: 'Emergency Broadcast',
      description: 'Send urgent message to all staff and connected systems',
      severity: 'high',
      requiresConfirmation: false,
      estimatedImpact: 'All staff notified immediately',
      icon: Megaphone
    },
    {
      id: 'evacuation_alert',
      type: 'evacuation',
      title: 'Evacuation Alert',
      description: 'Trigger evacuation procedures and guide attendees to exits',
      severity: 'critical',
      requiresConfirmation: true,
      estimatedImpact: 'Full venue evacuation initiated',
      icon: Users
    },
    {
      id: 'staff_emergency_alert',
      type: 'staff_alert',
      title: 'Staff Emergency Alert',
      description: 'Alert all staff members of emergency situation',
      severity: 'medium',
      requiresConfirmation: false,
      estimatedImpact: 'All staff receive emergency notification',
      icon: Phone
    },
    {
      id: 'system_shutdown',
      type: 'system_shutdown',
      title: 'Emergency System Shutdown',
      description: 'Shut down all non-essential systems to preserve critical functions',
      severity: 'critical',
      requiresConfirmation: true,
      estimatedImpact: 'Only emergency systems remain active',
      icon: Power
    }
  ];

  useEffect(() => {
    fetchEmergencyData();
    const interval = setInterval(fetchEmergencyData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchEmergencyData = async () => {
    try {
      // Fetch real emergency incidents from database
      const { data: incidentsData, error } = await supabase
        .from('emergency_incidents')
        .select('*')
        .in('status', ['active', 'investigating'])
        .order('reported_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const transformedIncidents: ActiveIncident[] = (incidentsData || []).map((incident: any) => ({
        id: incident.id,
        type: incident.incident_type,
        severity: incident.severity,
        location: incident.location || 'Unknown',
        description: incident.description,
        reportedAt: incident.reported_at,
        reportedBy: incident.reported_by || 'System',
        status: incident.status,
        responders: incident.responders || [],
        estimatedAffected: incident.estimated_affected || 0
      }));

      setIncidents(transformedIncidents);

      // Update emergency status based on incidents
      const activeCount = transformedIncidents.filter(i => i.status === 'active').length;
      const hasCritical = transformedIncidents.some(i => i.severity === 'critical');
      const hasHigh = transformedIncidents.some(i => i.severity === 'high');
      const hasMedium = transformedIncidents.some(i => i.severity === 'medium');

      setEmergencyStatus(prev => ({
        ...prev,
        activeIncidents: activeCount,
        level: hasCritical ? 'critical' :
               hasHigh ? 'high' :
               hasMedium ? 'elevated' : 'normal',
        lastUpdated: new Date().toISOString(),
        active: activeCount > 0
      }));
    } catch (error) {
      console.error('Error fetching emergency data:', error);
    }
  };

  const executeEmergencyAction = async (action: EmergencyAction) => {
    if (action.requiresConfirmation) {
      setShowConfirmDialog(action);
      return;
    }

    setLoading(true);
    try {
      // Simulate executing emergency action
      console.log(`Executing emergency action: ${action.type}`);
      
      switch (action.type) {
        case 'lockdown':
          setEmergencyStatus(prev => ({ ...prev, systemsLocked: true }));
          break;
        case 'evacuation':
          setEmergencyStatus(prev => ({ ...prev, evacuationStatus: 'full' }));
          break;
        case 'broadcast':
          if (broadcastMessage.trim()) {
            // Send broadcast message
            console.log('Broadcasting:', broadcastMessage);
            setBroadcastMessage('');
          }
          break;
        case 'staff_alert':
          // Send staff alert
          console.log('Staff alert sent');
          break;
        case 'system_shutdown':
          // Shutdown non-essential systems
          console.log('Emergency shutdown initiated');
          break;
      }

      // In real app, make API call to execute action
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error executing emergency action:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmEmergencyAction = async () => {
    if (!showConfirmDialog) return;
    
    setShowConfirmDialog(null);
    await executeEmergencyAction(showConfirmDialog);
  };

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'elevated': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'normal': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <AlertTriangle className="h-6 w-6 mr-2 text-red-500" />
            Emergency Control Center
          </h1>
          <p className="text-gray-600">Critical incident management and emergency response controls</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(emergencyStatus.level)}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              emergencyStatus.level === 'critical' ? 'bg-red-500 animate-pulse' :
              emergencyStatus.level === 'high' ? 'bg-orange-500 animate-pulse' :
              emergencyStatus.level === 'elevated' ? 'bg-yellow-500' : 'bg-green-500'
            }`}></div>
            {emergencyStatus.level.toUpperCase()} ALERT
          </div>
          <button
            onClick={fetchEmergencyData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Emergency Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`bg-white overflow-hidden shadow rounded-lg border-l-4 ${
          emergencyStatus.level === 'critical' ? 'border-l-red-500' :
          emergencyStatus.level === 'high' ? 'border-l-orange-500' :
          emergencyStatus.level === 'elevated' ? 'border-l-yellow-500' : 'border-l-green-500'
        }`}>
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className={`h-6 w-6 ${
                  emergencyStatus.level === 'critical' ? 'text-red-400' :
                  emergencyStatus.level === 'high' ? 'text-orange-400' :
                  emergencyStatus.level === 'elevated' ? 'text-yellow-400' : 'text-green-400'
                }`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Alert Level</dt>
                  <dd className="text-lg font-medium text-gray-900">{emergencyStatus.level.toUpperCase()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-l-blue-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Incidents</dt>
                  <dd className="text-lg font-medium text-gray-900">{emergencyStatus.activeIncidents}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-l-purple-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {emergencyStatus.systemsLocked ? <Lock className="h-6 w-6 text-red-400" /> : <Unlock className="h-6 w-6 text-green-400" />}
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">System Status</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {emergencyStatus.systemsLocked ? 'LOCKED' : 'OPERATIONAL'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-l-indigo-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Evacuation</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {emergencyStatus.evacuationStatus.toUpperCase()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Emergency Actions</h3>
          <p className="text-sm text-gray-500 mt-1">Critical response actions for emergency situations</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emergencyActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <div key={action.id} className={`p-4 border-2 rounded-lg hover:shadow-md transition-shadow ${
                  action.severity === 'critical' ? 'border-red-200 hover:border-red-300' :
                  action.severity === 'high' ? 'border-orange-200 hover:border-orange-300' :
                  action.severity === 'medium' ? 'border-yellow-200 hover:border-yellow-300' :
                  'border-blue-200 hover:border-blue-300'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getSeverityColor(action.severity)}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{action.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                      <p className="text-xs text-gray-500 mt-2">Impact: {action.estimatedImpact}</p>
                      <button
                        onClick={() => executeEmergencyAction(action)}
                        disabled={loading}
                        className={`mt-3 w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white ${
                          action.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                          action.severity === 'high' ? 'bg-orange-600 hover:bg-orange-700' :
                          action.severity === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700' :
                          'bg-blue-600 hover:bg-blue-700'
                        } disabled:opacity-50`}
                      >
                        {loading ? 'Executing...' : `Execute ${action.requiresConfirmation ? '(Confirm)' : ''}`}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Emergency Broadcast */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Megaphone className="h-5 w-5 mr-2 text-blue-500" />
            Emergency Broadcast System
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Broadcast Message
              </label>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={3}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter emergency message to broadcast to all staff and systems..."
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Message will be sent to all staff via Telegram, email, and in-app notifications
              </div>
              <button
                onClick={() => executeEmergencyAction(emergencyActions.find(a => a.type === 'broadcast')!)}
                disabled={!broadcastMessage.trim() || loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Emergency Broadcast
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Incidents */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Incidents</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {incidents.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Incidents</h3>
              <p className="mt-1 text-sm text-gray-500">All systems operating normally</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <div key={incident.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getSeverityColor(incident.severity)}`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{incident.type}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          incident.status === 'active' ? 'text-red-600 bg-red-100' :
                          incident.status === 'investigating' ? 'text-yellow-600 bg-yellow-100' :
                          'text-green-600 bg-green-100'
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {incident.location}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(incident.reportedAt).toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          ~{incident.estimatedAffected} affected
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Reported by: {incident.reportedBy}</span>
                        {incident.responders.length > 0 && (
                          <span className="text-xs text-gray-500 ml-4">
                            Responders: {incident.responders.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="inline-flex items-center px-2 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100">
                      <Eye className="h-3 w-3 mr-1" />
                      View Details
                    </button>
                    {incident.status === 'active' && (
                      <button className="inline-flex items-center px-2 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                Confirm Emergency Action
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{showConfirmDialog.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{showConfirmDialog.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${getSeverityColor(showConfirmDialog.severity)}`}>
                  <p className="text-sm font-medium">Impact: {showConfirmDialog.estimatedImpact}</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ This action cannot be undone. Please confirm you want to proceed.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmEmergencyAction}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  showConfirmDialog.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyPage;
