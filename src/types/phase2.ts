// ============================================================================
// PHASE 2 INTELLIGENCE TYPES
// ============================================================================

// ============================================================================
// 1. EVENT TEMPLATES & CLONING
// ============================================================================

export type EventTemplateCategory = 'festival' | 'conference' | 'wedding' | 'sports' | 'corporate' | 'other';

export interface EventTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: EventTemplateCategory | null;

  // Template configuration
  template_data: {
    name?: string;
    location?: string;
    capacity?: number;
    config?: Record<string, any>;
    settings?: Record<string, any>;
  };

  // Visibility
  is_public: boolean;
  is_featured: boolean;
  usage_count: number;

  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined data
  gates?: TemplateGate[];
  categories?: TemplateWristbandCategory[];
}

export interface TemplateGate {
  id: string;
  template_id: string;
  name: string;
  gate_type: string | null;
  location_description: string | null;
  category_bindings: any[];
  sort_order: number;
  created_at: string;
}

export interface TemplateWristbandCategory {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  color: string | null;
  max_capacity: number | null;
  sort_order: number;
  created_at: string;
}

export interface EventClone {
  id: string;
  source_event_id: string | null;
  source_template_id: string | null;
  cloned_event_id: string;

  // What was cloned
  cloned_settings: boolean;
  cloned_gates: boolean;
  cloned_categories: boolean;
  cloned_wristbands: boolean;

  cloned_by: string | null;
  cloned_at: string;
}

export interface CloneEventRequest {
  source_event_id?: string;
  source_template_id?: string;
  new_event_data: {
    name: string;
    start_date: string;
    end_date: string;
    location?: string;
  };
  clone_options: {
    clone_settings?: boolean;
    clone_gates?: boolean;
    clone_categories?: boolean;
    clone_wristbands?: boolean;
  };
}

// ============================================================================
// 2. INTELLIGENT CACHING
// ============================================================================

export interface EventMetricsCache {
  id: string;
  event_id: string;

  // Attendance metrics
  total_wristbands: number;
  total_checkins: number;
  unique_attendees: number;
  checkin_rate: number; // Percentage

  // Time metrics
  peak_hour: string | null;
  peak_hour_checkins: number;
  avg_checkins_per_hour: number;

  // Performance metrics
  avg_processing_time_ms: number;
  total_processing_time_ms: number;

  // Gate metrics
  total_gates: number;
  active_gates: number;
  avg_gate_health: number;

  // Fraud metrics
  total_fraud_alerts: number;
  critical_fraud_alerts: number;

  // Cache metadata
  last_computed_at: string;
  computation_time_ms: number | null;

  created_at: string;
  updated_at: string;
}

export interface GatePerformanceCache {
  id: string;
  gate_id: string;
  event_id: string;

  // Performance metrics
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  avg_scan_time_ms: number;

  // Time analysis
  peak_hour: string | null;
  peak_hour_scans: number;
  scans_per_hour: number;

  // Health
  health_score: number;
  last_scan_at: string | null;
  uptime_percentage: number;

