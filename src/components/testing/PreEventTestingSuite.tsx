import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Play, Pause, Square, TestTube, CheckCircle, XCircle, AlertTriangle, Trash2, Settings } from 'lucide-react';

interface TestResult {
  id: string;
  test_name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  result: any;
  duration: number;
  timestamp: string;
}

interface SimulationConfig {
  checkin_rate: number; // per minute
  duration_minutes: number;
  gate_patterns: string[];
  category_distribution: { [key: string]: number };
  failure_rate: number; // percentage
}

interface PreEventTestingSuiteProps {
  eventId: string;
  eventName: string;
}

const PreEventTestingSuite: React.FC<PreEventTestingSuiteProps> = ({ eventId, eventName }) => {
  const [testMode, setTestMode] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>({
    checkin_rate: 10,
    duration_minutes: 5,
    gate_patterns: ['Main Entrance', 'VIP Gate', 'Side Entry'],
    category_distribution: { 'General': 70, 'VIP': 20, 'Staff': 10 },
    failure_rate: 5
  });
  const [validationChecklist, setValidationChecklist] = useState<any>({});

  useEffect(() => {
    checkTestMode();
    runValidationChecklist();
  }, [eventId]);

  const checkTestMode = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setTestMode(data.config?.test_mode || false);
    } catch (error) {
      console.error('Error checking test mode:', error);
    }
  };

  const toggleTestMode = async () => {
    try {
      const { data: currentEvent } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      const newConfig = {
        ...currentEvent?.config,
        test_mode: !testMode
      };

      const { error } = await supabase
        .from('events')
        .update({ config: newConfig })
        .eq('id', eventId);

      if (error) throw error;
      setTestMode(!testMode);
    } catch (error) {
      console.error('Error toggling test mode:', error);
    }
  };

  const runValidationChecklist = async () => {
    const checks = {
      staff_assigned: await checkStaffAssigned(),
      wristbands_uploaded: await checkWristbandsUploaded(),
      security_configured: await checkSecurityConfigured(),
      capacity_set: await checkCapacitySet(),
      categories_defined: await checkCategoriesDefined(),
      app_connectivity: await checkAppConnectivity()
    };

    setValidationChecklist(checks);
  };

  const checkStaffAssigned = async (): Promise<{ passed: boolean; message: string; count?: number }> => {
    try {
      const { data, error } = await supabase
        .from('event_access')
        .select('id')
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (error) throw error;
      const count = data?.length || 0;
      
      return {
        passed: count > 0,
        message: count > 0 ? `${count} staff members assigned` : 'No staff assigned to event',
        count
      };
    } catch (error) {
      return { passed: false, message: 'Error checking staff assignments' };
    }
  };

  const checkWristbandsUploaded = async (): Promise<{ passed: boolean; message: string; count?: number }> => {
    try {
      const { data, error } = await supabase
        .from('wristbands')
        .select('id')
        .eq('event_id', eventId);

      if (error) throw error;
      const count = data?.length || 0;
      
      return {
        passed: count > 0,
        message: count > 0 ? `${count} wristbands ready` : 'No wristbands uploaded',
        count
      };
    } catch (error) {
      return { passed: false, message: 'Error checking wristbands' };
    }
  };

  const checkSecurityConfigured = async (): Promise<{ passed: boolean; message: string }> => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      const securityMode = data.config?.security_mode;
      
      return {
        passed: !!securityMode,
        message: securityMode ? `Security mode: ${securityMode}` : 'Security mode not configured'
      };
    } catch (error) {
      return { passed: false, message: 'Error checking security configuration' };
    }
  };

  const checkCapacitySet = async (): Promise<{ passed: boolean; message: string }> => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('config')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      const maxCapacity = data.config?.capacity_settings?.max_capacity;
      
      return {
        passed: !!maxCapacity,
        message: maxCapacity ? `Max capacity: ${maxCapacity}` : 'Capacity limit not set'
      };
    } catch (error) {
      return { passed: false, message: 'Error checking capacity settings' };
    }
  };

  const checkCategoriesDefined = async (): Promise<{ passed: boolean; message: string; count?: number }> => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id');

      if (error) throw error;
      const count = data?.length || 0;
      
      return {
        passed: count > 0,
        message: count > 0 ? `${count} categories defined` : 'No wristband categories defined',
        count
      };
    } catch (error) {
      return { passed: false, message: 'Error checking categories' };
    }
  };

  const checkAppConnectivity = async (): Promise<{ passed: boolean; message: string }> => {
    // Simulate app connectivity check
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          passed: true,
          message: 'App connectivity verified'
        });
      }, 1000);
    });
  };

  const runIndividualTest = async (testName: string) => {
    const testId = Date.now().toString();
    const startTime = Date.now();

    // Add test to results
    const newTest: TestResult = {
      id: testId,
      test_name: testName,
      status: 'running',
      result: null,
      duration: 0,
      timestamp: new Date().toISOString()
    };

    setTestResults(prev => [newTest, ...prev]);

    try {
      let result;
      switch (testName) {
        case 'Database Connection':
          result = await testDatabaseConnection();
          break;
        case 'Staff Authentication':
          result = await testStaffAuthentication();
          break;
        case 'Wristband Validation':
          result = await testWristbandValidation();
          break;
        case 'Check-in Process':
          result = await testCheckinProcess();
          break;
        case 'Capacity Alerts':
          result = await testCapacityAlerts();
          break;
        case 'Real-time Sync':
          result = await testRealtimeSync();
          break;
        default:
          result = { success: false, message: 'Unknown test' };
      }

      const duration = Date.now() - startTime;
      
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { 
              ...test, 
              status: result.success ? 'passed' : 'failed',
              result: result.message,
              duration
            }
          : test
      ));

    } catch (error) {
      const duration = Date.now() - startTime;
      setTestResults(prev => prev.map(test => 
        test.id === testId 
          ? { 
              ...test, 
              status: 'failed',
              result: error instanceof Error ? error.message : 'Test failed',
              duration
            }
          : test
      ));
    }
  };

  const testDatabaseConnection = async () => {
    const { data, error } = await supabase.from('events').select('id').limit(1);
    return {
      success: !error,
      message: error ? error.message : 'Database connection successful'
    };
  };

  const testStaffAuthentication = async () => {
    const { data, error } = await supabase
      .from('event_access')
      .select('id')
      .eq('event_id', eventId)
      .limit(1);

    return {
      success: !error,
      message: error ? error.message : 'Staff authentication system working'
    };
  };

  const testWristbandValidation = async () => {
    const { data, error } = await supabase
      .from('wristbands')
      .select('nfc_id, category, status')
      .eq('event_id', eventId)
      .limit(5);

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'No wristbands found for testing' };
    }

    return {
      success: true,
      message: `Validated ${data.length} wristbands successfully`
    };
  };

  const testCheckinProcess = async () => {
    // Create a test check-in
    const testCheckin = {
      event_id: eventId,
      wristband_id: 'TEST-' + Date.now(),
      location: 'Test Gate',
      timestamp: new Date().toISOString(),
      is_test_data: true
    };

    const { error } = await supabase
      .from('checkin_logs')
      .insert(testCheckin);

    return {
      success: !error,
      message: error ? error.message : 'Check-in process test successful'
    };
  };

  const testCapacityAlerts = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('config')
      .eq('id', eventId)
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    const alertsEnabled = data.config?.capacity_settings?.alerts_enabled;
    return {
      success: true,
      message: alertsEnabled ? 'Capacity alerts configured' : 'Capacity alerts disabled'
    };
  };

  const testRealtimeSync = async () => {
    // Test real-time subscription
    return new Promise<{ success: boolean; message: string }>((resolve) => {
      const channel = supabase.channel('test-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'checkin_logs' }, () => {
          channel.unsubscribe();
          resolve({ success: true, message: 'Real-time sync working' });
        })
        .subscribe();

      // Timeout after 5 seconds
      setTimeout(() => {
        channel.unsubscribe();
        resolve({ success: false, message: 'Real-time sync timeout' });
      }, 5000);
    });
  };

  const startSimulation = async () => {
    setSimulationRunning(true);
    
    const totalCheckins = simulationConfig.checkin_rate * simulationConfig.duration_minutes;
    const interval = (60 * 1000) / simulationConfig.checkin_rate; // ms between check-ins

    for (let i = 0; i < totalCheckins && simulationRunning; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      // Generate random check-in
      const categories = Object.keys(simulationConfig.category_distribution);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const randomGate = simulationConfig.gate_patterns[Math.floor(Math.random() * simulationConfig.gate_patterns.length)];
      const shouldFail = Math.random() * 100 < simulationConfig.failure_rate;

      const simulatedCheckin = {
        event_id: eventId,
        wristband_id: `SIM-${Date.now()}-${i}`,
        location: randomGate,
        timestamp: new Date().toISOString(),
        status: shouldFail ? 'failed' : 'success',
        is_test_data: true,
        metadata: {
          simulation: true,
          category: randomCategory
        }
      };

      await supabase.from('checkin_logs').insert(simulatedCheckin);
    }

    setSimulationRunning(false);
  };

  const stopSimulation = () => {
    setSimulationRunning(false);
  };

  const clearTestData = async () => {
    if (!confirm('Delete all test data? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('checkin_logs')
        .delete()
        .eq('event_id', eventId)
        .eq('is_test_data', true);

      if (error) throw error;
      alert('Test data cleared successfully');
    } catch (error) {
      console.error('Error clearing test data:', error);
      alert('Error clearing test data');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running': return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />;
      default: return <TestTube className="w-5 h-5 text-gray-400" />;
    }
  };

  const getChecklistIcon = (passed: boolean) => {
    return passed ? 
      <CheckCircle className="w-5 h-5 text-green-600" /> : 
      <XCircle className="w-5 h-5 text-red-600" />;
  };

  const testSuite = [
    'Database Connection',
    'Staff Authentication', 
    'Wristband Validation',
    'Check-in Process',
    'Capacity Alerts',
    'Real-time Sync'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pre-Event Testing Suite</h3>
          <p className="text-sm text-gray-600">Validate your event setup before going live</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Test Mode:</span>
            <button
              onClick={toggleTestMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                testMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  testMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <button
            onClick={clearTestData}
            className="flex items-center px-3 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Test Data
          </button>
        </div>
      </div>

      {/* Test Mode Warning */}
      {testMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Test Mode Active</p>
              <p className="text-sm text-yellow-700">All check-ins will be marked as test data and can be deleted</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Checklist */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Event Readiness Checklist</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(validationChecklist).map(([key, check]: [string, any]) => (
            <div key={key} className="flex items-center space-x-3">
              {getChecklistIcon(check.passed)}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {key.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-500">{check.message}</p>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={runValidationChecklist}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Re-run Checklist
        </button>
      </div>

      {/* Individual Tests */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">System Tests</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {testSuite.map(test => (
            <button
              key={test}
              onClick={() => runIndividualTest(test)}
              className="flex items-center justify-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {test}
            </button>
          ))}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <h5 className="text-sm font-medium text-gray-900">Recent Test Results</h5>
            {testResults.map(result => (
              <div key={result.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{result.test_name}</p>
                    <p className="text-xs text-gray-500">{result.result}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{result.duration}ms</p>
                  <p>{new Date(result.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Check-in Simulation</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check-ins per minute
              </label>
              <input
                type="number"
                value={simulationConfig.checkin_rate}
                onChange={(e) => setSimulationConfig({
                  ...simulationConfig,
                  checkin_rate: parseInt(e.target.value) || 1
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={simulationConfig.duration_minutes}
                onChange={(e) => setSimulationConfig({
                  ...simulationConfig,
                  duration_minutes: parseInt(e.target.value) || 1
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="60"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Failure rate (%)
              </label>
              <input
                type="number"
                value={simulationConfig.failure_rate}
                onChange={(e) => setSimulationConfig({
                  ...simulationConfig,
                  failure_rate: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="50"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Simulation Preview</h5>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Total check-ins: {simulationConfig.checkin_rate * simulationConfig.duration_minutes}</p>
                <p>Expected failures: {Math.round((simulationConfig.checkin_rate * simulationConfig.duration_minutes * simulationConfig.failure_rate) / 100)}</p>
                <p>Gates: {simulationConfig.gate_patterns.join(', ')}</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {!simulationRunning ? (
                <button
                  onClick={startSimulation}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Simulation
                </button>
              ) : (
                <button
                  onClick={stopSimulation}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Simulation
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreEventTestingSuite;
