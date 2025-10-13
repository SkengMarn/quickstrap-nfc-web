import { supabase } from './supabase';
import {
  MLModel,
  Prediction,
  ModelType,
  PredictionRequest
} from '../types/phase2';

// ============================================================================
// MACHINE LEARNING & PREDICTIVE ANALYTICS SERVICE
// ============================================================================

export const mlService = {
  // ==========================================================================
  // ML MODELS
  // ==========================================================================

  /**
   * Get all ML models for an organization
   */
  async getModels(organizationId: string, modelType?: ModelType): Promise<MLModel[]> {
    let query = supabase
      .from('ml_models')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (modelType) {
      query = query.eq('model_type', modelType);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as MLModel[];
  },

  /**
   * Get active model by type
   */
  async getActiveModel(organizationId: string, modelType: ModelType): Promise<MLModel | null> {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('model_type', modelType)
      .eq('status', 'active')
      .order('created_at', { ascending: false})
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data as MLModel;
  },

  // ==========================================================================
  // PREDICTIONS
  // ==========================================================================

  /**
   * Generate attendance prediction
   */
  async predictAttendance(eventId: string): Promise<Prediction> {
    // Get historical data for similar events
    const { data: event } = await supabase
      .from('events')
      .select('*, organization_id')
      .eq('id', eventId)
      .single();

    if (!event) throw new Error('Event not found');

    // Get model
    const model = await this.getActiveModel(event.organization_id, 'attendance_forecast');

    // Simplified prediction logic (in production, would call ML model API)
    const { data: historicalEvents } = await supabase
      .from('events')
      .select('id')
      .eq('organization_id', event.organization_id)
      .eq('lifecycle_status', 'closed')
      .limit(10);

    let avgAttendance = 0;
    if (historicalEvents && historicalEvents.length > 0) {
      for (const histEvent of historicalEvents) {
        const { data: metrics } = await supabase
          .from('event_metrics_cache')
          .select('unique_attendees')
          .eq('event_id', histEvent.id)
          .single();

        if (metrics) {
          avgAttendance += metrics.unique_attendees;
        }
      }
      avgAttendance = avgAttendance / historicalEvents.length;
    }

    // Create prediction
    const prediction = {
      model_id: model?.id || 'default',
      event_id: eventId,
      prediction_type: 'attendance_forecast',
      prediction_data: {
        predicted_attendance: Math.round(avgAttendance * 1.1), // 10% growth estimate
        predicted_peak_hour: new Date(event.start_date).setHours(19, 0, 0, 0).toString()
      },
      confidence_score: model ? 0.75 : 0.5,
      prediction_for: event.start_date,
      valid_until: event.end_date
    };

    const { data, error } = await supabase
      .from('predictions')
      .insert(prediction)
      .select()
      .single();

    if (error) throw error;
    return data as Prediction;
  },

  /**
   * Generate staffing recommendation
   */
  async predictStaffing(eventId: string): Promise<Prediction> {
    const { data: event } = await supabase
      .from('events')
      .select('*, organization_id')
      .eq('id', eventId)
      .single();

    if (!event) throw new Error('Event not found');

    // Simplified staffing calculation
    const capacity = event.total_capacity || 1000;
    const recommendedStaff = Math.max(5, Math.ceil(capacity / 200)); // 1 staff per 200 attendees

    const prediction = {
      model_id: 'default',
      event_id: eventId,
      prediction_type: 'staffing_recommendation',
      prediction_data: {
        recommended_staff_count: recommendedStaff,
        peak_hour_staff: Math.ceil(recommendedStaff * 1.5)
      },
      confidence_score: 0.70,
      prediction_for: event.start_date
    };

    const { data, error } = await supabase
      .from('predictions')
      .insert(prediction)
      .select()
      .single();

    if (error) throw error;
    return data as Prediction;
  },

  /**
   * Detect anomalies in real-time data
   */
  async detectAnomalies(eventId: string): Promise<{
    hasAnomalies: boolean;
    anomalies: Array<{
      type: string;
      severity: string;
      description: string;
      value: number;
    }>;
  }> {
    // Get current event metrics
    const { data: metrics } = await supabase
      .from('event_metrics_cache')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (!metrics) {
      return { hasAnomalies: false, anomalies: [] };
    }

    const anomalies: Array<any> = [];

    // Check for unusual check-in rate
    if (metrics.checkin_rate > 95) {
      anomalies.push({
        type: 'high_checkin_rate',
        severity: 'medium',
        description: 'Unusually high check-in rate detected',
        value: metrics.checkin_rate
      });
    }

    // Check for slow processing times
    if (metrics.avg_processing_time_ms > 1000) {
      anomalies.push({
        type: 'slow_processing',
        severity: 'high',
        description: 'Average processing time exceeds threshold',
        value: metrics.avg_processing_time_ms
      });
    }

    // Check for unusual fraud alerts
    if (metrics.critical_fraud_alerts > 10) {
      anomalies.push({
        type: 'fraud_spike',
        severity: 'critical',
        description: 'Unusual spike in critical fraud alerts',
        value: metrics.critical_fraud_alerts
      });
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies
    };
  },

  /**
   * Get predictions for an event
   */
  async getPredictions(eventId: string): Promise<Prediction[]> {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false});

    if (error) throw error;
    return data as Prediction[];
  },

  /**
   * Generate all predictions for an event
   */
  async generateAllPredictions(eventId: string): Promise<{
    attendance: Prediction;
    staffing: Prediction;
    anomalies: any;
  }> {
    const [attendance, staffing, anomalies] = await Promise.all([
      this.predictAttendance(eventId),
      this.predictStaffing(eventId),
      this.detectAnomalies(eventId)
    ]);

    return { attendance, staffing, anomalies };
  }
};

export default mlService;
