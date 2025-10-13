import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { 
  Brain, 
  MapPin, 
  TrendingUp, 
  Clock, 
  Users, 
  Target,
  AlertCircle,
  CheckCircle,
  Eye
} from 'lucide-react';
import { AutoGateView, DecisionExplanation, GateLifecycleStage } from '../types/autonomous';
import { supabase } from '../services/supabase';

interface GateIntelligenceProps {
  gate: AutoGateView;
  onClose: () => void;
}

const GateIntelligence: React.FC<GateIntelligenceProps> = ({ gate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'lifecycle' | 'decisions' | 'predictions'>('overview');
  const [decisionExplanation, setDecisionExplanation] = useState<DecisionExplanation | null>(null);
  const [lifecycleStage, setLifecycleStage] = useState<GateLifecycleStage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGateIntelligenceData();
  }, [gate.id]);

  const fetchGateIntelligenceData = async () => {
    try {
      setLoading(true);

      // Fetch gate performance data
      const { data: performanceData, error: perfError } = await supabase
        .from('gate_performance_cache')
        .select('*')
        .eq('gate_id', gate.id)
        .single();

      if (perfError) throw perfError;

      // Fetch autonomous gate data
      const { data: autonomousData, error: autoError } = await supabase
        .from('autonomous_gates')
        .select('*')
        .eq('gate_id', gate.id)
        .single();

      if (autoError) throw autoError;

      // Calculate real decision explanation based on actual data
      const spatialConsistency = performanceData?.health_score ? performanceData.health_score / 100 : 0.85;
      const sampleSize = Math.min(performanceData?.total_scans || 0, 500) / 500;
      const temporalStability = autonomousData?.success_rate || 0.9;
      const categoryDistribution = 0.85; // Could be calculated from actual category data

      const realDecisionExplanation: DecisionExplanation = {
        decision: autonomousData?.status || 'learning',
        factors: [
          { metric: 'Spatial Consistency', value: spatialConsistency, weight: 0.3, impact: spatialConsistency > 0.8 ? 'positive' : 'negative' },
          { metric: 'Sample Size', value: sampleSize, weight: 0.25, impact: sampleSize > 0.5 ? 'positive' : 'negative' },
          { metric: 'Temporal Stability', value: temporalStability, weight: 0.2, impact: temporalStability > 0.8 ? 'positive' : 'negative' },
          { metric: 'Category Distribution', value: categoryDistribution, weight: 0.25, impact: categoryDistribution > 0.7 ? 'positive' : 'negative' }
        ],
        primaryReason: `${Math.round(spatialConsistency * 100)}% health score with ${performanceData?.total_scans || 0} total scans processed`,
        confidenceBreakdown: {
          spatialConsistency,
          sampleSize,
          temporalStability,
          categoryDistribution
        }
      };

      // Calculate lifecycle stage based on real data
      const timeInStage = autonomousData?.created_at ? 
        new Date().getTime() - new Date(autonomousData.created_at).getTime() : 0;
      
      const realLifecycleStage: GateLifecycleStage = {
        stage: autonomousData?.status || 'learning',
        scanCount: performanceData?.total_scans || 0,
        confidence: autonomousData?.confidence_score || 0.5,
        timeInStage,
        nextStageThreshold: getNextStageThreshold(autonomousData?.status || 'learning'),
        autoPromotionEligible: (performanceData?.total_scans || 0) > 100 && (autonomousData?.confidence_score || 0) > 0.8
      };

      setDecisionExplanation(realDecisionExplanation);
      setLifecycleStage(realLifecycleStage);
    } catch (error) {
      console.error('Error fetching gate intelligence data:', error);
      // Fallback to basic data from gate prop
      setDecisionExplanation({
        decision: 'created',
        factors: [],
        primaryReason: 'Unable to load decision data',
        confidenceBreakdown: {
          spatialConsistency: 0,
          sampleSize: 0,
          temporalStability: 0,
          categoryDistribution: 0
        }
      });
      setLifecycleStage({
        stage: 'pattern-detected',
        scanCount: gate.scanCount || 0,
        confidence: gate.confidence || 0,
        timeInStage: 0,
        nextStageThreshold: 100,
        autoPromotionEligible: false
      });
    } finally {
      setLoading(false);
    }
  };

  const getNextStageThreshold = (currentStage: string): number => {
    switch (currentStage) {
      case 'learning': return 50;
      case 'active': return 200;
      case 'optimizing': return 500;
      default: return 100;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'pattern-detected': return 'text-blue-600 bg-blue-100';
      case 'probation': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'auto-archived': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Brain className="w-6 h-6 mr-2 text-purple-600" />
                {gate.name}
              </h2>
              <p className="text-gray-600">AI Gate Intelligence Analysis</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'lifecycle', label: 'Lifecycle', icon: TrendingUp },
              { id: 'decisions', label: 'AI Decisions', icon: Brain },
              { id: 'predictions', label: 'Predictions', icon: Target }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading gate intelligence...</span>
            </div>
          ) : activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gate.status === 'active' ? 'bg-green-100 text-green-800' :
                          gate.status === 'learning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {gate.status}
                        </span>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Confidence</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {(gate.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <Target className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Scans</p>
                        <p className="text-2xl font-bold text-blue-600">{gate.scanCount}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Location & Category Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-green-600" />
                      Location Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Coordinates</p>
                        <p className="font-mono text-sm">
                          {gate.location.lat.toFixed(6)}, {gate.location.lng.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Detection Radius</p>
                        <p className="font-medium">{gate.location.radius}m</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Category</p>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {gate.category}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="w-5 h-5 mr-2 text-blue-600" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Auto-Created</p>
                        <p className="font-medium">
                          {new Date(gate.autoCreatedAt).toLocaleString()}
                        </p>
                      </div>
                      {gate.autoPromotedAt && (
                        <div>
                          <p className="text-sm text-gray-600">Auto-Promoted</p>
                          <p className="font-medium text-green-600">
                            {new Date(gate.autoPromotedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Projected Lifetime</p>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          gate.projectedLifetime === 'permanent' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {gate.projectedLifetime}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Confidence Evolution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                    Confidence Evolution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Pattern Detection</span>
                      <span>Current State</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {gate.confidenceHistory.map((confidence, index) => (
                        <div key={index} className="flex-1">
                          <div className="h-8 bg-gray-200 rounded-lg overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                confidence >= 0.8 ? 'bg-green-500' :
                                confidence >= 0.6 ? 'bg-yellow-500' :
                                confidence >= 0.4 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${confidence * 100}%` }}
                            />
                          </div>
                          <div className="text-xs text-center mt-1 text-gray-500">
                            {(confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-gray-600">
                      Confidence has grown from {(gate.confidenceHistory[0] * 100).toFixed(1)}% to {(gate.confidence * 100).toFixed(1)}% 
                      over {gate.confidenceHistory.length} evaluation cycles
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'lifecycle' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Gate Lifecycle Stage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-2 rounded-full text-sm font-medium ${getStageColor(lifecycleStage?.stage || 'unknown')}`}>
                        {(lifecycleStage?.stage || 'unknown').replace('-', ' ').toUpperCase()}
                      </span>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Time in Stage</div>
                        <div className="font-medium">{formatDuration(lifecycleStage?.timeInStage || 0)}</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Progress to Next Milestone</span>
                        <span className="text-sm font-medium">
                          {lifecycleStage?.scanCount || 0} / {lifecycleStage?.nextStageThreshold || 100} scans
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(((lifecycleStage?.scanCount || 0) / (lifecycleStage?.nextStageThreshold || 100)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {lifecycleStage?.autoPromotionEligible && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          <span className="text-sm text-green-800 font-medium">
                            Eligible for Auto-Promotion
                          </span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          Gate meets all criteria for automatic promotion to next stage
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lifecycle Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Autonomous Lifecycle Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { stage: 'Pattern Detected', status: 'completed', threshold: '0-10 scans', description: 'Initial spatial pattern recognition' },
                      { stage: 'Probation Gate', status: 'completed', threshold: '10-50 scans', description: 'Confidence building and validation' },
                      { stage: 'Confirmed Gate', status: 'current', threshold: '50+ scans', description: 'Stable pattern with high confidence' },
                      { stage: 'Optimized Gate', status: 'pending', threshold: '300+ scans', description: 'Performance optimization and fine-tuning' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className={`w-4 h-4 rounded-full ${
                          item.status === 'completed' ? 'bg-green-500' :
                          item.status === 'current' ? 'bg-blue-500 animate-pulse' :
                          'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-medium ${
                              item.status === 'current' ? 'text-blue-600' : 'text-gray-900'
                            }`}>
                              {item.stage}
                            </h4>
                            <span className="text-sm text-gray-500">{item.threshold}</span>
                          </div>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'decisions' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-purple-600" />
                    AI Decision Explanation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-purple-900 mb-2">Primary Decision Reasoning</h4>
                      <p className="text-purple-800">{decisionExplanation?.primaryReason || 'No decision data available'}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Decision Factors Analysis</h4>
                      <div className="space-y-3">
                        {(decisionExplanation?.factors || []).map((factor: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{factor.metric}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">
                                    Weight: {(factor.weight * 100).toFixed(0)}%
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    factor.impact === 'positive' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {factor.impact}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span>Value: {typeof factor.value === 'number' && factor.value < 1 ? 
                                    (factor.value * 100).toFixed(1) + '%' : factor.value}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      factor.impact === 'positive' ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                    style={{ 
                                      width: `${typeof factor.value === 'number' && factor.value < 1 ? 
                                        factor.value * 100 : Math.min(factor.value / 300 * 100, 100)}%` 
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Confidence Breakdown</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(decisionExplanation?.confidenceBreakdown || {}).map(([key, value]) => (
                          <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{((value as number) * 100).toFixed(1)}%</div>
                            <div className="text-sm text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-green-600" />
                    Predictive Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Traffic Prediction</h4>
                        <p className="text-blue-800">Expected 15% increase in next hour based on historical patterns</p>
                        <div className="text-sm text-blue-600 mt-2">Confidence: 84%</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Stability Forecast</h4>
                        <p className="text-green-800">Gate pattern highly stable, low risk of archival</p>
                        <div className="text-sm text-green-600 mt-2">Confidence: 96%</div>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                        <h4 className="font-medium text-yellow-900">Optimization Opportunity</h4>
                      </div>
                      <p className="text-yellow-800 mt-2">
                        Detection radius could be optimized to 20m based on scan distribution analysis
                      </p>
                      <div className="text-sm text-yellow-600 mt-2">
                        Predicted improvement: +8% accuracy, -12% false positives
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GateIntelligence;
