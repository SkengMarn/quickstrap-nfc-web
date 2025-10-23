/**
 * Application-wide constants
 * Centralized configuration for magic strings and values
 */

// ============================================================================
// EVENT LIFECYCLE STATUS
// ============================================================================
export const EVENT_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const EVENT_STATUS_LABELS: Record<string, string> = {
  [EVENT_STATUS.DRAFT]: 'Draft',
  [EVENT_STATUS.SCHEDULED]: 'Scheduled',
  [EVENT_STATUS.ACTIVE]: 'Active',
  [EVENT_STATUS.COMPLETED]: 'Completed',
  [EVENT_STATUS.CANCELLED]: 'Cancelled',
};

export const EVENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  [EVENT_STATUS.DRAFT]: { bg: 'bg-gray-100', text: 'text-gray-800' },
  [EVENT_STATUS.SCHEDULED]: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  [EVENT_STATUS.ACTIVE]: { bg: 'bg-green-100', text: 'text-green-800' },
  [EVENT_STATUS.COMPLETED]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [EVENT_STATUS.CANCELLED]: { bg: 'bg-red-100', text: 'text-red-800' },
};

// ============================================================================
// TICKET LINKING MODES
// ============================================================================
export const TICKET_LINKING_MODE = {
  DISABLED: 'disabled',
  OPTIONAL: 'optional',
  REQUIRED: 'required',
} as const;

export const TICKET_LINKING_MODE_LABELS: Record<string, string> = {
  [TICKET_LINKING_MODE.DISABLED]: 'Disabled',
  [TICKET_LINKING_MODE.OPTIONAL]: 'Optional',
  [TICKET_LINKING_MODE.REQUIRED]: 'Required',
};

// ============================================================================
// CHECKIN STATUS
// ============================================================================
export const CHECKIN_STATUS = {
  SUCCESS: 'success',
  DENIED: 'denied',
  FRAUD: 'fraud',
  ERROR: 'error',
} as const;

export const CHECKIN_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  [CHECKIN_STATUS.SUCCESS]: { bg: 'bg-green-100', text: 'text-green-800' },
  [CHECKIN_STATUS.DENIED]: { bg: 'bg-red-100', text: 'text-red-800' },
  [CHECKIN_STATUS.FRAUD]: { bg: 'bg-orange-100', text: 'text-orange-800' },
  [CHECKIN_STATUS.ERROR]: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

// ============================================================================
// FRAUD DETECTION
// ============================================================================
export const FRAUD_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const FRAUD_SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  [FRAUD_SEVERITY.LOW]: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  [FRAUD_SEVERITY.MEDIUM]: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  [FRAUD_SEVERITY.HIGH]: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  [FRAUD_SEVERITY.CRITICAL]: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

// ============================================================================
// PAGINATION
// ============================================================================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100, 200],
  MAX_PAGE_SIZE: 500,
} as const;

// ============================================================================
// DATE & TIME
// ============================================================================
export const DATE_FORMAT = {
  SHORT: 'MMM d, yyyy',
  LONG: 'MMMM d, yyyy',
  WITH_TIME: 'MMM d, yyyy h:mm a',
  TIME_ONLY: 'h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

export const REFRESH_INTERVALS = {
  DASHBOARD: 30000, // 30 seconds
  CHECKINS: 10000,  // 10 seconds
  NOTIFICATIONS: 15000, // 15 seconds
  ANALYTICS: 60000, // 1 minute
} as const;

// ============================================================================
// SEARCH & FILTERS
// ============================================================================
export const SEARCH_DEBOUNCE_MS = 300;
export const MIN_SEARCH_LENGTH = 2;

export const SQL_OPERATORS = {
  EQUALS: 'eq',
  NOT_EQUALS: 'neq',
  LIKE: 'ilike',
  GREATER_THAN: 'gt',
  LESS_THAN: 'lt',
  IN: 'in',
  IS_NULL: 'is',
  NOT_NULL: 'not.is',
} as const;

// ============================================================================
// GATE STATUS
// ============================================================================
export const GATE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
} as const;

export const GATE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  [GATE_STATUS.ACTIVE]: { bg: 'bg-green-100', text: 'text-green-800' },
  [GATE_STATUS.INACTIVE]: { bg: 'bg-gray-100', text: 'text-gray-800' },
  [GATE_STATUS.MAINTENANCE]: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
};

// ============================================================================
// ORGANIZATION ROLES
// ============================================================================
export const ORG_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  SCANNER: 'scanner',
} as const;

export const ORG_ROLE_LABELS: Record<string, string> = {
  [ORG_ROLE.OWNER]: 'Owner',
  [ORG_ROLE.ADMIN]: 'Administrator',
  [ORG_ROLE.MEMBER]: 'Member',
  [ORG_ROLE.SCANNER]: 'Scanner',
};

