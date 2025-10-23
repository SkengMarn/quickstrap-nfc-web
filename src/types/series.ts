// ============================================================================
// EVENT SERIES TYPES
// ============================================================================
// Comprehensive types for the event series system

// ============================================================================
// 1. CORE SERIES TYPES
// ============================================================================

export type SeriesLifecycleStatus =
  | 'draft'      // Being created, not visible
  | 'scheduled'  // Scheduled, visible, waiting for start
  | 'active'     // Currently active and scannable
  | 'completed'  // Finished, no more check-ins
  | 'cancelled'; // Cancelled

export type SeriesType =
  | 'standard'      // Regular series
  | 'knockout'      // Tournament knockout round
  | 'group_stage'   // Tournament group stage
  | 'round_robin'   // Round robin format
  | 'custom';       // Custom type

export type SeriesTemplateType =
  | 'single'        // Single occurrence
  | 'recurring'     // Repeating series
  | 'tournament'    // Tournament structure
  | 'multi_day';    // Multi-day event

export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface RecurrencePattern {
  type: RecurrenceType;
  interval: number;              // Every X days/weeks/months
  end_after_occurrences?: number; // Stop after N occurrences
  end_date?: string;             // Or stop at this date
  days_of_week?: number[];       // For weekly (0=Sunday, 6=Saturday)
  day_of_month?: number;         // For monthly
}

// ============================================================================
// 2. EVENT SERIES
// ============================================================================

export interface EventSeries {
  id: string;
  main_event_id: string;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;

  // Check-in window configuration
  checkin_window_start_offset?: string | null; // PostgreSQL interval
  checkin_window_end_offset?: string | null;

  // Lifecycle & status
  lifecycle_status: SeriesLifecycleStatus;
  status_changed_at: string;
  status_changed_by?: string | null;
  auto_transition_enabled: boolean;

  // Metadata
  sequence_number?: number | null;
  series_type: SeriesType;

  // Location override (can differ from main event)
  location?: string | null;
  venue_id?: string | null;

  // Capacity override
  capacity?: number | null;

  // Recurring series support
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  parent_series_id?: string | null;

  // Configuration
  config?: Record<string, any>;

  // Visibility & access
  is_public: boolean;
  requires_separate_ticket: boolean;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  organization_id: string;

  // Joined data
  main_event?: {
    id: string;
    name: string;
    organization_id: string;
  };
  venue?: {
    id: string;
    name: string;
    venue_type: string;
  };
  parent_series?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// 3. SERIES GATES
// ============================================================================

export interface SeriesGate {
  id: string;
  series_id: string;
  gate_id: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by?: string | null;
  notes?: string | null;

  // Joined data
  series?: EventSeries;
  gate?: {
    id: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    status: string;
  };
}

// ============================================================================
// 4. SERIES CATEGORIES
// ============================================================================

export interface SeriesCategoryLimit {
  id: string;
  series_id: string;
  category: string;
  max_wristbands: number;
  max_capacity?: number | null;
  current_count: number;
  requires_ticket: boolean;
  price?: number | null;
  created_at: string;
  updated_at: string;

  // Joined data
  series?: EventSeries;
}

// ============================================================================
// 5. SERIES WRISTBAND ASSIGNMENTS
// ============================================================================

export type WristbandValidationStatus = 'pending' | 'validated' | 'rejected' | 'expired';

export interface SeriesWristbandAssignment {
  id: string;
  series_id: string;
  wristband_id: string;
  assigned_at: string;
  assigned_by?: string | null;
  is_active: boolean;

  // Validation fields
  validation_status: WristbandValidationStatus;
  validated_at?: string | null;
  validated_by?: string | null;

  // Access tracking
  first_checkin_at?: string | null;
  last_checkin_at?: string | null;
  checkin_count: number;

  // Joined data
  series?: EventSeries;
  wristband?: {
    id: string;
    nfc_id: string;
    category: string;
    is_active: boolean;
    attendee_name?: string | null;
    attendee_email?: string | null;
  };
}

// ============================================================================
// 6. SERIES TICKETS
// ============================================================================

export interface SeriesTicket {
  id: string;
  series_id: string;
  ticket_id: string;
  is_active: boolean;
  linked_at: string;
  linked_by?: string | null;

  // Joined data
  series?: EventSeries;
  ticket?: {
    id: string;
    ticket_number: string;
    ticket_category: string;
    holder_name?: string | null;
    holder_email?: string | null;
    status: string;
  };
}

// ============================================================================
// 7. SERIES METRICS & ANALYTICS
// ============================================================================

export interface SeriesMetricsCache {
  id: string;
  series_id: string;
  total_wristbands: number;
  total_checkins: number;
  unique_attendees: number;
  checkin_rate: number;
  peak_hour?: string | null;
  peak_hour_checkins: number;
  avg_checkins_per_hour: number;
  total_gates: number;
  active_gates: number;
  last_computed_at: string;
  computation_time_ms?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SeriesAnalytics {
  series_id: string;
  series_name: string;
  main_event_id: string;
  main_event_name: string;
  unique_checkins: number;
  total_checkins: number;
  staff_count: number;
  gates_used: number;
  first_checkin?: string | null;
  last_checkin?: string | null;
}

export interface SeriesOverview {
  id: string;
  main_event_id: string;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  lifecycle_status: SeriesLifecycleStatus;
  series_type: SeriesType;
  location?: string | null;
  capacity?: number | null;
  is_recurring: boolean;
  organization_id: string;
  main_event_name: string;
  assigned_wristbands: number;
  assigned_gates: number;
  category_count: number;
  is_within_window: boolean;
}

export interface SeriesWithMetrics extends EventSeries {
  total_wristbands?: number;
  total_checkins?: number;
  unique_attendees?: number;
  checkin_rate?: number;
  peak_hour?: string | null;
  peak_hour_checkins?: number;
  total_gates?: number;
  active_gates?: number;
  last_computed_at?: string;
}

// ============================================================================
// 8. SERIES TEMPLATES
// ============================================================================

export interface CategoryTemplate {
  name: string;
  max: number;
  max_capacity?: number;
  requires_ticket?: boolean;
  price?: number;
}

export interface GateConfigurationTemplate {
  name: string;
  type?: string;
  location_description?: string;
  category_bindings?: string[];
}

export interface SeriesTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  template_type: SeriesTemplateType;

