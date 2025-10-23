import { supabase } from './supabase';

// Types for autonomous operations
export interface AutoEvent {
  id: string;
  type: 'gate_creation' | 'gate_merge' | 'threshold_adjustment' | 'anomaly_detection' | 'performance_optimization';
  timestamp: string;
  confidence: number;
  details: {
    action: string;
    reasoning: string;
    impact: string;
    metadata: Record<string, any>;
  };
}

export interface AutoGateView {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'learning' | 'optimizing' | 'maintenance';
  confidence_score: number;
  last_decision: string;
  decisions_today: number;
  accuracy_rate: number;
  created_at: string;
  updated_at: string;
  confidence_history: number[];
  performance_metrics: {
    avg_response_time: number;
    total_processed: number;
    success_rate: number;
  };
}

export interface AutoMergeEvent {
  id: string;
  primary_gate_id: string;
  secondary_gate_id: string;
  confidence: number;
  reasoning: string;
  suggested_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_applied';
}

export interface SystemHealthAuto {
  autoHealingRate: number;
  interventionRequired: number;
  lastAutoCleanup: Date;
  issuesAutoResolved: number;
  nextMaintenanceCycle: Date;
  uptime: number;
  selfRecoveryCount: number;
}

export interface AutonomousPerformance {
  decisionsPerHour: number;
  accuracyRate: number;
  falsePositiveRate: number;
  autoCorrections: number;
  learningVelocity: number;
  totalDecisions: number;
  validatedDecisions: number;
}

export interface PredictiveInsight {
  id: string;
  type: 'capacity_warning' | 'peak_prediction' | 'bottleneck_alert' | 'optimization_suggestion';
  message: string;
  confidence: number;
  predicted_time: string;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  suggested_actions: string[];
}

export interface EventAutoDetection {
  eventType: string;
  gateStrategy: string;
  adaptedAt: Date;
  confidence: number;
  reasoning: string;
  detectedAt: string;
  expectedGateCount: number;
}

export interface AdaptiveThresholds {
  duplicateDistance: number;
  promotionSampleSize: number;
  confidenceThreshold: number;
  lastOptimization: Date;
  optimizationHistory: Array<{
    timestamp: string;
    changes: Record<string, any>;
    performance_impact: number;
  }>;
}

export class AutonomousService {
  private static instance: AutonomousService;

  static getInstance(): AutonomousService {
    if (!AutonomousService.instance) {
      AutonomousService.instance = new AutonomousService();
    }
    return AutonomousService.instance;
  }

