import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Ban, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Users,
  Activity,
  Filter,
  Download,
  RefreshCw,
  Search,
  MapPin,
  Zap
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface FraudAlert {
  id: string;
  type: 'duplicate_scan' | 'velocity_anomaly' | 'location_impossible' | 'pattern_suspicious' | 'time_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  wristband_id: string;
  event_id: string;
  event_name: string;
  description: string;
  detected_at: string;
  investigated_at?: string | null;
  status: 'pending' | 'investigating' | 'resolved' | 'false_positive';
  staff_member?: string;
  location?: string;
  confidence_score: number;
  related_scans: number;
}

interface FraudMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  resolvedToday: number;
  falsePositiveRate: number;
  averageResponseTime: number;
  blockedWristbands: number;
  suspiciousPatterns: number;
  aiAccuracy: number;
}

// Helper function to calculate false positive rate
const calculateFalsePositiveRate = (alerts: FraudAlert[]): number => {
  const investigatedAlerts = alerts.filter(a =>
    a.status === 'resolved' || a.status === 'false_positive'
  );

  if (investigatedAlerts.length === 0) return 0;

  const falsePositiveCount = alerts.filter(a => a.status === 'false_positive').length;
  return (falsePositiveCount / investigatedAlerts.length) * 100;
};

// Helper function to calculate average response time in minutes
const calculateAverageResponseTime = (alerts: FraudAlert[]): number => {
  const resolvedAlerts = alerts.filter(a =>
    a.investigated_at && a.detected_at
  );

  if (resolvedAlerts.length === 0) return 0;

  const totalMinutes = resolvedAlerts.reduce((sum, alert) => {
    if (!alert.investigated_at || !alert.detected_at) return sum;

    const detectedTime = new Date(alert.detected_at).getTime();
    const resolvedTime = new Date(alert.investigated_at).getTime();
    const differenceInMinutes = (resolvedTime - detectedTime) / (1000 * 60);

    return sum + differenceInMinutes;
  }, 0);

  return totalMinutes / resolvedAlerts.length;
};

// Helper function to calculate AI accuracy (resolved correctly vs total investigated)
const calculateAIAccuracy = (alerts: FraudAlert[]): number => {
  const investigatedAlerts = alerts.filter(a =>
    a.status === 'resolved' || a.status === 'false_positive'
  );

  if (investigatedAlerts.length === 0) return 0;

  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;
  return (resolvedCount / investigatedAlerts.length) * 100;
};

