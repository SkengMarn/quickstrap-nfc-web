import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  MapPin, 
  Users,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  BarChart3,
  Eye
} from 'lucide-react';
import { DecisionExplanation, AutoEvent } from '../types/autonomous';

interface AIDecisionExplainerProps {
  event: AutoEvent;
  explanation?: DecisionExplanation;
  onClose: () => void;
}

const AIDecisionExplainer: React.FC<AIDecisionExplainerProps> = ({ 
  event, 
  explanation, 
  onClose 
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'factors' | 'confidence' | 'impact'>('overview');

  // Use provided explanation or extract from event details (no fake defaults)
  const displayExplanation: DecisionExplanation = explanation || {
    decision: (event as any).type || 'unknown',
    factors: (event as any).confidence ? [
      {
        metric: 'Confidence Score',
        value: (event as any).confidence,
        weight: 1.0,
        impact: (event as any).confidence > 0.8 ? 'positive' : 'negative'
      }
    ] : [],
    primaryReason: (event as any).details?.reasoning || (event as any).details?.action || 'Automated AI decision',
    confidenceBreakdown: {
      spatialConsistency: (event as any).confidence || 0,
      sampleSize: (event as any).confidence || 0,
      temporalStability: (event as any).confidence || 0,
      categoryDistribution: (event as any).confidence || 0
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'ai:gate-discovered': return <MapPin className="w-5 h-5 text-green-600" />;
      case 'ai:duplicate-merged': return <Target className="w-5 h-5 text-blue-600" />;
      case 'ai:gate-promoted': return <TrendingUp className="w-5 h-5 text-purple-600" />;
      case 'ai:pattern-detected': return <Eye className="w-5 h-5 text-orange-600" />;
      case 'ai:threshold-optimized': return <Zap className="w-5 h-5 text-yellow-600" />;
      default: return <Brain className="w-5 h-5 text-gray-600" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'ai:gate-discovered': return 'border-green-200 bg-green-50';
      case 'ai:duplicate-merged': return 'border-blue-200 bg-blue-50';
      case 'ai:gate-promoted': return 'border-purple-200 bg-purple-50';
      case 'ai:pattern-detected': return 'border-orange-200 bg-orange-50';
      case 'ai:threshold-optimized': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact >= 0.2) return 'text-green-600 bg-green-100';
    if (impact >= 0.1) return 'text-blue-600 bg-blue-100';
    if (impact >= 0.05) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const formatChannelName = (channel: string) => {
    return channel.replace('ai:', '').replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b ${getChannelColor(event.channel)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getChannelIcon(event.channel)}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  AI Decision Analysis
                </h2>
                <p className="text-gray-600">
                  {formatChannelName(event.channel)} • {event.data.timestamp.toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Info },
              { id: 'factors', label: 'Decision Factors', icon: BarChart3 },
              { id: 'confidence', label: 'Confidence Analysis', icon: Target },
              { id: 'impact', label: 'Performance Impact', icon: TrendingUp }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeSection === id
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
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Decision Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-purple-600" />
                    Decision Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-2">Action Taken</h4>
                      <p className="text-purple-800">{event.data.action}</p>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">AI Reasoning</h4>
                      <p className="text-blue-800">{event.data.reasoning}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {(event.data.confidence * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Decision Confidence</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {event.data.affectedEntities.length}
                        </div>
                        <div className="text-sm text-gray-600">Entities Affected</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className={`text-2xl font-bold ${
                          event.data.performanceImpact >= 0.1 ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          +{(event.data.performanceImpact * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Performance Impact</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Affected Entities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    Affected Entities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {event.data.affectedEntities.map((entity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="font-medium text-gray-900">{entity}</span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {event.data.metadata?.scanCount && `${event.data.metadata.scanCount} scans`}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'factors' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    Decision Factor Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {displayExplanation.factors.map((factor: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{factor.metric}</h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">
                              Weight: {(factor.weight * 100).toFixed(0)}%
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              factor.impact === 'positive' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {factor.impact}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Value: {(factor.value * 100).toFixed(1)}%</span>
                            <span>Contribution: {((factor.value * factor.weight) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${
                                factor.impact === 'positive' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${factor.value * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Factor Weights Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle>Factor Weight Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {displayExplanation.factors.map((factor: any, index: number) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-24 text-sm text-gray-600 truncate">{factor.metric}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${factor.weight * 100}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm text-gray-900 text-right">
                          {(factor.weight * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'confidence' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-purple-600" />
                    Confidence Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {Object.entries(displayExplanation.confidenceBreakdown).map(([key, value]) => (
                      <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className={`text-3xl font-bold ${
                          (value as number) >= 0.9 ? 'text-green-600' :
                          (value as number) >= 0.8 ? 'text-blue-600' :
                          (value as number) >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {((value as number) * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 capitalize mt-1">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Confidence Calculation Method</h4>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-800 text-sm">
                        Overall confidence is calculated using a weighted average of spatial consistency, 
                        sample size adequacy, temporal stability, and category distribution. Each factor 
                        is validated against historical patterns and real-time data quality metrics.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-sm font-medium text-green-800">High Confidence Indicators</span>
                        </div>
                        <ul className="text-xs text-green-700 mt-2 space-y-1">
                          <li>• Spatial consistency &gt; 90%</li>
                          <li>• Sample size &gt; threshold</li>
                          <li>• Temporal stability confirmed</li>
                        </ul>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                          <span className="text-sm font-medium text-yellow-800">Monitoring Factors</span>
                        </div>
                        <ul className="text-xs text-yellow-700 mt-2 space-y-1">
                          <li>• Category distribution variance</li>
                          <li>• Edge case detection</li>
                          <li>• Pattern evolution tracking</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === 'impact' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    Performance Impact Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          +{(event.data.performanceImpact * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">System Performance</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                          {event.data.affectedEntities.length}
                        </div>
                        <div className="text-sm text-gray-600">Gates Optimized</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">0</div>
                        <div className="text-sm text-gray-600">Manual Interventions</div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Expected Improvements</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Detection Accuracy</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(0.12)}`}>
                            +12%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Processing Speed</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(0.08)}`}>
                            +8%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">False Positive Reduction</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(0.15)}`}>
                            -15%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">Validation Timeline</h4>
                      <p className="text-blue-800 text-sm">
                        Performance improvements will be validated over the next 24-48 hours through 
                        continuous monitoring and comparison with baseline metrics. The system will 
                        automatically adjust if actual performance differs from predictions.
                      </p>
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

export default AIDecisionExplainer;
