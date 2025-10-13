// ============================================================================
// PHASE 1 FOUNDATION TYPES
// ============================================================================

// ===========================================================================
// 1. EVENT LIFECYCLE
// ============================================================================

export type LifecycleStatus =
  | 'draft'      // Being created, not visible to staff
  | 'published'  // Visible, can be edited
  | 'pre_event'  // 24h before start, final checks
  | 'live'       // Event is happening now
  | 'closing'    // Event ended, wrapping up
  | 'closed'     // Event complete, no more changes
  | 'archived';  // Historical, read-only

export interface EventStateTransition {
  id: string;
  event_id: string;
  from_status: LifecycleStatus | null;
  to_status: LifecycleStatus;
  changed_by: string | null;
  reason: string | null;
  automated: boolean;
  created_at: string;
}

// ============================================================================
// 2. MULTI-TENANT ORGANIZATIONS
// ============================================================================

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;

  // Branding
  primary_color: string;
  secondary_color: string;
  custom_domain: string | null;

  // Billing & Limits
  subscription_tier: SubscriptionTier;
  max_events: number;
  max_wristbands: number;
  max_team_members: number;

  // Metadata
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type OrgRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;

  // Permissions
  permissions: {
    events: 'read' | 'write' | 'admin';
    wristbands: 'read' | 'write' | 'admin';
    reports: 'read' | 'write' | 'admin';
    [key: string]: string;
  };

  // Status
  status: 'active' | 'suspended' | 'invited';
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string;

  created_at: string;
  updated_at: string;

  // Joined data
  organization?: Organization;
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface OrganizationSettings {
  id: string;
  organization_id: string;

  // Feature flags
  features: {
    fraud_detection: boolean;
    ai_insights: boolean;
    api_access: boolean;
    white_label: boolean;
    custom_workflows: boolean;
  };

  // Notification preferences
  notifications: {
    email_enabled: boolean;
    sms_enabled: boolean;
    push_enabled: boolean;
  };

  // Security
  require_2fa: boolean;
  allowed_ip_ranges: string[] | null;
  session_timeout_minutes: number;

  // Data retention
  data_retention_days: number;
  auto_archive_enabled: boolean;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// 3. REAL-TIME PRESENCE & COLLABORATION
// ============================================================================

export interface ActiveSession {
  id: string;
  user_id: string;
  organization_id: string | null;

  // Location in portal
  current_route: string | null;
  current_resource_type: string | null;
  current_resource_id: string | null;

  // Session info
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;

  // Activity
  last_activity_at: string;
  session_started_at: string;

  created_at: string;
  updated_at: string;

  // Joined data
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface ResourceLock {
  id: string;
  resource_type: string;
  resource_id: string;

  // Lock owner
  locked_by_user_id: string;
  locked_by_session_id: string | null;

  // Lock info
  lock_reason: string;
  acquired_at: string;
  expires_at: string;

  // Metadata
  metadata: Record<string, any>;

  created_at: string;

  // Joined data
  locked_by_user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export type CollaborationActivityType = 'comment' | 'mention' | 'edit' | 'status_change';

export interface CollaborationActivity {
  id: string;
  organization_id: string | null;

  // Activity details
  activity_type: CollaborationActivityType;
  resource_type: string;
  resource_id: string;

  // User who performed action
  user_id: string;

  // Content
  content: string | null;
  mentions: string[] | null; // Array of user IDs
  metadata: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined data
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

// ============================================================================
// 4. API GATEWAY
// ============================================================================

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export interface ApiKey {
  id: string;
  organization_id: string;

  // Key info
  name: string;
  key_hash: string;
  key_prefix: string; // e.g., 'sk_live_abcd1234'

  // Permissions
  scopes: string[];
  allowed_origins: string[] | null;

  // Status
  status: ApiKeyStatus;

  // Usage limits
  rate_limit_per_hour: number;
  rate_limit_per_day: number;

  // Metadata
  last_used_at: string | null;
  created_by: string | null;
  expires_at: string | null;

  created_at: string;
  updated_at: string;

  // Joined data
  organization?: Organization;
}

export interface ApiRateLimit {
  id: string;
  api_key_id: string;

  // Time window
  window_start: string;
  window_end: string;

  // Usage
  requests_count: number;
  requests_allowed: number;

  // First/last request in window
  first_request_at: string | null;
  last_request_at: string | null;

  created_at: string;
}

export interface ApiAuditLog {
  id: string;
  api_key_id: string | null;
  organization_id: string | null;

  // Request info
  method: string;
  endpoint: string;
  query_params: Record<string, any> | null;
  request_body: Record<string, any> | null;

  // Response info
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;

  // Client info
  ip_address: string | null;
  user_agent: string | null;

  // Timestamps
  requested_at: string;
}

// ============================================================================
// EXTENDED EVENT TYPE
// ============================================================================

export interface EventWithLifecycle {
  // Existing event fields...
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string | null;

  // New lifecycle fields
  lifecycle_status: LifecycleStatus;
  status_changed_at: string;
  status_changed_by: string | null;
  auto_transition_enabled: boolean;
  organization_id: string;

  // Joined data
  organization?: Organization;
  state_transitions?: EventStateTransition[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface LifecycleTransitionRequest {
  event_id: string;
  to_status: LifecycleStatus;
  reason?: string;
}

export interface LockAcquisitionRequest {
  resource_type: string;
  resource_id: string;
  lock_reason?: string;
  duration_minutes?: number;
}

export interface ApiKeyCreateRequest {
  organization_id: string;
  name: string;
  scopes: string[];
  rate_limit_per_hour?: number;
  rate_limit_per_day?: number;
  expires_at?: string;
}

export interface OrganizationInviteRequest {
  organization_id: string;
  email: string;
  role: OrgRole;
  permissions?: Record<string, string>;
}
