// Comprehensive Portal Types - All Phases

// ============================================================================
// PHASE 1: PRE-EVENT SETUP
// ============================================================================

// 1.1 Advanced Event Creation
export interface EventConfig {
  // Security Configuration
  security_mode: 'disabled' | 'optional' | 'required';

  // Gate Behavior Settings
  gate_settings: {
    auto_create_gates: boolean;
    enforce_category_assignments: boolean;
    default_scan_mode: 'single' | 'continuous';
  };

  // Capacity & Alerts
  capacity_settings: {
    max_capacity: number;
    alerts_enabled: boolean;
    alert_threshold: number; // percentage
    alert_recipients: string[]; // emails
  };

  // Check-in Window
  checkin_window?: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };

  // Emergency Controls
  emergency_stop?: boolean;

  // Custom settings
  [key: string]: any;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  location?: string;
  capacity?: number;
  is_public: boolean;
  logo_url?: string;
  config: EventConfig;
  status: 'draft' | 'active' | 'completed' | 'archived';
  test_mode: boolean;
  archived_at?: string;
  check_ins_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventCreationStep {
  step: number;
  title: string;
  description: string;
  isValid: boolean;
}

export const EVENT_CREATION_STEPS: EventCreationStep[] = [
  { step: 1, title: 'Basic Information', description: 'Event details and branding', isValid: false },
  { step: 2, title: 'Security Configuration', description: 'Ticket linking and access control', isValid: false },
  { step: 3, title: 'Gate Behavior', description: 'How gates should operate', isValid: false },
  { step: 4, title: 'Capacity & Alerts', description: 'Limits and notifications', isValid: false },
  { step: 5, title: 'Check-in Window', description: 'When check-ins are allowed', isValid: false },
  { step: 6, title: 'Review & Create', description: 'Confirm all settings', isValid: false },
];

// 1.2 Staff Assignment & Access Control
export type AccessLevel = 'admin' | 'scanner' | 'read-only';

export interface EventAccess {
  id: string;
  event_id: string;
  user_id: string;
  access_level: AccessLevel;
  is_active: boolean;
  invited_by?: string;
  invited_at: string;
  accepted_at?: string;
  last_activity?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface StaffGateAssignment {
  id: string;
  event_id: string;
  staff_id: string;
  gate_id: string;
  shift_start: string;
  shift_end: string;
  status: 'assigned' | 'active' | 'completed' | 'no-show';
  created_at: string;
  updated_at: string;
  // Joined data
  staff?: {
    email: string;
    full_name?: string;
  };
  gate?: {
    name: string;
    location_description?: string;
  };
}

export interface StaffInvitation {
  email: string;
  access_level: AccessLevel;
  personal_message?: string;
}

// 1.3 Enhanced Wristband Management
export interface Category {
  id: string;
  name: string;
  color?: string;
  description?: string;
  gate_preferences?: string[]; // gate IDs
  hierarchy_parent?: string;
  created_at: string;
  updated_at: string;
}

export interface Wristband {
  id: string;
  nfc_id: string;
  event_id: string;
  category?: string;
  category_id?: string;
  status: 'uploaded' | 'activated' | 'checked-in' | 'deactivated';
  status_history?: Array<{
    status: string;
    timestamp: string;
    changed_by?: string;
  }>;
  notes?: string;
  ticket_id?: string;
  attendee_name?: string;
  attendee_email?: string;
  created_at: string;
  updated_at: string;
}

export interface WristbandImport {
  id: string;
  event_id: string;
  user_id: string;
  filename: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  status: 'processing' | 'completed' | 'failed';
  error_log?: Array<{
    row: number;
    field: string;
    error: string;
    value: any;
  }>;
  mapping_template?: {
    [csvColumn: string]: string; // maps to db column
  };
  created_at: string;
  completed_at?: string;
}

export interface CSVValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: Array<{
    row: number;
    field: string;
    error: string;
    value: any;
  }>;
  preview: any[];
}

export interface BulkWristbandOperation {
  action: 'activate' | 'deactivate' | 'delete' | 'change_category' | 'export';
  wristband_ids: string[];
  parameters?: {
    new_category?: string;
    reason?: string;
  };
}

// 1.4 Pre-Event Testing
export interface TestingChecklist {
  staff_invited: boolean;
  staff_accepted: boolean;
  wristbands_uploaded: boolean;
  security_configured: boolean;
  capacity_alerts_tested: boolean;
  app_access_verified: boolean;
  test_checkin_completed: boolean;
}

export interface SimulationConfig {
  enabled: boolean;
  checkin_rate: number; // per minute
  gate_creation_probability: number;
  duration_minutes: number;
}

// ============================================================================
// PHASE 2: LIVE EVENT OPERATIONS
// ============================================================================