  // Template configuration
  default_series_type: SeriesType;
  default_checkin_window_start?: string | null;
  default_checkin_window_end?: string | null;
  default_capacity?: number | null;

  // Category templates
  categories: CategoryTemplate[];

  // Gate templates
  gate_configurations: GateConfigurationTemplate[];

  // Recurrence template
  recurrence_pattern?: RecurrencePattern | null;

  // Settings
  is_public: boolean;
  usage_count: number;

  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

// ============================================================================
// 9. SERIES STATE TRANSITIONS
// ============================================================================

export interface SeriesStateTransition {
  id: string;
  series_id: string;
  from_status?: SeriesLifecycleStatus | null;
  to_status: SeriesLifecycleStatus;
  changed_by?: string | null;
  reason?: string | null;
  automated: boolean;
  created_at: string;

  // Joined data
  series?: EventSeries;
  changed_by_user?: {
    id: string;
    email: string;
    full_name?: string | null;
  };
}

// ============================================================================
// 10. API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateSeriesRequest {
  main_event_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  checkin_window_start_offset?: string;
  checkin_window_end_offset?: string;
  sequence_number?: number;
  series_type?: SeriesType;
  location?: string;
  venue_id?: string;
  capacity?: number;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  config?: Record<string, any>;
  is_public?: boolean;
  requires_separate_ticket?: boolean;
}

export interface UpdateSeriesRequest {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  checkin_window_start_offset?: string;
  checkin_window_end_offset?: string;
  lifecycle_status?: SeriesLifecycleStatus;
  sequence_number?: number;
  series_type?: SeriesType;
  location?: string;
  venue_id?: string;
  capacity?: number;
  config?: Record<string, any>;
  is_public?: boolean;
  requires_separate_ticket?: boolean;
}

export interface AssignWristbandsToSeriesRequest {
  series_id: string;
  wristband_ids: string[];
}

export interface BulkAssignByCategoryRequest {
  series_id: string;
  event_id: string;
  categories: string[];
}

export interface BulkAssignByTicketsRequest {
  series_id: string;
  event_id: string;
  ticket_numbers: string[];
}

export interface CreateRecurringSeriesRequest {
  parent_series_id: string;
  occurrences: number;
}

// ============================================================================
// 11. HELPER TYPES
// ============================================================================

export interface ScannableItem {
  item_id: string;
  item_type: 'event' | 'series';
  item_name: string;
  main_event_name: string;
  start_date: string;
  end_date: string;
  window_start: string;
  window_end: string;
}

export interface WristbandVerification {
  valid: boolean;
  message: string;
  reason?: string;
  wristband?: {
    id: string;
    nfc_id: string;
    category: string;
  };
}

export interface SeriesValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  autoExtendMainEvent?: boolean;
  newMainEventEndDate?: string;
}

// ============================================================================
// 12. FORM TYPES
// ============================================================================

export interface SeriesFormData {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  checkin_window_start_hours?: number;
  checkin_window_end_hours?: number;
  sequence_number?: number;
  series_type: SeriesType;
  location?: string;
  venue_id?: string;
  capacity?: number;
  is_recurring?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_after?: number;
  is_public?: boolean;
  requires_separate_ticket?: boolean;
}

// ============================================================================
// 13. FILTERS & QUERIES
// ============================================================================

export interface SeriesFilters {
  main_event_id?: string;
  organization_id?: string;
  lifecycle_status?: SeriesLifecycleStatus | SeriesLifecycleStatus[];
  series_type?: SeriesType | SeriesType[];
  is_recurring?: boolean;
  start_date_from?: string;
  start_date_to?: string;
  is_within_window?: boolean;
  search?: string;
}

export interface SeriesQueryOptions {
  limit?: number;
  offset?: number;
  order_by?: 'start_date' | 'created_at' | 'name' | 'sequence_number';
  order_direction?: 'asc' | 'desc';
}

// ============================================================================
// 14. SERVICE RESPONSE TYPES
// ============================================================================

export interface SeriesServiceResponse<T> {
  data: T | null;
  error: Error | null;
  validationResult?: SeriesValidationResult;
  mainEventExtended?: boolean;
  message?: string;
}

export interface BulkSeriesResponse {
  data: EventSeries[] | null;
  error: Error | null;
  successful_count?: number;
  failed_count?: number;
  failures?: Array<{
    index: number;
    data: any;
    error: string;
  }>;
}