  last_computed_at: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryAnalyticsCache {
  id: string;
  event_id: string;
  category: string;

  // Category metrics
  total_wristbands: number;
  total_checkins: number;
  unique_attendees: number;
  checkin_rate: number;

  // Time distribution
  checkins_by_hour: Record<string, number>;

  // Gate distribution
  checkins_by_gate: Record<string, number>;

  last_computed_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 3. ADVANCED FRAUD PREVENTION
// ============================================================================

export type FraudRuleType =
  | 'multiple_checkins'
  | 'velocity_check'
  | 'impossible_location'
  | 'time_pattern'
  | 'category_mismatch'
  | 'blacklist_check'
  | 'custom';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface FraudRule {
  id: string;
  organization_id: string | null;
  event_id: string | null;

  // Rule info
  name: string;
  description: string | null;
  rule_type: FraudRuleType;

  // Configuration
  config: {
    threshold?: number;
    time_window_minutes?: number;
    distance_meters?: number;
    allowed_categories?: string[];
    custom_logic?: string;
    max_velocity_kmh?: number;
    suspicious_hours?: number[];
  };

  // Scoring
  risk_score: number; // 0-100

  // Actions
  auto_block: boolean;
  auto_alert: boolean;
  alert_severity: AlertSeverity;

  // Status
  is_active: boolean;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FraudCaseStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'false_positive';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface FraudCase {
  id: string;
  event_id: string;
  fraud_detection_id: string | null;

  // Case info
  case_number: string;
  title: string;
  description: string | null;

  // Status
  status: FraudCaseStatus;
  priority: CasePriority;

  // Assignment
  assigned_to: string | null;
  assigned_at: string | null;

  // Resolution
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;

  // Evidence
  evidence: Array<{
    type: string;
    description: string;
    data: any;
    timestamp: string;
  }>;

  // Related entities
  wristband_ids: string[] | null;
  user_ids: string[] | null;

  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined data
  assigned_user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export type WatchlistEntityType = 'wristband' | 'email' | 'phone' | 'ip_address';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface WatchlistEntry {
  id: string;
  organization_id: string | null;

  // Entity info
  entity_type: WatchlistEntityType;
  entity_value: string;

  // Reason
  reason: string;
  risk_level: RiskLevel;

  // Actions
  auto_block: boolean;
  auto_flag: boolean;

  // Related
  related_case_ids: string[] | null;

  // Status
  is_active: boolean;
  expires_at: string | null;

  // Metadata
  added_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 4. PREDICTIVE ANALYTICS & ML
// ============================================================================

export type ModelType =
  | 'attendance_forecast'
  | 'staffing_recommendation'
  | 'fraud_detection'
  | 'gate_optimization'
  | 'anomaly_detection';

export type ModelStatus = 'training' | 'active' | 'deprecated' | 'failed';

export interface MLModel {
  id: string;
  organization_id: string | null;

  // Model info
  name: string;
  model_type: ModelType;
  version: string;

  // Configuration
  algorithm: string | null;
  hyperparameters: Record<string, any>;

  // Training info
  training_dataset_size: number | null;
  training_started_at: string | null;
  training_completed_at: string | null;
  training_duration_seconds: number | null;

  // Performance metrics
  accuracy: number | null;
  precision_score: number | null;
  recall_score: number | null;
  f1_score: number | null;
  mean_absolute_error: number | null;

  // Model file
  model_storage_path: string | null;
  model_size_bytes: number | null;

  // Status
  status: ModelStatus;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: string;
  model_id: string;
  event_id: string | null;

  // Prediction details
  prediction_type: string;
  prediction_data: {
    predicted_attendance?: number;
    predicted_peak_hour?: string;
    recommended_staff_count?: number;
    fraud_probability?: number;
    optimal_gate_count?: number;
    anomaly_score?: number;
  };

  // Confidence
  confidence_score: number | null;

  // Time window
  prediction_for: string | null;
  valid_until: string | null;

  // Accuracy tracking
  actual_outcome: any | null;
  accuracy: number | null;

  created_at: string;
}

export type TrainingDataType =
  | 'attendance_pattern'
  | 'fraud_pattern'
  | 'gate_performance'
  | 'staffing_effectiveness';

export interface TrainingData {
  id: string;
  organization_id: string | null;

  // Data type
  data_type: TrainingDataType;

  // Feature vector
  features: Record<string, any>;

  // Label (for supervised learning)
  label: any | null;

  // Source
  source_event_id: string | null;

  // Quality
  is_validated: boolean;
  quality_score: number | null;

  created_at: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface CreateTemplateRequest {
  organization_id: string;
  name: string;
  description?: string;
  category?: EventTemplateCategory;
  source_event_id?: string;
}

export interface CreateFraudCaseRequest {
  event_id: string;
  fraud_detection_id?: string;
  title: string;
  description?: string;
  priority: CasePriority;
  wristband_ids?: string[];
}

export interface WatchlistAddRequest {
  organization_id: string;
  entity_type: WatchlistEntityType;
  entity_value: string;
  reason: string;
  risk_level: RiskLevel;
  auto_block?: boolean;
  notes?: string;
}

export interface PredictionRequest {
  event_id: string;
  prediction_type: 'attendance' | 'staffing' | 'fraud' | 'gate_optimization';
  prediction_for?: string; // ISO timestamp
}
