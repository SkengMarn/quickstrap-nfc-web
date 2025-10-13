import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { 
  Brain, 
  Activity, 
  Zap, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  Target,
  Cpu,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { 
  AutoGateView, 
  AutoMergeEvent, 
  SystemHealthAuto, 
  AutoEvent,
  AutonomousPerformance,
  PredictiveInsight,
  AutonomousService
} from '../services/autonomousService';
import GateIntelligence from '../components/GateIntelligence';
import AIDecisionExplainer from '../components/AIDecisionExplainer';
import { autonomousService } from '../services/autonomousService';

const AutonomousOperations: React.FC = () => {
  const [liveEvents, setLiveEvents] = useState<AutoEvent[]>([]);
  const [selectedGate, setSelectedGate] = useState<AutoGateView | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AutoEvent | null>(null);
  const [autoGates, setAutoGates] = useState<AutoGateView[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthAuto | null>(null);
  const [performance, setPerformance] = useState<AutonomousPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data from autonomous service
  useEffect(() => {
    const loadData = async () => {
      try {
        const service = AutonomousService.getInstance();
        const [gates, health, perf] = await Promise.all([
          service.fetchAutoGates(),
          service.fetchSystemHealth(),
          service.fetchPerformanceMetrics()
        ]);
        setAutoGates(gates);
        setSystemHealth(health);
        setPerformance(perf);
      } catch (error) {
        console.error('Error loading autonomous data:', error);
        // Fallback to mock data
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Simulate live AI events using the service
  useEffect(() => {
    const interval = setInterval(async () => {
      const service = AutonomousService.getInstance();
      const newEvent = await service.generateLiveEvent();
      setLiveEvents(prev => [newEvent, ...prev.slice(0, 9)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'learning': return 'text-yellow-600 bg-yellow-100';
      case 'auto-archived': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Show loading state while data is being fetched
  if (loading || !systemHealth || !performance) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Autonomous Operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Brain className="w-8 h-8 mr-3 text-purple-600" />
              Autonomous Operations Center
            </h1>
            <p className="text-gray-600">AI-driven gate intelligence and self-healing system monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-600">AI Active</span>
            </div>
            <div className="text-sm text-gray-500">
              {performance.decisionsPerHour} decisions/hour
            </div>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Auto-Healing Rate</p>
                  <p className="text-2xl font-bold text-green-600">{systemHealth.autoHealingRate}%</p>
                </div>
                <Zap className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Accuracy</p>
                  <p className="text-2xl font-bold text-blue-600">{performance.accuracyRate}%</p>
                </div>
                <Target className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Gates</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {autoGates.filter(g => g.status === 'active').length}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Learning Gates</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {autoGates.filter(g => g.status === 'learning').length}
                  </p>
                </div>
                <Brain className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live AI Decision Stream */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-600" />
                Live AI Decision Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {liveEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {event.details.action}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {event.details.reasoning}
                      </p>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className={`text-xs font-medium ${getConfidenceColor(event.confidence)}`}>
                          {(event.confidence * 100).toFixed(1)}% confidence
                        </span>
                        <span className="text-xs text-gray-500">
                          Impact: {event.details.impact}
                        </span>
                        <span className="text-xs text-blue-600 hover:text-blue-800">
                          Click to analyze →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gate Intelligence Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-purple-600" />
                Gate Intelligence Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {autoGates.map((gate) => (
                  <div 
                    key={gate.id} 
                    className="p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedGate(gate)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{gate.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(gate.status)}`}>
                            {gate.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>{gate.performance_metrics.total_processed} processed</span>
                          <span className={getConfidenceColor(gate.confidence_score)}>
                            {(gate.confidence_score * 100).toFixed(1)}% confidence
                          </span>
                          <span>{gate.status}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          Created {new Date(gate.created_at).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-blue-600">
                          {gate.decisions_today} decisions today
                        </div>
                      </div>
                    </div>
                    
                    {/* Confidence Evolution Mini Chart */}
                    <div className="mt-3">
                      <div className="flex items-center space-x-1">
                        {gate.confidence_history.map((conf: number, idx: number) => (
                          <div 
                            key={idx}
                            className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden"
                          >
                            <div 
                              className={`h-full transition-all duration-300 ${
                                conf >= 0.8 ? 'bg-green-500' : 
                                conf >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${conf * 100}%` }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Confidence Evolution</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Self-Healing Activity & Predictive Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Self-Healing Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                Self-Healing Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {systemHealth.issuesAutoResolved}
                    </div>
                    <div className="text-sm text-gray-600">Issues Auto-Resolved</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {systemHealth.selfRecoveryCount}
                    </div>
                    <div className="text-sm text-gray-600">Self-Recovery Count</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Auto-Merge Completed</p>
                        <p className="text-sm text-gray-600">
                          System automatically merged duplicate gates based on proximity analysis
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  {/* More merge events would be loaded from service */}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predictive Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                Predictive Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">Capacity Warning</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Main entrance expected to reach 85% capacity in 45 minutes
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          Open additional gates
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          Deploy staff to manage flow
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-medium text-yellow-600">91% confidence</div>
                      <div className="text-xs text-gray-500">Medium impact</div>
                    </div>
                  </div>
                </div>
                {/* More predictions would be loaded from service */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Autonomous Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{performance.decisionsPerHour}</div>
                <div className="text-sm text-gray-600">Decisions/Hour</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{performance.accuracyRate}%</div>
                <div className="text-sm text-gray-600">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{performance.falsePositiveRate}%</div>
                <div className="text-sm text-gray-600">False Positive Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{performance.autoCorrections}</div>
                <div className="text-sm text-gray-600">Auto-Corrections</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{(performance.learningVelocity * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-600">Learning Velocity</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Components - Temporarily disabled until components are updated */}
      {/* 
      {selectedGate && (
        <GateIntelligence 
          gate={selectedGate} 
          onClose={() => setSelectedGate(null)} 
        />
      )}

      {selectedEvent && (
        <AIDecisionExplainer 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
      */}

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500 italic">
          "Faith by itself, if it does not have works, is dead." - James 2:17
        </p>
      </footer>
    </div>
  );
};

export default AutonomousOperations;