// ============================================================================
// SUBSCRIPTION TIERS
// ============================================================================
export const SUBSCRIPTION_TIER = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export const SUBSCRIPTION_LIMITS: Record<string, { events: number; wristbands: number; members: number }> = {
  [SUBSCRIPTION_TIER.FREE]: { events: 5, wristbands: 1000, members: 5 },
  [SUBSCRIPTION_TIER.STARTER]: { events: 20, wristbands: 10000, members: 10 },
  [SUBSCRIPTION_TIER.PROFESSIONAL]: { events: 100, wristbands: 100000, members: 50 },
  [SUBSCRIPTION_TIER.ENTERPRISE]: { events: -1, wristbands: -1, members: -1 }, // -1 = unlimited
};

// ============================================================================
// API & EXPORT
// ============================================================================
export const EXPORT_FORMAT = {
  CSV: 'csv',
  PDF: 'pdf',
  EXCEL: 'excel',
  JSON: 'json',
} as const;

export const API_STATUS_CODE = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================
export const NOTIFICATION_TYPE = {
  CHECKIN: 'checkin',
  FRAUD: 'fraud_alert',
  CAPACITY: 'capacity_warning',
  SYSTEM: 'system',
  EMERGENCY: 'emergency',
  STAFF: 'staff',
} as const;

export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// ============================================================================
// VALIDATION
// ============================================================================
export const VALIDATION = {
  EVENT_NAME_MIN: 3,
  EVENT_NAME_MAX: 100,
  DESCRIPTION_MAX: 1000,
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 1000000,
  NFC_ID_LENGTH: 8, // Standard NFC ID length
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s-()]+$/,
} as const;

// ============================================================================
// UI BREAKPOINTS (matching Tailwind defaults)
// ============================================================================
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

// ============================================================================
// TABLE COLUMN VISIBILITY
// ============================================================================
export const DEFAULT_VISIBLE_COLUMNS = {
  EVENTS: ['name', 'status', 'date', 'capacity', 'actions'],
  CHECKINS: ['timestamp', 'wristband', 'gate', 'status'],
  TICKETS: ['ticket_number', 'holder', 'category', 'status'],
  WRISTBANDS: ['nfc_id', 'category', 'status', 'linked'],
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  TIMEOUT: 'The request timed out. Please try again.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================
export const SUCCESS_MESSAGES = {
  CREATED: 'Created successfully!',
  UPDATED: 'Updated successfully!',
  DELETED: 'Deleted successfully!',
  SAVED: 'Saved successfully!',
  EXPORTED: 'Exported successfully!',
  IMPORTED: 'Imported successfully!',
} as const;

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================
export const STORAGE_KEYS = {
  THEME: 'quickstrap_theme',
  SIDEBAR_COLLAPSED: 'quickstrap_sidebar_collapsed',
  TABLE_PAGE_SIZE: 'quickstrap_table_page_size',
  COLUMN_VISIBILITY: 'quickstrap_column_visibility',
  RECENT_EVENTS: 'quickstrap_recent_events',
  FILTERS: 'quickstrap_filters',
} as const;

// ============================================================================
// ANALYTICS
// ============================================================================
export const ANALYTICS_TIMEFRAMES = {
  LAST_HOUR: 'last_hour',
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  CUSTOM: 'custom',
} as const;

export const CHART_COLORS = {
  PRIMARY: '#3b82f6',    // blue-600
  SUCCESS: '#10b981',    // green-600
  WARNING: '#f59e0b',    // yellow-600
  DANGER: '#ef4444',     // red-600
  INFO: '#8b5cf6',       // purple-600
  GRAY: '#6b7280',       // gray-600
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================
export const FEATURES = {
  REAL_TIME_UPDATES: true,
  ADVANCED_ANALYTICS: true,
  BULK_OPERATIONS: true,
  EXPORT_PDF: true,
  EXPORT_EXCEL: true,
  AI_INSIGHTS: false, // Coming soon
  MOBILE_APP: false,  // Coming soon
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS];
export type TicketLinkingMode = typeof TICKET_LINKING_MODE[keyof typeof TICKET_LINKING_MODE];
export type CheckinStatus = typeof CHECKIN_STATUS[keyof typeof CHECKIN_STATUS];
export type FraudSeverity = typeof FRAUD_SEVERITY[keyof typeof FRAUD_SEVERITY];
export type GateStatus = typeof GATE_STATUS[keyof typeof GATE_STATUS];
export type OrgRole = typeof ORG_ROLE[keyof typeof ORG_ROLE];
export type SubscriptionTier = typeof SUBSCRIPTION_TIER[keyof typeof SUBSCRIPTION_TIER];
export type ExportFormat = typeof EXPORT_FORMAT[keyof typeof EXPORT_FORMAT];
export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];
export type NotificationPriority = typeof NOTIFICATION_PRIORITY[keyof typeof NOTIFICATION_PRIORITY];
export type AnalyticsTimeframe = typeof ANALYTICS_TIMEFRAMES[keyof typeof ANALYTICS_TIMEFRAMES];