  // Subscribe to real-time AI events
  subscribeToAIEvents(callback: (event: AutoEvent) => void): () => void {
    const channel = supabase
      .channel('autonomous_events_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'autonomous_events'
        },
        (payload: any) => {
          const record = payload.new;
          const event: AutoEvent = {
            id: record.id,
            type: record.event_type,
            timestamp: record.created_at,
            confidence: Number(record.confidence_score) || 0,
            details: {
              action: record.action,
              reasoning: record.reasoning || '',
              impact: record.impact || '',
              metadata: record.metadata || {}
            }
          };
          callback(event);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Fetch autonomous gates
  async fetchAutoGates(): Promise<AutoGateView[]> {
    try {
      const { data, error } = await supabase
        .from('autonomous_gates')
        .select(`
          *,
          gate:gates(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((ag: any) => ({
        id: ag.id,
        name: ag.gate?.name || 'Unknown Gate',
        location: ag.gate?.location || 'Unknown Location',
        status: ag.status as any,
        confidence_score: Number(ag.confidence_score) || 0,
        last_decision: ag.last_decision_at || new Date().toISOString(),
        decisions_today: ag.decisions_today || 0,
        accuracy_rate: Number(ag.accuracy_rate) || 0,
        created_at: ag.created_at,
        updated_at: ag.updated_at,
        confidence_history: Array.isArray(ag.confidence_history) ? ag.confidence_history : [],
        performance_metrics: {
          avg_response_time: ag.avg_response_time_ms || 0,
          total_processed: ag.total_processed || 0,
          success_rate: Number(ag.success_rate) || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching autonomous gates:', error);
      return [];
    }
  }

  // Fetch merge events
  async fetchMergeEvents(): Promise<AutoMergeEvent[]> {
    try {
      const { data, error } = await supabase
        .from('gate_merge_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('suggested_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((merge: any) => ({
        id: merge.id,
        primary_gate_id: merge.primary_gate_id,
        secondary_gate_id: merge.secondary_gate_id,
        confidence: Number(merge.confidence_score) || 0,
        reasoning: merge.reasoning || '',
        suggested_at: merge.suggested_at,
        status: merge.status
      }));
    } catch (error) {
      console.error('Error fetching merge events:', error);
      return [];
    }
  }

  // Fetch system health
  async fetchSystemHealth(): Promise<SystemHealthAuto> {
    try {
      // Get latest health log
      const { data, error } = await supabase
        .from('system_health_logs')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      if (!data) {
        // Return default values if no data exists
        return {
          autoHealingRate: 0,
          interventionRequired: 0,
          lastAutoCleanup: new Date(),
          issuesAutoResolved: 0,
          nextMaintenanceCycle: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          uptime: 100,
          selfRecoveryCount: 0
        };
      }

      return {
        autoHealingRate: Number(data.auto_healing_rate) * 100 || 0,
        interventionRequired: data.intervention_required || 0,
        lastAutoCleanup: new Date(data.last_auto_cleanup_at || Date.now()),
        issuesAutoResolved: data.issues_auto_resolved || 0,
        nextMaintenanceCycle: new Date(data.next_maintenance_cycle_at || Date.now() + 7 * 24 * 60 * 60 * 1000),
        uptime: Number(data.uptime_percentage) * 100 || 100,
        selfRecoveryCount: data.self_recovery_count || 0
      };
    } catch (error) {
      console.error('Error fetching system health:', error);
      // Return safe defaults
      return {
        autoHealingRate: 0,
        interventionRequired: 0,
        lastAutoCleanup: new Date(),
        issuesAutoResolved: 0,
        nextMaintenanceCycle: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        uptime: 100,
        selfRecoveryCount: 0
      };
    }
  }

  // Fetch performance metrics
  async fetchPerformanceMetrics(): Promise<AutonomousPerformance> {
    try {
      // Calculate from autonomous_events
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const [eventsResult, validatedResult] = await Promise.all([
        supabase
          .from('autonomous_events')
          .select('id, event_type, confidence_score, created_at, reviewed_at, review_status')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('autonomous_events')
          .select('id')
          .not('review_status', 'is', null)
      ]);

      const events = eventsResult.data || [];
      const validated = validatedResult.data || [];

      // Events in the last hour
      const eventsLastHour = events.filter(e => e.created_at >= oneHourAgo).length;
      const decisionsPerHour = eventsLastHour > 0 ? eventsLastHour : 0;

      // Calculate accuracy from reviewed events
      const reviewedEvents = events.filter(e => e.review_status);
      const approvedEvents = reviewedEvents.filter(e => e.review_status === 'approved');
      const accuracyRate = reviewedEvents.length > 0
        ? (approvedEvents.length / reviewedEvents.length)
        : 0;

      // False positive rate (rejected / reviewed)
      const rejectedEvents = reviewedEvents.filter(e => e.review_status === 'rejected');
      const falsePositiveRate = reviewedEvents.length > 0
        ? (rejectedEvents.length / reviewedEvents.length)
        : 0;

      // Auto corrections (performance_optimization events)
      const autoCorrections = events.filter(e =>
        (e as any).event_type === 'performance_optimization' ||
        (e as any).event_type === 'auto_correction'
      ).length;

      // Learning velocity (improvement in confidence over time)
      const recentEvents = events.slice(0, 100);
      const avgRecentConfidence = recentEvents.length > 0
        ? recentEvents.reduce((sum, e) => sum + (Number(e.confidence_score) || 0), 0) / recentEvents.length
        : 0;
      const olderEvents = events.slice(100, 200);
      const avgOlderConfidence = olderEvents.length > 0
        ? olderEvents.reduce((sum, e) => sum + (Number(e.confidence_score) || 0), 0) / olderEvents.length
        : 0;
      const learningVelocity = Math.max(0, avgRecentConfidence - avgOlderConfidence);

      return {
        decisionsPerHour,
        accuracyRate: accuracyRate * 100,
        falsePositiveRate: falsePositiveRate * 100,
        autoCorrections,
        learningVelocity: learningVelocity * 100,
        totalDecisions: events.length,
        validatedDecisions: validated.length
      };
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return {
        decisionsPerHour: 0,
        accuracyRate: 0,
        falsePositiveRate: 0,
        autoCorrections: 0,
        learningVelocity: 0,
        totalDecisions: 0,
        validatedDecisions: 0
      };
    }
  }

  // Fetch recent autonomous events
  async fetchRecentEvents(limit: number = 10): Promise<AutoEvent[]> {
    try {
      const { data, error } = await supabase
        .from('autonomous_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((event: any) => ({
        id: event.id,
        type: event.event_type,
        timestamp: event.created_at,
        confidence: Number(event.confidence_score) || 0,
        details: {
          action: event.action,
          reasoning: event.reasoning || '',
          impact: event.impact || '',
          metadata: event.metadata || {}
        }
      }));
    } catch (error) {
      console.error('Error fetching recent events:', error);
      return [];
    }
  }

  // Fetch predictive insights
  async fetchPredictiveInsights(): Promise<PredictiveInsight[]> {
    try {
      const { data, error } = await supabase
        .from('predictive_insights')
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((insight: any) => ({
        id: insight.id,
        type: insight.insight_type,
        message: insight.message,
        confidence: Number(insight.confidence_score) || 0,
        predicted_time: insight.predicted_time,
        impact_level: insight.impact_level,
        suggested_actions: Array.isArray(insight.suggested_actions) ? insight.suggested_actions : []
      }));
    } catch (error) {
      console.error('Error fetching predictive insights:', error);
      return [];
    }
  }

  // Fetch event auto-detection
  async fetchEventAutoDetection(): Promise<EventAutoDetection | null> {
    try {
      // This would be based on analyzing current event patterns
      // For now, return null if no auto-detection is available
      const { data, error } = await supabase
        .from('autonomous_events')
        .select('*')
        .eq('event_type', 'anomaly_detection')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      const metadata = data.metadata || {};
      return {
        eventType: metadata.event_type || 'Unknown',
        gateStrategy: metadata.gate_strategy || 'Standard',
        adaptedAt: new Date(data.created_at),
        confidence: Number(data.confidence_score) || 0,
        reasoning: data.reasoning || '',
        detectedAt: data.created_at,
        expectedGateCount: metadata.expected_gate_count || 0
      };
    } catch (error) {
      console.error('Error fetching event auto-detection:', error);
      return null;
    }
  }

  // Fetch adaptive thresholds
  async fetchAdaptiveThresholds(): Promise<AdaptiveThresholds> {
    try {
      const { data, error } = await supabase
        .from('adaptive_thresholds')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Return default thresholds
        return {
          duplicateDistance: 25,
          promotionSampleSize: 100,
          confidenceThreshold: 0.85,
          lastOptimization: new Date(),
          optimizationHistory: []
        };
      }

      return {
        duplicateDistance: data.duplicate_distance_meters || 25,
        promotionSampleSize: data.promotion_sample_size || 100,
        confidenceThreshold: Number(data.confidence_threshold) || 0.85,
        lastOptimization: new Date(data.last_optimization_at),
        optimizationHistory: Array.isArray(data.optimization_history) ? data.optimization_history : []
      };
    } catch (error) {
      console.error('Error fetching adaptive thresholds:', error);
      return {
        duplicateDistance: 25,
        promotionSampleSize: 100,
        confidenceThreshold: 0.85,
        lastOptimization: new Date(),
        optimizationHistory: []
      };
    }
  }

  // NOTE: Mock event generator removed - now using real autonomous_events from database
  // To create test events, insert directly into the autonomous_events table via SQL or Supabase dashboard
}

export const autonomousService = new AutonomousService();
