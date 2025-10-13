import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { AlertTriangle, Shield, Ban, Eye, Clock, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface FraudAlert {
  id: string;
  wristband_id: string;
  alert_type: 'multiple_checkins' | 'impossible_location' | 'blocked_attempt' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  resolved: boolean;
  data: any;
}

interface WristbandDetails {
  id: string;
  nfc_id: string;
  category: string;
  status: 'active' | 'blocked' | 'inactive';
  checkin_history: any[];
  fraud_flags: FraudAlert[];
  notes: string[];
}

interface FraudDetectionSystemProps {
  eventId: string;
}

const FraudDetectionSystem: React.FC<FraudDetectionSystemProps> = ({ eventId }) => {
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [selectedWristband, setSelectedWristband] = useState<WristbandDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFraudAlerts();
    const subscription = setupRealtimeMonitoring();
    return () => {
      subscription?.unsubscribe();
    };
  }, [eventId]);

  const fetchFraudAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fraud_detections')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const alerts: FraudAlert[] = (data || []).map((item: any) => ({
        id: item.id,
        wristband_id: item.wristband_id || '',
        alert_type: item.detection_type,
        severity: item.severity,
        description: item.details?.description || 'Fraud detected',
        timestamp: item.created_at,
        resolved: !!item.investigated_at,
        data: item.details,
      }));

      setFraudAlerts(alerts);
    } catch (error) {
      console.error('Error fetching fraud alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeMonitoring = () => {
    const channel = supabase
      .channel(`fraud_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fraud_detections',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const newAlert: FraudAlert = {
            id: payload.new.id,
            wristband_id: payload.new.wristband_id || '',
            alert_type: payload.new.detection_type,
            severity: payload.new.severity,
            description: payload.new.details?.description || 'Fraud detected',
            timestamp: payload.new.created_at,
            resolved: false,
            data: payload.new.details,
          };
          setFraudAlerts((prev) => [newAlert, ...prev]);
        }
      )
      .subscribe();

    return channel;
  };

  const blockWristband = async (wristbandId: string, reason: string) => {
    try {
      const { error } = await supabase.from('wristband_blocks').insert({
        wristband_id: wristbandId,
        event_id: eventId,
        reason,
        blocked_at: new Date().toISOString(),
      });

      if (error) throw error;

      alert('Wristband blocked successfully');
      fetchFraudAlerts();
    } catch (error) {
      console.error('Error blocking wristband:', error);
      alert('Failed to block wristband');
    }
  };

  const investigateAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('fraud_detections')
        .update({
          investigated_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      setFraudAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      );
    } catch (error) {
      console.error('Error investigating alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const filteredAlerts = fraudAlerts.filter((alert) => {
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesSearch =
      searchTerm === '' ||
      alert.wristband_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fraud detection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-red-600" />
            Fraud Detection System
          </h2>
          <p className="text-gray-600">Monitor and prevent fraudulent activity</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search wristband ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded-md"
          />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{fraudAlerts.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-3xl font-bold text-red-600">
                  {fraudAlerts.filter((a) => a.severity === 'critical').length}
                </p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-3xl font-bold text-green-600">
                  {fraudAlerts.filter((a) => a.resolved).length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-orange-600">
                  {fraudAlerts.filter((a) => !a.resolved).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Fraud Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No fraud alerts found</p>
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <h4 className="font-medium">{alert.description}</h4>
                        {alert.resolved && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Resolved
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center text-gray-700">
                          <MapPin className="w-3 h-3 mr-1" />
                          Wristband ID: {alert.wristband_id}
                        </div>
                        <div className="flex items-center text-gray-700">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                          Type: {alert.alert_type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {!alert.resolved && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => investigateAlert(alert.id)}
                          >
                            Mark Resolved
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              blockWristband(alert.wristband_id, alert.description)
                            }
                          >
                            Block Wristband
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FraudDetectionSystem;