const FraudDetectionPage: React.FC = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [metrics, setMetrics] = useState<FraudMetrics>({
    totalAlerts: 0,
    criticalAlerts: 0,
    resolvedToday: 0,
    falsePositiveRate: 0,
    averageResponseTime: 0,
    blockedWristbands: 0,
    suspiciousPatterns: 0,
    aiAccuracy: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFraudData();
    const interval = setInterval(fetchFraudData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchFraudData = async () => {
    try {
      // Fetch fraud detections from database
      const { data: detectionsData, error: detectionsError } = await supabase
        .from('fraud_detections')
        .select(`
          id,
          detection_type,
          severity,
          details,
          created_at,
          investigated_at,
          investigated_by,
          wristband_id,
          event_id,
          event:events(id, name),
          wristband:wristbands(id, nfc_id)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (detectionsError) throw detectionsError;

      // Transform database data to match alert interface
      const transformedAlerts: FraudAlert[] = (detectionsData || []).map((detection: any) => ({
        id: detection.id,
        type: detection.detection_type,
        severity: detection.severity,
        wristband_id: detection.wristband?.nfc_id || 'Unknown',
        event_id: detection.event_id,
        event_name: detection.event?.name || 'Unknown Event',
        description: detection.details?.description || 'Fraud pattern detected',
        detected_at: detection.created_at,
        investigated_at: detection.investigated_at,
        status: detection.status || (detection.investigated_at ? 'resolved' : 'pending'),
        location: detection.details?.location || '',
        confidence_score: detection.details?.confidence_score || 0.75,
        related_scans: detection.details?.related_scans || 1,
        staff_member: detection.investigated_by
      }));

      setAlerts(transformedAlerts);

      // Calculate metrics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const resolvedToday = transformedAlerts.filter(a => {
        if (!a.investigated_at) return false;
        return a.status === 'resolved' && new Date(a.investigated_at) >= today;
      }).length;

      const { data: blockedData } = await supabase
        .from('wristband_blocks')
        .select('id')
        .is('unblocked_at', null);

      setMetrics({
        totalAlerts: transformedAlerts.length,
        criticalAlerts: transformedAlerts.filter(a => a.severity === 'critical').length,
        resolvedToday,
        falsePositiveRate: calculateFalsePositiveRate(transformedAlerts),
        averageResponseTime: calculateAverageResponseTime(transformedAlerts),
        blockedWristbands: blockedData?.length || 0,
        suspiciousPatterns: transformedAlerts.filter(a => a.type === 'pattern_suspicious').length,
        aiAccuracy: calculateAIAccuracy(transformedAlerts)
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching fraud data:', error);
      setLoading(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: 'investigate' | 'resolve' | 'false_positive' | 'block') => {
    try {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data || !data.user) {
        console.error('Authentication error:', authError);
        // Handle unauthenticated state - could redirect to login or show error
        alert('You must be logged in to perform this action. Please log in and try again.');
        return;
      }

      const user = data.user;

      if (action === 'resolve' || action === 'false_positive') {
        const { error } = await supabase
          .from('fraud_detections')
          .update({
            investigated_at: new Date().toISOString(),
            investigated_by: user.id
          })
          .eq('id', alertId);

        if (error) throw error;
      }

      if (action === 'block') {
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
          const { data: wristband } = await supabase
            .from('wristbands')
            .select('id')
            .eq('nfc_id', alert.wristband_id)
            .single();

          if (wristband) {
            const { error: blockError } = await supabase
              .from('wristband_blocks')
              .insert({
                wristband_id: wristband.id,
                event_id: alert.event_id,
                reason: alert.description,
                blocked_by: user.id
              });

            if (blockError) throw blockError;
          }
        }
      }

      // Optimistically update UI
      setAlerts(alerts.map(alert =>
        alert.id === alertId
          ? {
              ...alert,
              status: action === 'investigate' ? 'investigating' :
                     action === 'resolve' ? 'resolved' :
                     action === 'false_positive' ? 'false_positive' :
                     action === 'block' ? 'resolved' : alert.status,
              staff_member: user.email || 'Current User'
            }
          : alert
      ));

      // Refresh data
      await fetchFraudData();
    } catch (error) {
      console.error('Error updating alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-red-600 bg-red-100';
      case 'investigating': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'false_positive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'duplicate_scan': return Users;
      case 'velocity_anomaly': return Zap;
      case 'location_impossible': return MapPin;
      case 'pattern_suspicious': return Activity;
      case 'time_anomaly': return Clock;
      default: return AlertTriangle;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      alert.wristband_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSeverity && matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="h-6 w-6 mr-2 text-red-500" />
            Fraud Detection Center
          </h1>
          <p className="text-gray-600">AI-powered fraud monitoring and prevention system</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center text-sm text-green-600">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            AI Monitoring Active
          </div>
          <button
            onClick={fetchFraudData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-l-red-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Alerts</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.totalAlerts}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-l-orange-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Critical Alerts</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.criticalAlerts}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-l-green-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Resolved Today</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.resolvedToday}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-l-blue-500">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">AI Accuracy</dt>
                  <dd className="text-lg font-medium text-gray-900">{metrics.aiAccuracy.toFixed(1)}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{metrics.falsePositiveRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">False Positive Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{metrics.averageResponseTime.toFixed(1)}min</div>
            <div className="text-sm text-gray-500">Avg Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{metrics.blockedWristbands}</div>
            <div className="text-sm text-gray-500">Blocked Wristbands</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{metrics.suspiciousPatterns}</div>
            <div className="text-sm text-gray-500">Suspicious Patterns</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </button>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Fraud Alerts ({filteredAlerts.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredAlerts.map((alert) => {
            const IconComponent = getTypeIcon(alert.type);
            return (
              <div key={alert.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getSeverityColor(alert.severity)}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {alert.type.replace('_', ' ').toUpperCase()}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                          {alert.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Wristband: {alert.wristband_id}</span>
                        <span>Event: {alert.event_name}</span>
                        <span>Confidence: {(alert.confidence_score * 100).toFixed(1)}%</span>
                        <span>Related Scans: {alert.related_scans}</span>
                        {alert.location && <span>Location: {alert.location}</span>}
                      </div>
                      <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>Detected: {new Date(alert.detected_at).toLocaleString()}</span>
                        {alert.staff_member && (
                          <>
                            <span>•</span>
                            <span>Assigned to: {alert.staff_member}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {alert.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'investigate')}
                          className="inline-flex items-center px-2 py-1 border border-yellow-300 text-xs font-medium rounded text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Investigate
                        </button>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'false_positive')}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          False Positive
                        </button>
                      </>
                    )}
                    {alert.status === 'investigating' && (
                      <>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'resolve')}
                          className="inline-flex items-center px-2 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </button>
                        <button
                          onClick={() => handleAlertAction(alert.id, 'block')}
                          className="inline-flex items-center px-2 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Block
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedAlert(alert)}
                      className="inline-flex items-center px-2 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Alert ID</label>
                  <p className="text-sm text-gray-900">{selectedAlert.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900">{selectedAlert.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Severity</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedAlert.severity)}`}>
                    {selectedAlert.severity}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedAlert.status)}`}>
                    {selectedAlert.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Wristband ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedAlert.wristband_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event</label>
                  <p className="text-sm text-gray-900">{selectedAlert.event_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confidence Score</label>
                  <p className="text-sm text-gray-900">{(selectedAlert.confidence_score * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Related Scans</label>
                  <p className="text-sm text-gray-900">{selectedAlert.related_scans}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900 mt-1">{selectedAlert.description}</p>
              </div>
              {selectedAlert.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedAlert.location}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Detected At</label>
                <p className="text-sm text-gray-900 mt-1">{new Date(selectedAlert.detected_at).toLocaleString()}</p>
              </div>
              {selectedAlert.staff_member && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned Staff</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedAlert.staff_member}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
              <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                Take Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FraudDetectionPage;
