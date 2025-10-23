import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  TrendingUp,
  Users,
  Clock,
  Activity,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  DoorOpen,
  Shield,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  fetchEventAnalytics,
  fetchTimeSeriesData,
  fetchGatePerformance,
  fetchCategoryInsights,
} from '../../services/analyticsService';
import { toast } from 'react-toastify';

export interface SafeAnalyticsDashboardProps {
  eventId: string;
  isSeries?: boolean;
  seriesId?: string;
}

interface BasicAnalytics {
  totalWristbands: number;
  checkedIn: number;
  checkInRate: number;
  totalGates: number;
  activeGates: number;
  peakHour: string;
}

interface AttendanceAnalytics {
  totalCapacity: number;
  capacityUtilization: number;
  avgDwellTime: number;
  checkInVelocity: number[];
  peakOccupancy: number;
  noShowRate: number;
  earlyBirds: number;
  onTimeArrivals: number;
  lateArrivals: number;
  reEntryRate: number;
}

interface GateAnalytics {
  gateEfficiency: any[];
  bottleneckGates: any[];
  underutilizedGates: any[];
  gateReliability: any[];
  autonomousOperations: any[];
  mergeRecommendations: any[];
}

interface SecurityAnalytics {
  fraudRules: any[];
  watchlistHits: any[];
  investigatorPerformance: any[];
  caseBacklog: number;
  fraudTrends: any[];
  ruleEffectiveness: any[];
}

interface StaffAnalytics {
  skillGapAnalysis: any[];
  trainingNeeds: any[];
  staffOptimization: any[];
  communicationMetrics: any[];
  performanceImprovement: any[];
}

interface SystemAnalytics {
  cachePerformance: any[];
  apiMetrics: any[];
  dataQuality: any;
  selfHealingMetrics: any;
  predictiveInsights: any[];
}

interface BusinessAnalytics {
  eventROI: any;
  costEfficiency: any[];
  qualityOfService: any;
  benchmarking: any[];
  predictiveForecasting: any[];
}