// 2.1 Real-Time Command Center
export interface LiveMetrics {
  current_checkins: number;
  capacity_percentage: number;
  active_gates: number;
  staff_online: number;
  checkins_per_hour: number;
  last_updated: string;
}

export interface LiveActivity {
  id: string;
  timestamp: string;
  type: 'checkin' | 'gate_created' | 'fraud_detected' | 'alert' | 'staff_action';
  message: string;
  data?: any;
  severity?: 'info' | 'warning' | 'error';
}

// 2.2 Gate Management
export type GateProbationStatus = 'probation' | 'approved' | 'rejected';

export interface Gate {
  id: string;
  event_id: string;
  name: string;
  status: 'active' | 'idle' | 'error' | 'offline';
  probation_status: GateProbationStatus;
  confidence_score?: number;
  auto_created_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  health_score: number;
  location_description?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number;
  };
  allowed_categories?: string[];
  created_at: string;
  updated_at: string;
}

export interface GateReviewAction {
  gate_id: string;
  action: 'approve' | 'reject' | 'rename' | 'merge' | 'edit_location';
  new_name?: string;
  merge_into_gate_id?: string;
  new_location?: {
    lat: number;
    lng: number;
  };
  reason?: string;
}

export interface GateMerge {
  id: string;
  event_id: string;
  primary_gate_id: string;
  absorbed_gate_ids: string[];
  reason: 'spatial-clustering' | 'manual' | 'duplicate-detection';
  confidence: number;
  checkins_transferred: number;
  decision: 'auto-approved' | 'manual-approved' | 'rejected';
  merged_by?: string;
  created_at: string;
}

export interface GateStats {
  gate_id: string;
  total_scans: number;
  hourly_breakdown: Array<{
    hour: string;
    count: number;
  }>;
  peak_time: string;
  category_distribution: {
    [category: string]: number;
  };
  avg_processing_time_ms: number;
}

// 2.3 Wristband Monitoring & Control
export interface WristbandBlock {
  id: string;
  wristband_id: string;
  event_id?: string;
  reason: string;
  blocked_by?: string;
  blocked_at: string;
  unblocked_at?: string;
  unblocked_by?: string;
}

export interface FraudDetection {
  id: string;
  wristband_id?: string;
  event_id: string;
  detection_type: 'multiple-checkins' | 'impossible-location' | 'blocked-attempt' | 'suspicious-pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    description: string;
    evidence: any;
    confidence: number;
  };
  action_taken: 'blocked' | 'flagged' | 'allowed-with-warning';
  investigated_by?: string;
  investigated_at?: string;
  resolution?: string;
  created_at: string;
}

export interface WristbandControl {
  wristband_id: string;
  action: 'block' | 'unblock' | 'force_checkin' | 'force_checkout' | 'change_category' | 'add_note';
  parameters: {
    reason?: string;
    new_category?: string;
    note?: string;
    override_reason?: string;
  };
}