const SafeAnalyticsDashboard: React.FC<SafeAnalyticsDashboardProps> = ({ eventId, isSeries = false, seriesId }) => {
  const [analytics, setAnalytics] = useState<BasicAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('realtime');

  // Advanced analytics state
  const [eventAnalytics, setEventAnalytics] = useState<any>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [gatePerformance, setGatePerformance] = useState<any[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<any[]>([]);

  // Additional state for new sections
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [fraudStats, setFraudStats] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [eventHealth, setEventHealth] = useState<number>(0);

  // Comprehensive analytics state
  const [attendanceAnalytics, setAttendanceAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [gateAnalytics, setGateAnalytics] = useState<GateAnalytics | null>(null);
  const [securityAnalytics, setSecurityAnalytics] = useState<SecurityAnalytics | null>(null);
  const [staffAnalytics, setStaffAnalytics] = useState<StaffAnalytics | null>(null);
  const [systemAnalytics, setSystemAnalytics] = useState<SystemAnalytics | null>(null);
  const [businessAnalytics, setBusinessAnalytics] = useState<BusinessAnalytics | null>(null);

  const loadBasicAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build series-aware queries
      let wristbandsQuery = supabase.from('wristbands').select('id, is_active');
      let checkinsQuery = supabase.from('checkin_logs').select('id, timestamp');
      let gatesQuery = supabase.from('gates').select('id, status');
      
      if (isSeries && seriesId) {
        // For series: filter by series_id
        wristbandsQuery = wristbandsQuery.eq('series_id', seriesId);
        checkinsQuery = checkinsQuery.eq('series_id', seriesId);
        gatesQuery = gatesQuery.eq('series_id', seriesId);
      } else {
        // For parent event: filter by event_id AND series_id IS NULL
        wristbandsQuery = wristbandsQuery.eq('event_id', eventId).is('series_id', null);
        checkinsQuery = checkinsQuery.eq('event_id', eventId).is('series_id', null);
        gatesQuery = gatesQuery.eq('event_id', eventId).is('series_id', null);
      }

      // Fetch basic analytics data directly from database
      const [wristbandsResult, checkinsResult, gatesResult] = await Promise.allSettled([
        wristbandsQuery,
        checkinsQuery,
        gatesQuery
      ]);

      let totalWristbands = 0;
      let checkedIn = 0;
      let totalGates = 0;
      let activeGates = 0;
      let peakHour = 'N/A';

      if (wristbandsResult.status === 'fulfilled' && wristbandsResult.value.data) {
        totalWristbands = wristbandsResult.value.data.length;
      }

      if (checkinsResult.status === 'fulfilled' && checkinsResult.value.data) {
        const checkins = checkinsResult.value.data;
        checkedIn = checkins.length;

        // Calculate peak hour
        if (checkins.length > 0) {
          const hourCounts: Record<string, number> = {};
          checkins.forEach((log: any) => {
            const hour = new Date(log.timestamp).getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;
            hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
          });
          const peakEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
          if (peakEntry) {
            peakHour = peakEntry[0];
          }
        }
      }

      if (gatesResult.status === 'fulfilled' && gatesResult.value.data) {
        totalGates = gatesResult.value.data.length;
        activeGates = gatesResult.value.data.filter(g => g.status === 'active').length;
      }

      const checkInRate = totalWristbands > 0 ? (checkedIn / totalWristbands) * 100 : 0;

      setAnalytics({
        totalWristbands,
        checkedIn,
        checkInRate,
        totalGates,
        activeGates,
        peakHour
      });

    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadAdvancedAnalytics = async () => {
    try {
      // Load comprehensive analytics from analytics service
      const [eventResult, timeSeriesResult, gateResult, categoryResult] = await Promise.all([
        fetchEventAnalytics(eventId),
        fetchTimeSeriesData(eventId, 'hour'),
        fetchGatePerformance(eventId),
        fetchCategoryInsights(eventId)
      ]);

      if (eventResult.success && eventResult.data) {
        setEventAnalytics(eventResult.data);
      }

      if (timeSeriesResult.success && timeSeriesResult.data) {
        setTimeSeriesData(timeSeriesResult.data);
      }

      if (gateResult.success && gateResult.data) {
        setGatePerformance(gateResult.data);
      }

      if (categoryResult.success && categoryResult.data) {
        setCategoryInsights(categoryResult.data);
      }

      // Load additional analytics
      await loadStaffPerformance();
      await loadFraudAnalytics();
      await loadSystemHealth();
      await calculateEventHealth();
    } catch (err) {
      console.error('Error loading advanced analytics:', err);
      toast.error('Some analytics could not be loaded');
    }
  };

  const loadStaffPerformance = async () => {
    try {
      // Fetch staff performance data
      const { data, error } = await supabase
        .from('staff_performance_cache')
        .select('*')
        .eq('event_id', eventId)
        .order('efficiency_score', { ascending: false });

      if (error) {
        // Table doesn't exist yet - silently handle
        if (error.code === '42P01') {
          setStaffPerformance([]);
          return;
        }
        throw error;
      }
      setStaffPerformance(data || []);
    } catch (err) {
      // Silently handle - this is an optional feature
      setStaffPerformance([]);
    }
  };

  const loadFraudAnalytics = async () => {
    try {
      // Fetch fraud detection stats
      const [detectionsResult, casesResult] = await Promise.all([
        supabase
          .from('fraud_detections')
          .select('id, severity, detection_type, investigated_at')
          .eq('event_id', eventId),
        supabase
          .from('fraud_cases')
          .select('id, status, priority')
          .eq('event_id', eventId)
      ]);

      const detections = detectionsResult.data || [];
      const cases = casesResult.data || [];

      setFraudStats({
        totalAlerts: detections.length,
        criticalAlerts: detections.filter(d => d.severity === 'critical').length,
        investigated: detections.filter(d => d.investigated_at !== null).length,
        totalCases: cases.length,
        openCases: cases.filter(c => c.status === 'open' || c.status === 'investigating').length,
        resolvedCases: cases.filter(c => c.status === 'resolved').length,
        byType: detections.reduce((acc: any, d) => {
          acc[d.detection_type] = (acc[d.detection_type] || 0) + 1;
          return acc;
        }, {})
      });
    } catch (err) {
      console.error('Error loading fraud analytics:', err);
    }
  };

  const loadSystemHealth = async () => {
    try {
      // Fetch system health metrics
      const { data: checkinLogs, error } = await supabase
        .from('checkin_logs')
        .select('processing_time_ms, status')
        .eq('event_id', eventId);

      if (error) throw error;

      const logs = checkinLogs || [];
      const successfulLogs = logs.filter(l => l.status === 'success');
      const avgProcessingTime = successfulLogs.length > 0
        ? successfulLogs.reduce((sum, l) => sum + (l.processing_time_ms || 0), 0) / successfulLogs.length
        : 0;

      const errorRate = logs.length > 0
        ? (logs.filter(l => l.status === 'error').length / logs.length) * 100
        : 0;

      setSystemHealth({
        avgProcessingTime,
        errorRate,
        totalTransactions: logs.length,
        successfulTransactions: successfulLogs.length,
        uptime: 100 - errorRate
      });
    } catch (err) {
      console.error('Error loading system health:', err);
    }
  };

  const calculateEventHealth = async () => {
    try {
      // Calculate event health score (0-100) based on multiple factors
      const gateHealth = gatePerformance.length > 0
        ? gatePerformance.reduce((sum, g) => sum + (g.health_score || 0), 0) / gatePerformance.length
        : 0;

      const fraudRisk = fraudStats?.totalAlerts > 0
        ? Math.max(0, 100 - (fraudStats.criticalAlerts / fraudStats.totalAlerts * 100))
        : 100;

      const operationalEfficiency = analytics?.checkInRate || 0;

      // Weighted composite: gate health (40%) + fraud risk (30%) + operational efficiency (30%)
      const healthScore = (gateHealth * 0.4) + (fraudRisk * 0.3) + (operationalEfficiency * 0.3);

      setEventHealth(Math.round(healthScore));
    } catch (err) {
      console.error('Error calculating event health:', err);
      setEventHealth(0);
    }
  };

  // COMPREHENSIVE ANALYTICS LOADING FUNCTIONS

  const loadAttendanceAnalytics = async () => {
    try {
      // Get event details for capacity
      const { data: event } = await supabase
        .from('events')
        .select('capacity, start_date, end_date')
        .eq('id', eventId)
        .single();

      if (!event) return;

      // Advanced attendance queries
      const [
        dwellTimeResult,
        velocityResult,
        arrivalPatternsResult,
        reEntryResult
      ] = await Promise.allSettled([
        // Average dwell time calculation
        supabase.rpc('calculate_avg_dwell_time', { event_id: eventId }),
        
        // Check-in velocity by hour
        supabase
          .from('checkin_logs')
          .select('timestamp')
          .eq('event_id', eventId)
          .eq('status', 'success'),
          
        // Arrival patterns analysis
        supabase.rpc('analyze_arrival_patterns', { 
          event_id: eventId, 
          start_date: event.start_date 
        }),
        
        // Re-entry analysis
        supabase.rpc('calculate_reentry_rate', { event_id: eventId })
      ]);

      // Process velocity data
      let velocityData: number[] = [];
      if (velocityResult.status === 'fulfilled' && velocityResult.value.data) {
        const hourlyCheckins: Record<string, number> = {};
        velocityResult.value.data.forEach((log: any) => {
          const hour = new Date(log.timestamp).getHours();
          hourlyCheckins[hour] = (hourlyCheckins[hour] || 0) + 1;
        });
        velocityData = Array.from({ length: 24 }, (_, i) => hourlyCheckins[i] || 0);
      }

      const attendanceData: AttendanceAnalytics = {
        totalCapacity: event.capacity || 0,
        capacityUtilization: analytics ? (analytics.checkedIn / event.capacity) * 100 : 0,
        avgDwellTime: dwellTimeResult.status === 'fulfilled' ? dwellTimeResult.value.data || 0 : 0,
        checkInVelocity: velocityData,
        peakOccupancy: Math.max(...velocityData),
        noShowRate: analytics ? ((analytics.totalWristbands - analytics.checkedIn) / analytics.totalWristbands) * 100 : 0,
        earlyBirds: arrivalPatternsResult.status === 'fulfilled' ? arrivalPatternsResult.value.data?.early_birds || 0 : 0,
        onTimeArrivals: arrivalPatternsResult.status === 'fulfilled' ? arrivalPatternsResult.value.data?.on_time || 0 : 0,
        lateArrivals: arrivalPatternsResult.status === 'fulfilled' ? arrivalPatternsResult.value.data?.late_arrivals || 0 : 0,
        reEntryRate: reEntryResult.status === 'fulfilled' ? reEntryResult.value.data || 0 : 0
      };

      setAttendanceAnalytics(attendanceData);
    } catch (err) {
      console.error('Error loading attendance analytics:', err);
    }
  };

  const loadGateAnalytics = async () => {
    try {
      const [
        efficiencyResult,
        bottleneckResult,
        reliabilityResult,
        autonomousResult,
        mergeResult
      ] = await Promise.allSettled([
        // Gate efficiency analysis
        supabase
          .from('gate_performance_cache')
          .select('*')
          .eq('event_id', eventId)
          .order('health_score', { ascending: false }),
          
        // Bottleneck detection
        supabase.rpc('detect_gate_bottlenecks', { event_id: eventId }),
        
        // Gate reliability metrics
        supabase.rpc('calculate_gate_reliability', { event_id: eventId }),
        
        // Autonomous operations
        supabase
          .from('autonomous_gates')
          .select('*, gates(name)')
          .eq('event_id', eventId),
          
        // Merge recommendations
        supabase
          .from('gate_merge_suggestions')
          .select('*, gates!primary_gate_id(name), gates!secondary_gate_id(name)')
          .eq('event_id', eventId)
          .eq('status', 'pending')
      ]);

      const gateData: GateAnalytics = {
        gateEfficiency: efficiencyResult.status === 'fulfilled' ? efficiencyResult.value.data || [] : [],
        bottleneckGates: bottleneckResult.status === 'fulfilled' ? bottleneckResult.value.data || [] : [],
        underutilizedGates: [],
        gateReliability: reliabilityResult.status === 'fulfilled' ? reliabilityResult.value.data || [] : [],
        autonomousOperations: autonomousResult.status === 'fulfilled' ? autonomousResult.value.data || [] : [],
        mergeRecommendations: mergeResult.status === 'fulfilled' ? mergeResult.value.data || [] : []
      };

      // Identify underutilized gates
      if (gateData.gateEfficiency.length > 0) {
        const avgScans = gateData.gateEfficiency.reduce((sum, gate) => sum + (gate.total_scans || 0), 0) / gateData.gateEfficiency.length;
        gateData.underutilizedGates = gateData.gateEfficiency.filter(gate => (gate.total_scans || 0) < avgScans * 0.5);
      }

      setGateAnalytics(gateData);
    } catch (err) {
      console.error('Error loading gate analytics:', err);
    }
  };

  const loadSecurityAnalytics = async () => {
    try {
      const [
        rulesResult,
        watchlistResult,
        investigatorResult,
        trendsResult,
        effectivenessResult
      ] = await Promise.allSettled([
        // Fraud rules performance
        supabase.rpc('analyze_fraud_rule_performance', { event_id: eventId }),
        
        // Watchlist hits
        supabase.rpc('get_watchlist_effectiveness', { event_id: eventId }),
        
        // Investigator performance
        supabase.rpc('analyze_investigator_performance', { event_id: eventId }),
        
        // Fraud trends analysis
        supabase.rpc('analyze_fraud_trends', { event_id: eventId }),
        
        // Rule effectiveness
        supabase.rpc('calculate_rule_effectiveness', { event_id: eventId })
      ]);

      // Get case backlog
      const { count: backlogCount } = await supabase
        .from('fraud_cases')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .in('status', ['open', 'investigating']);

      const securityData: SecurityAnalytics = {
        fraudRules: rulesResult.status === 'fulfilled' ? rulesResult.value.data || [] : [],
        watchlistHits: watchlistResult.status === 'fulfilled' ? watchlistResult.value.data || [] : [],
        investigatorPerformance: investigatorResult.status === 'fulfilled' ? investigatorResult.value.data || [] : [],
        caseBacklog: backlogCount || 0,
        fraudTrends: trendsResult.status === 'fulfilled' ? trendsResult.value.data || [] : [],
        ruleEffectiveness: effectivenessResult.status === 'fulfilled' ? effectivenessResult.value.data || [] : []
      };

      setSecurityAnalytics(securityData);
    } catch (err) {
      console.error('Error loading security analytics:', err);
    }
  };

  const loadStaffAnalytics = async () => {
    try {
      const [
        skillGapResult,
        trainingResult,
        optimizationResult,
        communicationResult,
        improvementResult
      ] = await Promise.allSettled([
        // Skill gap analysis
        supabase.rpc('analyze_staff_skill_gaps', { event_id: eventId }),
        
        // Training needs assessment
        supabase.rpc('identify_training_needs', { event_id: eventId }),
        
        // Staffing optimization
        supabase.rpc('analyze_staffing_optimization', { event_id: eventId }),
        
        // Communication metrics
        supabase
          .from('staff_messages')
          .select('*')
          .eq('event_id', eventId),
          
        // Performance improvement tracking
        supabase.rpc('track_performance_improvement', { event_id: eventId })
      ]);

      const staffData: StaffAnalytics = {
        skillGapAnalysis: skillGapResult.status === 'fulfilled' ? skillGapResult.value.data || [] : [],
        trainingNeeds: trainingResult.status === 'fulfilled' ? trainingResult.value.data || [] : [],
        staffOptimization: optimizationResult.status === 'fulfilled' ? optimizationResult.value.data || [] : [],
        communicationMetrics: communicationResult.status === 'fulfilled' ? communicationResult.value.data || [] : [],
        performanceImprovement: improvementResult.status === 'fulfilled' ? improvementResult.value.data || [] : []
      };

      setStaffAnalytics(staffData);
    } catch (err) {
      console.error('Error loading staff analytics:', err);
    }
  };

  const loadSystemAnalytics = async () => {
    try {
      const [
        cacheResult,
        apiResult,
        qualityResult,
        healingResult,
        predictiveResult
      ] = await Promise.allSettled([
        // Cache performance
        supabase.rpc('analyze_cache_performance', { event_id: eventId }),
        
        // API metrics
        supabase.rpc('get_api_performance_metrics', { event_id: eventId }),
        
        // Data quality assessment
        supabase.rpc('assess_data_quality', { event_id: eventId }),
        
        // Self-healing metrics
        supabase
          .from('system_health_logs')
          .select('*')
          .eq('event_id', eventId)
          .order('recorded_at', { ascending: false })
          .limit(1),
          
        // Predictive insights
        supabase
          .from('predictive_insights')
          .select('*')
          .eq('event_id', eventId)
          .eq('insight_type', 'optimization_suggestion')
      ]);

      const systemData: SystemAnalytics = {
        cachePerformance: cacheResult.status === 'fulfilled' ? cacheResult.value.data || [] : [],
        apiMetrics: apiResult.status === 'fulfilled' ? apiResult.value.data || [] : [],
        dataQuality: qualityResult.status === 'fulfilled' ? qualityResult.value.data : null,
        selfHealingMetrics: healingResult.status === 'fulfilled' ? healingResult.value.data?.[0] : null,
        predictiveInsights: predictiveResult.status === 'fulfilled' ? predictiveResult.value.data || [] : []
      };

      setSystemAnalytics(systemData);
    } catch (err) {
      console.error('Error loading system analytics:', err);
    }
  };

  const loadBusinessAnalytics = async () => {
    try {
      const [
        roiResult,
        costResult,
        qosResult,
        benchmarkResult,
        forecastResult
      ] = await Promise.allSettled([
        // Event ROI calculation
        supabase.rpc('calculate_event_roi', { event_id: eventId }),
        
        // Cost efficiency analysis
        supabase.rpc('analyze_cost_efficiency', { event_id: eventId }),
        
        // Quality of service metrics
        supabase.rpc('calculate_quality_of_service', { event_id: eventId }),
        
        // Benchmarking against past events
        supabase.rpc('benchmark_event_performance', { event_id: eventId }),
        
        // Predictive forecasting
        supabase
          .from('predictions')
          .select('*')
          .eq('event_id', eventId)
          .in('prediction_type', ['attendance_forecast', 'staffing_recommendation'])
      ]);

      const businessData: BusinessAnalytics = {
        eventROI: roiResult.status === 'fulfilled' ? roiResult.value.data : null,
        costEfficiency: costResult.status === 'fulfilled' ? costResult.value.data || [] : [],
        qualityOfService: qosResult.status === 'fulfilled' ? qosResult.value.data : null,
        benchmarking: benchmarkResult.status === 'fulfilled' ? benchmarkResult.value.data || [] : [],
        predictiveForecasting: forecastResult.status === 'fulfilled' ? forecastResult.value.data || [] : []
      };

      setBusinessAnalytics(businessData);
    } catch (err) {
      console.error('Error loading business analytics:', err);
    }
  };

  const handleExportCSV = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Wristbands', analytics.totalWristbands],
      ['Checked In', analytics.checkedIn],
      ['Check-in Rate', `${analytics.checkInRate.toFixed(1)}%`],
      ['Total Gates', analytics.totalGates],
      ['Active Gates', analytics.activeGates],
      ['Peak Hour', analytics.peakHour],
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${eventId}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Analytics exported to CSV');
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadAllAnalytics = async () => {
      if (!eventId) return;

      try {
        await Promise.allSettled([
          loadBasicAnalytics(),
          loadAdvancedAnalytics(),
          loadAttendanceAnalytics(),
          loadGateAnalytics(),
          loadSecurityAnalytics(),
          loadStaffAnalytics(),
          loadSystemAnalytics(),
          loadBusinessAnalytics()
        ]);
      } catch (error) {
        if (isMounted && (error instanceof Error && error.name !== 'AbortError')) {
          console.error('Error loading analytics:', error);
          setError(error instanceof Error ? error.message : 'Failed to load analytics');
        }
      }
    };

    loadAllAnalytics();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eventId]);

  // Handle no eventId after all hooks
  if (!eventId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">No event selected for analytics</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Error loading analytics</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={loadBasicAnalytics}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">No analytics data available</p>
          <Button onClick={loadBasicAnalytics} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Analytics Dashboard</h1>
          <p className="text-sm text-gray-600">Comprehensive event performance and insights</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              loadBasicAnalytics();
              loadAdvancedAnalytics();
              loadAttendanceAnalytics();
              loadGateAnalytics();
              loadSecurityAnalytics();
              loadStaffAnalytics();
              loadSystemAnalytics();
              loadBusinessAnalytics();
            }}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
          <Button onClick={handleExportCSV} className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Total Wristbands</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.totalWristbands.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Checked In</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.checkedIn.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Check-in Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.checkInRate.toFixed(1)}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Active Gates</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.activeGates} / {analytics.totalGates}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Analytics Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="realtime">
            <Activity className="w-4 h-4 mr-1" />
            Real-Time
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Users className="w-4 h-4 mr-1" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="gates">
            <DoorOpen className="w-4 h-4 mr-1" />
            Gates
          </TabsTrigger>
          <TabsTrigger value="categories">
            <BarChart3 className="w-4 h-4 mr-1" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="w-4 h-4 mr-1" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-1" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system">
            <Zap className="w-4 h-4 mr-1" />
            System
          </TabsTrigger>
          <TabsTrigger value="business">
            <TrendingUp className="w-4 h-4 mr-1" />
            Business
          </TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          {/* Event Health Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg className="transform -rotate-90 w-40 h-40">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-gray-200"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 70}`}
                      strokeDashoffset={`${2 * Math.PI * 70 * (1 - eventHealth / 100)}`}
                      className={
                        eventHealth >= 80 ? 'text-green-500' :
                        eventHealth >= 60 ? 'text-blue-500' :
                        eventHealth >= 40 ? 'text-yellow-500' : 'text-red-500'
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900">{eventHealth}</span>
                    <span className="text-sm text-gray-500">Health Score</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase mb-1">Gate Health</p>
                  <p className="text-lg font-bold text-gray-900">
                    {gatePerformance.length > 0
                      ? Math.round(gatePerformance.reduce((sum, g) => sum + (g.health_score || 0), 0) / gatePerformance.length)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-500">40% weight</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase mb-1">Security Risk</p>
                  <p className="text-lg font-bold text-gray-900">
                    {fraudStats ? Math.round(100 - (fraudStats.criticalAlerts / Math.max(fraudStats.totalAlerts, 1) * 100)) : 100}%
                  </p>
                  <p className="text-xs text-gray-500">30% weight</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 uppercase mb-1">Operational Efficiency</p>
                  <p className="text-lg font-bold text-gray-900">{analytics?.checkInRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">30% weight</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Capacity Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Capacity Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Current Attendance</span>
                  <span className="text-2xl font-bold text-gray-900">{analytics?.checkedIn.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-6 rounded-full flex items-center justify-end pr-2 transition-all ${
                      (analytics?.checkedIn / analytics?.totalWristbands * 100) > 90 ? 'bg-red-600' :
                      (analytics?.checkedIn / analytics?.totalWristbands * 100) > 75 ? 'bg-yellow-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min((analytics?.checkedIn / analytics?.totalWristbands * 100), 100)}%` }}
                  >
                    <span className="text-xs font-semibold text-white">
                      {((analytics?.checkedIn / analytics?.totalWristbands * 100) || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-900 uppercase mb-1">Total Capacity</p>
                    <p className="text-lg font-bold text-blue-700">{analytics?.totalWristbands.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-900 uppercase mb-1">Checked In</p>
                    <p className="text-lg font-bold text-blue-700">{analytics?.checkedIn.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-900 uppercase mb-1">Check-In Rate</p>
                    <p className="text-lg font-bold text-blue-700">{analytics?.checkInRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Alerts Panel */}
          {fraudStats && fraudStats.totalAlerts > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className={`text-center p-4 rounded-lg border ${
                    fraudStats.criticalAlerts > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <p className="text-xs font-medium text-gray-600 uppercase mb-2">Critical Alerts</p>
                    <p className={`text-3xl font-bold ${fraudStats.criticalAlerts > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                      {fraudStats.criticalAlerts}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 uppercase mb-2">Total Alerts</p>
                    <p className="text-3xl font-bold text-gray-900">{fraudStats.totalAlerts}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 uppercase mb-2">Open Cases</p>
                    <p className="text-3xl font-bold text-gray-900">{fraudStats.openCases}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 uppercase mb-2">Resolved</p>
                    <p className="text-3xl font-bold text-green-700">{fraudStats.resolvedCases}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-600 uppercase mb-1">Peak Hour</p>
                <p className="text-xl font-bold text-gray-900">{analytics?.peakHour}</p>
                <p className="text-xs text-gray-500 mt-1">Highest traffic</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-600 uppercase mb-1">Active Gates</p>
                <p className="text-xl font-bold text-gray-900">{analytics?.activeGates} / {analytics?.totalGates}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics?.totalGates > 0 ? ((analytics?.activeGates / analytics?.totalGates) * 100).toFixed(0) : 0}% operational
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-600 uppercase mb-1">Avg Processing</p>
                <p className="text-xl font-bold text-gray-900">
                  {eventAnalytics?.avg_processing_time ? `${Math.round(eventAnalytics.avg_processing_time)}ms` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Per check-in</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-600 uppercase mb-1">Staff Active</p>
                <p className="text-xl font-bold text-gray-900">{staffPerformance.length}</p>
                <p className="text-xs text-gray-500 mt-1">On duty</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Clock className="w-5 h-5 mr-2" />
                Event Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 uppercase mb-1">Peak Check-in Hour</p>
                  <p className="text-xl font-bold text-blue-700">{analytics.peakHour}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 uppercase mb-1">Avg Check-in Rate</p>
                  <p className="text-xl font-bold text-blue-700">{analytics.checkInRate.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 uppercase mb-1">Gate Utilization</p>
                  <p className="text-xl font-bold text-blue-700">
                    {analytics.totalGates > 0 ? ((analytics.activeGates / analytics.totalGates) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {eventAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Health Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 uppercase mb-1">Unique Attendees</p>
                    <p className="text-lg font-bold text-gray-900">{eventAnalytics.unique_attendees?.toLocaleString() || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 uppercase mb-1">Total Check-ins</p>
                    <p className="text-lg font-bold text-gray-900">{eventAnalytics.total_checkins?.toLocaleString() || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 uppercase mb-1">Avg Processing</p>
                    <p className="text-lg font-bold text-gray-900">{(eventAnalytics.avg_processing_time || 0).toFixed(0)}ms</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 uppercase mb-1">Staff Worked</p>
                    <p className="text-lg font-bold text-gray-900">{eventAnalytics.staff_worked || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          {/* Comprehensive Attendance Analytics */}
          {attendanceAnalytics && (
            <>
              {/* Capacity & Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Capacity Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-900 uppercase mb-2">Total Capacity</p>
                      <p className="text-2xl font-bold text-blue-700">{attendanceAnalytics.totalCapacity.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-900 uppercase mb-2">Utilization</p>
                      <p className="text-2xl font-bold text-green-700">{attendanceAnalytics.capacityUtilization.toFixed(1)}%</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-900 uppercase mb-2">Avg Dwell Time</p>
                      <p className="text-2xl font-bold text-purple-700">{(attendanceAnalytics.avgDwellTime / 60).toFixed(1)}h</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-xs text-orange-900 uppercase mb-2">Peak Occupancy</p>
                      <p className="text-2xl font-bold text-orange-700">{attendanceAnalytics.peakOccupancy}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Arrival Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Arrival Pattern Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Early Birds</p>
                      <p className="text-xl font-bold text-gray-900">{attendanceAnalytics.earlyBirds}</p>
                      <p className="text-xs text-gray-500">Before start time</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-900 uppercase mb-2">On Time</p>
                      <p className="text-xl font-bold text-green-700">{attendanceAnalytics.onTimeArrivals}</p>
                      <p className="text-xs text-green-600">Within 30 min</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-yellow-900 uppercase mb-2">Late Arrivals</p>
                      <p className="text-xl font-bold text-yellow-700">{attendanceAnalytics.lateArrivals}</p>
                      <p className="text-xs text-yellow-600">30+ min late</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-900 uppercase mb-2">No-Show Rate</p>
                      <p className="text-xl font-bold text-red-700">{attendanceAnalytics.noShowRate.toFixed(1)}%</p>
                      <p className="text-xs text-red-600">Never checked in</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Check-in Velocity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">24-Hour Check-in Velocity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {attendanceAnalytics.checkInVelocity.map((count, hour) => {
                      const maxCount = Math.max(...attendanceAnalytics.checkInVelocity);
                      const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <div key={hour} className="flex items-center space-x-3">
                          <div className="w-16 text-xs text-gray-600 font-mono">
                            {hour.toString().padStart(2, '0')}:00
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                            <div
                              className={`h-6 rounded-full flex items-center justify-end pr-2 ${
                                count === maxCount ? 'bg-red-600' : 'bg-blue-600'
                              }`}
                              style={{ width: `${width}%` }}
                            >
                              {count > 0 && (
                                <span className="text-xs font-semibold text-white">
                                  {count}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-12 text-xs text-gray-500 text-right">
                            {count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Re-entry Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Re-entry & Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900 uppercase mb-2">Re-entry Rate</p>
                      <p className="text-3xl font-bold text-blue-700">{attendanceAnalytics.reEntryRate.toFixed(1)}%</p>
                      <p className="text-xs text-blue-600 mt-2">Multiple check-ins per attendee</p>
                    </div>
                    <div className="text-center p-6 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-900 uppercase mb-2">Engagement Score</p>
                      <p className="text-3xl font-bold text-purple-700">
                        {Math.round((100 - attendanceAnalytics.noShowRate) * (attendanceAnalytics.reEntryRate / 100 + 1))}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">Composite engagement metric</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Fallback to basic time series if comprehensive data not available */}
          {!attendanceAnalytics && timeSeriesData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Check-in Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {timeSeriesData.slice(0, 10).map((item, idx) => {
                    const maxCheckins = Math.max(...timeSeriesData.map(d => d.checkins));
                    const width = (item.checkins / maxCheckins) * 100;
                    return (
                      <div key={idx} className="flex items-center space-x-3">
                        <div className="w-32 text-xs text-gray-600 font-mono">
                          {new Date(item.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                          <div
                            className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${width}%` }}
                          >
                            <span className="text-xs font-semibold text-white">
                              {item.checkins}
                            </span>
                          </div>
                        </div>
                        <div className="w-20 text-xs text-gray-500 text-right">
                          {item.cumulative_checkins} total
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="gates" className="space-y-4">
          {/* Comprehensive Gate Analytics */}
          {gateAnalytics && (
            <>
              {/* Gate Efficiency Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gate Efficiency Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {gateAnalytics.gateEfficiency.length > 0 ? (
                    <div className="space-y-4">
                      {gateAnalytics.gateEfficiency.map((gate, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{gate.gate_name || `Gate ${idx + 1}`}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                (gate.health_score || 0) >= 80 ? 'bg-green-100 text-green-800' :
                                (gate.health_score || 0) >= 60 ? 'bg-blue-100 text-blue-800' :
                                (gate.health_score || 0) >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {(gate.health_score || 0).toFixed(0)}% Health
                              </span>
                              <span className="text-sm text-gray-600">{(gate.total_scans || 0).toLocaleString()} scans</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="text-xs text-gray-600">Avg Processing</p>
                              <p className="text-sm font-bold text-gray-900">{(gate.avg_scan_time_ms || 0).toFixed(0)}ms</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="text-xs text-gray-600">Success Rate</p>
                              <p className="text-sm font-bold text-gray-900">
                                {gate.total_scans > 0 ? ((gate.successful_scans / gate.total_scans) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="text-xs text-gray-600">Scans/Hour</p>
                              <p className="text-sm font-bold text-gray-900">{(gate.scans_per_hour || 0).toFixed(0)}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="text-xs text-gray-600">Uptime</p>
                              <p className="text-sm font-bold text-gray-900">{(gate.uptime_percentage || 0).toFixed(1)}%</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="text-xs text-gray-600">Peak Hour</p>
                              <p className="text-sm font-bold text-gray-900">{gate.peak_hour || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No gate efficiency data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Bottleneck Analysis */}
              {gateAnalytics.bottleneckGates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                      Bottleneck Gates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {gateAnalytics.bottleneckGates.map((gate, idx) => (
                        <div key={idx} className="border border-red-200 bg-red-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-red-900">{gate.gate_name}</h4>
                            <span className="text-sm text-red-700">Bottleneck Score: {gate.bottleneck_score}</span>
                          </div>
                          <p className="text-sm text-red-800">{gate.reason}</p>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <p className="text-xs text-red-600">Queue Length</p>
                              <p className="text-sm font-bold text-red-900">{gate.avg_queue_length}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-red-600">Wait Time</p>
                              <p className="text-sm font-bold text-red-900">{gate.avg_wait_time}s</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-red-600">Utilization</p>
                              <p className="text-sm font-bold text-red-900">{gate.utilization}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Underutilized Gates */}
              {gateAnalytics.underutilizedGates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <TrendingDown className="w-5 h-5 mr-2 text-yellow-600" />
                      Underutilized Gates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {gateAnalytics.underutilizedGates.map((gate, idx) => (
                        <div key={idx} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-yellow-900">{gate.gate_name || `Gate ${idx + 1}`}</h4>
                            <span className="text-sm text-yellow-700">{gate.total_scans} scans (Below Average)</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <p className="text-xs text-yellow-600">Utilization</p>
                              <p className="text-sm font-bold text-yellow-900">
                                {gate.total_scans > 0 ? ((gate.scans_per_hour / 100) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-yellow-600">Scans/Hour</p>
                              <p className="text-sm font-bold text-yellow-900">{gate.scans_per_hour || 0}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-yellow-600">Potential</p>
                              <p className="text-sm font-bold text-yellow-900">High</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Autonomous Operations */}
              {gateAnalytics.autonomousOperations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Zap className="w-5 h-5 mr-2 text-purple-600" />
                      Autonomous Gate Operations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {gateAnalytics.autonomousOperations.map((gate, idx) => (
                        <div key={idx} className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-purple-900">{gate.gates?.name || `Gate ${idx + 1}`}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              gate.status === 'active' ? 'bg-green-100 text-green-800' :
                              gate.status === 'learning' ? 'bg-blue-100 text-blue-800' :
                              gate.status === 'optimizing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {gate.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-xs text-purple-600">Confidence</p>
                              <p className="text-sm font-bold text-purple-900">{(gate.confidence_score * 100).toFixed(1)}%</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-xs text-purple-600">Decisions</p>
                              <p className="text-sm font-bold text-purple-900">{gate.decisions_count}</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-xs text-purple-600">Accuracy</p>
                              <p className="text-sm font-bold text-purple-900">{(gate.accuracy_rate * 100).toFixed(1)}%</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-xs text-purple-600">Response Time</p>
                              <p className="text-sm font-bold text-purple-900">{gate.avg_response_time_ms}ms</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gate Merge Recommendations */}
              {gateAnalytics.mergeRecommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-blue-600" />
                      Gate Merge Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {gateAnalytics.mergeRecommendations.map((merge, idx) => (
                        <div key={idx} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-blue-900">
                              {merge.gates?.name} + {merge.gates?.name}
                            </h4>
                            <span className="text-sm text-blue-700">
                              {(merge.confidence_score * 100).toFixed(1)}% Confidence
                            </span>
                          </div>
                          <p className="text-sm text-blue-800 mb-3">{merge.reasoning}</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-xs text-blue-600">Distance</p>
                              <p className="text-sm font-bold text-blue-900">{merge.distance_meters}m</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-xs text-blue-600">Traffic Similarity</p>
                              <p className="text-sm font-bold text-blue-900">{(merge.traffic_similarity * 100).toFixed(1)}%</p>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <p className="text-xs text-blue-600">Potential Savings</p>
                              <p className="text-sm font-bold text-blue-900">High</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Fallback to basic gate performance if comprehensive data not available */}
          {!gateAnalytics && gatePerformance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gate Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gatePerformance.map((gate, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{gate.gate_name}</h4>
                        <span className="text-sm text-gray-600">{gate.total_checkins.toLocaleString()} check-ins</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Avg Processing</p>
                          <p className="text-sm font-bold text-gray-900">{gate.avg_processing_time_ms.toFixed(0)}ms</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Utilization</p>
                          <p className="text-sm font-bold text-gray-900">{gate.utilization_percentage.toFixed(1)}%</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Efficiency</p>
                          <p className="text-sm font-bold text-gray-900">{gate.staff_efficiency.toFixed(1)}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Bottleneck</p>
                          <p className={`text-sm font-bold ${gate.bottleneck_score > 50 ? 'text-red-600' : 'text-gray-900'}`}>
                            {gate.bottleneck_score.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Category Insights</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryInsights.length > 0 ? (
                <div className="space-y-4">
                  {categoryInsights.map((category, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{category.category}</h4>
                        <span className="text-sm text-gray-600">{category.total_wristbands} wristbands</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <p className="text-xs text-blue-900">Total Check-ins</p>
                          <p className="text-sm font-bold text-blue-700">{category.total_checkins}</p>
                        </div>
                        <div className={`p-2 rounded border ${category.no_show_rate > 20 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                          <p className={`text-xs ${category.no_show_rate > 20 ? 'text-red-900' : 'text-gray-600'}`}>No-Show Rate</p>
                          <p className={`text-sm font-bold ${category.no_show_rate > 20 ? 'text-red-700' : 'text-gray-900'}`}>
                            {category.no_show_rate.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded border border-gray-200">
                          <p className="text-xs text-gray-600">No-Shows</p>
                          <p className="text-sm font-bold text-gray-900">{category.no_show_count}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded border border-gray-200">
                          <p className="text-xs text-gray-600">Avg Check-in Time</p>
                          <p className="text-sm font-bold text-gray-900">
                            {category.avg_checkin_time ? new Date(category.avg_checkin_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      {category.preferred_gates && category.preferred_gates.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-1">Preferred Gates:</p>
                          <div className="flex flex-wrap gap-2">
                            {category.preferred_gates.map((gate: string, gIdx: number) => (
                              <span key={gIdx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {gate}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No category insights available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {staffPerformance.length > 0 ? (
                <div className="space-y-3">
                  {staffPerformance.slice(0, 10).map((staff, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Staff Member {idx + 1}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          (staff.efficiency_score || 0) >= 80 ? 'bg-green-100 text-green-800' :
                          (staff.efficiency_score || 0) >= 60 ? 'bg-blue-100 text-blue-800' :
                          (staff.efficiency_score || 0) >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {(staff.efficiency_score || 0).toFixed(0)}% Efficiency
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Total Scans</p>
                          <p className="text-sm font-bold text-gray-900">{(staff.total_scans || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Success Rate</p>
                          <p className="text-sm font-bold text-gray-900">
                            {staff.total_scans > 0 ? ((staff.successful_scans / staff.total_scans) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Scans/Hour</p>
                          <p className="text-sm font-bold text-gray-900">{(staff.scans_per_hour || 0).toFixed(1)}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">Hours Worked</p>
                          <p className="text-sm font-bold text-gray-900">{(staff.hours_worked || 0).toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {staffPerformance.length > 10 && (
                    <p className="text-xs text-gray-500 text-center">
                      Showing top 10 of {staffPerformance.length} staff members
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No staff performance data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {fraudStats ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fraud Detection Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Total Alerts</p>
                      <p className="text-3xl font-bold text-gray-900">{fraudStats.totalAlerts}</p>
                    </div>
                    <div className={`text-center p-4 rounded-lg ${
                      fraudStats.criticalAlerts > 0 ? 'bg-red-50' : 'bg-gray-50'
                    }`}>
                      <p className="text-xs text-gray-600 uppercase mb-2">Critical</p>
                      <p className={`text-3xl font-bold ${
                        fraudStats.criticalAlerts > 0 ? 'text-red-700' : 'text-gray-900'
                      }`}>{fraudStats.criticalAlerts}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Investigated</p>
                      <p className="text-3xl font-bold text-gray-900">{fraudStats.investigated}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Investigation Rate</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {fraudStats.totalAlerts > 0 ? ((fraudStats.investigated / fraudStats.totalAlerts) * 100).toFixed(0) : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fraud Cases Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Total Cases</p>
                      <p className="text-2xl font-bold text-gray-900">{fraudStats.totalCases}</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Open Cases</p>
                      <p className="text-2xl font-bold text-yellow-700">{fraudStats.openCases}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Resolved Cases</p>
                      <p className="text-2xl font-bold text-green-700">{fraudStats.resolvedCases}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {Object.keys(fraudStats.byType).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Fraud by Detection Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(fraudStats.byType).map(([type, count]: [string, any]) => {
                        const totalAlerts = fraudStats.totalAlerts;
                        const percentage = (count / totalAlerts) * 100;
                        return (
                          <div key={type} className="flex items-center space-x-3">
                            <div className="w-40 text-xs text-gray-700 font-medium capitalize">
                              {type.replace(/_/g, ' ')}
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                              <div
                                className="bg-red-600 h-6 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${percentage}%` }}
                              >
                                <span className="text-xs font-semibold text-white">{count}</span>
                              </div>
                            </div>
                            <div className="w-16 text-xs text-gray-500 text-right">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No fraud detection data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {systemHealth ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Total Transactions</p>
                      <p className="text-2xl font-bold text-gray-900">{systemHealth.totalTransactions.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Successful</p>
                      <p className="text-2xl font-bold text-green-700">{systemHealth.successfulTransactions.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase mb-2">Avg Processing</p>
                      <p className="text-2xl font-bold text-blue-700">{Math.round(systemHealth.avgProcessingTime)}ms</p>
                    </div>
                    <div className={`text-center p-4 rounded-lg ${
                      systemHealth.errorRate > 5 ? 'bg-red-50' : 'bg-gray-50'
                    }`}>
                      <p className="text-xs text-gray-600 uppercase mb-2">Error Rate</p>
                      <p className={`text-2xl font-bold ${
                        systemHealth.errorRate > 5 ? 'text-red-700' : 'text-gray-900'
                      }`}>{systemHealth.errorRate.toFixed(2)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">System Uptime</span>
                      <span className="text-2xl font-bold text-gray-900">{systemHealth.uptime.toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-6 rounded-full flex items-center justify-end pr-2 ${
                          systemHealth.uptime >= 99 ? 'bg-green-600' :
                          systemHealth.uptime >= 95 ? 'bg-blue-600' :
                          systemHealth.uptime >= 90 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${systemHealth.uptime}%` }}
                      >
                        <span className="text-xs font-semibold text-white">{systemHealth.uptime.toFixed(2)}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Processing Speed</p>
                        <p className={`text-lg font-bold ${
                          systemHealth.avgProcessingTime < 500 ? 'text-green-700' :
                          systemHealth.avgProcessingTime < 1000 ? 'text-blue-700' :
                          systemHealth.avgProcessingTime < 2000 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {systemHealth.avgProcessingTime < 500 ? 'Excellent' :
                           systemHealth.avgProcessingTime < 1000 ? 'Good' :
                           systemHealth.avgProcessingTime < 2000 ? 'Fair' : 'Needs Attention'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Reliability</p>
                        <p className={`text-lg font-bold ${
                          systemHealth.errorRate < 1 ? 'text-green-700' :
                          systemHealth.errorRate < 3 ? 'text-blue-700' :
                          systemHealth.errorRate < 5 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {systemHealth.errorRate < 1 ? 'Excellent' :
                           systemHealth.errorRate < 3 ? 'Good' :
                           systemHealth.errorRate < 5 ? 'Fair' : 'Poor'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No system health data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          {/* Comprehensive Business Analytics */}
          {businessAnalytics ? (
            <>
              {/* Event ROI Analysis */}
              {businessAnalytics.eventROI && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Event ROI Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-900 uppercase mb-2">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-700">
                          ${(businessAnalytics.eventROI.total_revenue || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-900 uppercase mb-2">Total Costs</p>
                        <p className="text-2xl font-bold text-red-700">
                          ${(businessAnalytics.eventROI.total_costs || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-900 uppercase mb-2">Net Profit</p>
                        <p className="text-2xl font-bold text-blue-700">
                          ${((businessAnalytics.eventROI.total_revenue || 0) - (businessAnalytics.eventROI.total_costs || 0)).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-900 uppercase mb-2">ROI</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {businessAnalytics.eventROI.roi_percentage?.toFixed(1) || 0}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cost Efficiency Analysis */}
              {businessAnalytics.costEfficiency.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost Efficiency Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {businessAnalytics.costEfficiency.map((cost, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{cost.category}</h4>
                            <span className="text-lg font-bold text-gray-900">
                              ${cost.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-600">Cost per Attendee</p>
                              <p className="text-sm font-bold text-gray-900">
                                ${(cost.cost_per_attendee || 0).toFixed(2)}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-600">Efficiency Score</p>
                              <p className="text-sm font-bold text-gray-900">
                                {(cost.efficiency_score || 0).toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-600">Budget Variance</p>
                              <p className={`text-sm font-bold ${
                                (cost.budget_variance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {(cost.budget_variance || 0) > 0 ? '+' : ''}{(cost.budget_variance || 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quality of Service Metrics */}
              {businessAnalytics.qualityOfService && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quality of Service Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-900 uppercase mb-2">SLA Compliance</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {(businessAnalytics.qualityOfService.sla_compliance || 0).toFixed(1)}%
                        </p>
                        <p className="text-xs text-blue-600 mt-1">Target: 95%</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-900 uppercase mb-2">Customer Satisfaction</p>
                        <p className="text-2xl font-bold text-green-700">
                          {(businessAnalytics.qualityOfService.satisfaction_score || 0).toFixed(1)}/5
                        </p>
                        <p className="text-xs text-green-600 mt-1">Avg rating</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-900 uppercase mb-2">Service Quality</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {(businessAnalytics.qualityOfService.service_quality_score || 0).toFixed(1)}%
                        </p>
                        <p className="text-xs text-purple-600 mt-1">Composite score</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-xs text-orange-900 uppercase mb-2">Response Time</p>
                        <p className="text-2xl font-bold text-orange-700">
                          {(businessAnalytics.qualityOfService.avg_response_time || 0).toFixed(0)}ms
                        </p>
                        <p className="text-xs text-orange-600 mt-1">Average</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Event Benchmarking */}
              {businessAnalytics.benchmarking.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Event Performance Benchmarking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {businessAnalytics.benchmarking.slice(0, 5).map((benchmark, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{benchmark.event_name}</h4>
                            <span className="text-sm text-gray-600">
                              {new Date(benchmark.event_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-600">Attendance Rate</p>
                              <p className={`text-sm font-bold ${
                                benchmark.attendance_rate >= analytics?.checkInRate ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {benchmark.attendance_rate?.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-600">Gate Health</p>
                              <p className={`text-sm font-bold ${
                                benchmark.avg_gate_health >= eventHealth ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {benchmark.avg_gate_health?.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-600">Processing Time</p>
                              <p className={`text-sm font-bold ${
                                benchmark.avg_processing_time >= (systemHealth?.avgProcessingTime || 0) ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {benchmark.avg_processing_time?.toFixed(0)}ms
                              </p>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-600">Overall Score</p>
                              <p className={`text-sm font-bold ${
                                benchmark.overall_score >= eventHealth ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {benchmark.overall_score?.toFixed(1)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Predictive Forecasting */}
              {businessAnalytics.predictiveForecasting.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Predictive Analytics & Forecasting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {businessAnalytics.predictiveForecasting.map((prediction, idx) => (
                        <div key={idx} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-blue-900 capitalize">
                              {prediction.prediction_type.replace('_', ' ')}
                            </h4>
                            <span className="text-sm text-blue-700">
                              {(prediction.confidence_score * 100).toFixed(1)}% Confidence
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-white rounded">
                              <p className="text-xs text-blue-600">Predicted Value</p>
                              <p className="text-lg font-bold text-blue-900">
                                {typeof prediction.prediction_data === 'object' 
                                  ? JSON.stringify(prediction.prediction_data).slice(0, 20) + '...'
                                  : prediction.prediction_data
                                }
                              </p>
                            </div>
                            <div className="text-center p-3 bg-white rounded">
                              <p className="text-xs text-blue-600">Accuracy</p>
                              <p className="text-lg font-bold text-blue-900">
                                {prediction.accuracy ? (prediction.accuracy * 100).toFixed(1) + '%' : 'N/A'}
                              </p>
                            </div>
                            <div className="text-center p-3 bg-white rounded">
                              <p className="text-xs text-blue-600">Created</p>
                              <p className="text-lg font-bold text-blue-900">
                                {new Date(prediction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Business analytics data is being processed...</p>
                <p className="text-sm text-gray-500 mt-2">
                  ROI calculations, cost analysis, and benchmarking will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SafeAnalyticsDashboard;