// 2.4 Staff Performance Monitoring
export interface StaffPerformance {
  id: string;
  event_id: string;
  staff_id: string;
  shift_start?: string;
  shift_end?: string;
  total_scans: number;
  scans_per_hour: number;
  error_count: number;
  avg_scan_time_ms: number;
  efficiency_score: number; // 0-100
  break_time_minutes: number;
  performance_data?: {
    peak_hour?: string;
    slowest_scan_ms?: number;
    fastest_scan_ms?: number;
    current_streak?: number;
  };
  created_at: string;
  updated_at: string;
  // Joined data
  staff?: {
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface StaffMessage {
  id: string;
  event_id?: string;
  from_user_id?: string;
  to_user_id?: string; // null for broadcast
  message_type: 'normal' | 'emergency' | 'assignment';
  message: string;
  read_at?: string;
  created_at: string;
  // Joined data
  from_user?: {
    full_name?: string;
    email: string;
  };
}

// 2.5 Emergency Controls
export interface SystemAlert {
  id: string;
  event_id?: string;
  type: 'capacity' | 'gate_error' | 'fraud' | 'staff' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data?: any;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  resolved_at?: string;
}

export interface EmergencyAction {
  action: 'stop_checkins' | 'resume_checkins' | 'capacity_lockdown' | 'block_category' | 'close_gate' | 'broadcast_alert';
  parameters: {
    reason?: string;
    affected_categories?: string[];
    affected_gates?: string[];
    alert_message?: string;
  };
}

// ============================================================================
// PHASE 3: POST-EVENT ANALYSIS
// ============================================================================

// 3.1 Comprehensive Analytics
export interface EventAnalytics {
  event_id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  unique_attendees: number;
  total_checkins: number;
  last_checkin?: string;
  avg_processing_time: number;
  gates_used: number;
  staff_worked: number;
  category_distribution: {
    [category: string]: number;
  };
  // Additional computed metrics
  peak_attendance_time?: string;
  avg_entry_time?: string;
  capacity_utilization?: number;
  no_show_rate?: number;
}

export interface TimeSeriesData {
  timestamp: string;
  checkins: number;
  cumulative_checkins: number;
}

export interface GatePerformanceComparison {
  gate_id: string;
  gate_name: string;
  total_checkins: number;
  avg_processing_time_ms: number;
  utilization_percentage: number;
  staff_efficiency: number;
  bottleneck_score: number;
}

export interface CategoryInsights {
  category: string;
  total_wristbands: number;
  total_checkins: number;
  no_show_count: number;
  no_show_rate: number;
  avg_checkin_time: string;
  preferred_gates: string[];
}

// 3.2 Export & Reporting
export interface ExportJob {
  id: string;
  event_id?: string;
  user_id: string;
  export_type: 'checkin-log' | 'gate-summary' | 'staff-performance' | 'category-breakdown' | 'custom';
  format: 'csv' | 'pdf' | 'excel';
  filters?: {
    date_range?: { start: string; end: string };
    gates?: string[];
    categories?: string[];
    staff?: string[];
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  expires_at?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface ScheduledReport {
  id: string;
  event_id?: string;
  user_id: string;
  report_type: string;
  schedule: 'daily' | 'weekly' | 'end-of-event' | 'custom';
  format: 'pdf' | 'excel' | 'csv';
  recipients: string[];
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  fields: string[];
  filters?: any;
  format: string;
}

// 3.3 Event Archiving
export interface ArchiveOptions {
  delete_test_data: boolean;
  anonymize_personal_data: boolean; // GDPR compliance
  remove_inactive_wristbands: boolean;
  retention_period_days: number;
}

// ============================================================================
// PHASE 4: SYSTEM ADMINISTRATION
// ============================================================================

// 4.1 User Management & RBAC
export type UserRole = 'super_admin' | 'event_owner' | 'event_admin' | 'staff' | 'read_only';
export type ScopeType = 'global' | 'event' | 'organization';

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role: UserRole;
  scope_type: ScopeType;
  scope_id?: string; // event_id or org_id
  granted_by?: string;
  granted_at: string;
  expires_at?: string;
  // Joined data
  user?: {
    email: string;
    full_name?: string;
  };
  granted_by_user?: {
    email: string;
    full_name?: string;
  };
}

export type ResourceType = 'events' | 'wristbands' | 'gates' | 'staff' | 'analytics' | 'exports' | 'settings';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'export';

export interface Permission {
  id: string;
  role: UserRole;
  resource: ResourceType;
  action: Action;
  allowed: boolean;
  conditions?: {
    only_own?: boolean;
    requires_approval?: boolean;
    [key: string]: any;
  };
}

// 4.2 System Settings
export type SettingCategory = 'general' | 'email' | 'integration' | 'security';

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  category: SettingCategory;
  is_encrypted: boolean;
  description?: string;
  updated_by?: string;
  updated_at: string;
  created_at: string;
}

export interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string; // encrypted
  from_email: string;
  from_name: string;
}

export interface IntegrationSettings {
  api_keys: {
    [service: string]: string;
  };
  webhooks: {
    url: string;
    events: string[];
    secret: string;
  }[];
  oauth_providers: {
    google?: { client_id: string; client_secret: string };
    microsoft?: { client_id: string; client_secret: string };
  };
}

export interface SecuritySettings {
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_number: boolean;
  password_require_special: boolean;
  session_timeout_minutes: number;
  two_factor_required: boolean;
  ip_whitelist: string[];
  max_login_attempts: number;
  lockout_duration_minutes: number;
}

// 4.3 Audit Trail & Compliance
export interface AuditLog {
  id: string;
  user_id?: string;
  event_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Joined data
  user?: {
    email: string;
    full_name?: string;
  };
}

export interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  failure_reason?: string;
  created_at: string;
}

export interface DataRetentionPolicy {
  id: string;
  resource_type: string;
  retention_days: number;
  auto_delete: boolean;
  auto_anonymize: boolean;
  created_at: string;
}

export interface ComplianceReport {
  report_type: 'gdpr' | 'data_access' | 'security_incident' | 'financial';
  period: {
    start: string;
    end: string;
  };
  data: any;
  generated_at: string;
  generated_by: string;
}

// ============================================================================
// REAL-TIME SYNC TYPES
// ============================================================================

export interface RealtimeEvent<T = any> {
  event_type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  old_record?: T;
  new_record?: T;
  timestamp: string;
}

export interface SyncStatus {
  connected: boolean;
  last_sync: string;
  pending_changes: number;
  channels_subscribed: string[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
