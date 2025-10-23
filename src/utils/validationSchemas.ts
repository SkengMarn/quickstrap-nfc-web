/**
 * Comprehensive Input Validation with Zod Schemas
 * Provides type-safe validation for all user inputs
 */

import { z } from 'zod';

// Base validation schemas
const emailSchema = z.string().email('Invalid email format').max(254, 'Email too long');
const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').max(20, 'Phone number too long');
const uuidSchema = z.string().uuid('Invalid UUID format');
const nonEmptyStringSchema = z.string().min(1, 'Field cannot be empty').max(1000, 'Field too long');
const safeStringSchema = z.string().max(1000, 'Field too long').regex(/^[a-zA-Z0-9\s\-_.,!?@#$%^&*()+=\[\]{}|\\:";'<>\/]*$/, 'Contains invalid characters');

// Event validation schemas
export const eventCreateSchema = z.object({
  name: nonEmptyStringSchema.min(1, 'Event name is required').max(200, 'Event name too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  location: z.string().max(500, 'Location too long').optional(),
  start_date: z.string().datetime('Invalid start date format'),
  end_date: z.string().datetime('Invalid end date format'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(1000000, 'Capacity too large').optional(),
  is_public: z.boolean().optional(),
  lifecycle_status: z.enum(['draft', 'active', 'completed', 'cancelled', 'archived']).optional(),
  ticket_linking_mode: z.enum(['required', 'optional', 'disabled']).optional(),
  allow_unlinked_entry: z.boolean().optional(),
  config: z.record(z.string(), z.any()).optional(),
  parent_event_id: uuidSchema.optional(), // For series events
  is_series_parent: z.boolean().optional(),
  is_series_child: z.boolean().optional()
}).refine((data) => {
  // Start date cannot be in the past (unless it's an edit operation)
  const startDate = new Date(data.start_date);
  const now = new Date();

  // Allow a small buffer (1 minute) for clock differences and form submission delays
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  if (startDate < oneMinuteAgo) {
    return false;
  }
  return true;
}, {
  message: 'Start date cannot be in the past',
  path: ['start_date']
});

// Series event validation schema - creates a new schema instead of extending
export const seriesEventCreateSchema = z.object({
  name: nonEmptyStringSchema.min(1, 'Event name is required').max(200, 'Event name too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  location: z.string().max(500, 'Location too long').optional(),
  start_date: z.string().datetime('Invalid start date format'),
  end_date: z.string().datetime('Invalid end date format'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(1000000, 'Capacity too large').optional(),
  is_public: z.boolean().optional(),
  lifecycle_status: z.enum(['draft', 'active', 'completed', 'cancelled', 'archived']).optional(),
  ticket_linking_mode: z.enum(['required', 'optional', 'disabled']).optional(),
  allow_unlinked_entry: z.boolean().optional(),
  config: z.record(z.string(), z.any()).optional(),
  parent_event_id: uuidSchema, // Required for series events
  is_series_parent: z.boolean().optional(),
  is_series_child: z.literal(true)
}).refine((data) => {
  // Start date validation (same as eventCreateSchema)
  const startDate = new Date(data.start_date);
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  
  if (startDate < oneMinuteAgo) {
    return false;
  }
  return true;
}, {
  message: 'Start date cannot be in the past',
  path: ['start_date']
}).refine((data) => {
  // This will be checked against the parent event in the service layer
  return true;
}, {
  message: 'Series event must be validated against parent event',
  path: ['parent_event_id']
});

export const eventUpdateSchema = eventCreateSchema.partial();

// User validation schemas
export const userCreateSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  full_name: z.string().min(1, 'Full name is required').max(200, 'Full name too long'),
  role: z.enum(['super_admin', 'admin', 'user', 'owner', 'scanner', 'manager']).optional()
});

export const userUpdateSchema = z.object({
  email: emailSchema.optional(),
  full_name: z.string().min(1, 'Full name is required').max(200, 'Full name too long').optional(),
  role: z.enum(['super_admin', 'admin', 'user', 'owner', 'scanner', 'manager']).optional()
});

// Wristband validation schemas
export const wristbandCreateSchema = z.object({
  event_id: uuidSchema,
  nfc_id: z.string().min(1, 'NFC ID is required').max(100, 'NFC ID too long')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'NFC ID contains invalid characters'),
  category: z.string().min(1, 'Category is required').max(100, 'Category too long'),
  status: z.enum(['active', 'inactive', 'blocked', 'lost', 'stolen']).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const wristbandUpdateSchema = wristbandCreateSchema.partial().omit({ event_id: true });

// Ticket validation schemas
export const ticketCreateSchema = z.object({
  event_id: uuidSchema,
  ticket_number: z.string().min(1, 'Ticket number is required').max(100, 'Ticket number too long'),
  ticket_category: z.string().min(1, 'Ticket category is required').max(100, 'Ticket category too long'),
  holder_name: z.string().max(200, 'Holder name too long').optional(),
  holder_email: emailSchema.optional(),
  holder_phone: phoneSchema.optional(),
  status: z.enum(['unused', 'used', 'cancelled', 'refunded']).optional()
});

export const ticketUpdateSchema = ticketCreateSchema.partial().omit({ event_id: true });

// Check-in validation schemas
export const checkinCreateSchema = z.object({
  event_id: uuidSchema,
  wristband_id: uuidSchema,
  staff_id: uuidSchema.optional(),
  location: z.string().max(200, 'Location too long').optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  timestamp: z.string().datetime().optional()
});

// Search and filter validation schemas
export const searchSchema = z.object({
  query: z.string().max(500, 'Search query too long').optional(),
  page: z.number().int().min(1, 'Page must be at least 1').max(10000, 'Page too large').optional(),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(1000, 'Limit too large').optional(),
  sort_by: z.string().max(100, 'Sort field too long').optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

export const dateRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
}).refine((data) => {
  if (data.start && data.end) {
    return new Date(data.end) > new Date(data.start);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['end']
});

// File upload validation schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().int().min(1).max(100 * 1024 * 1024), // Max 100MB
  allowedTypes: z.array(z.string()).min(1, 'At least one file type must be allowed')
}).refine((data) => {
  return data.file.size <= data.maxSize;
}, {
  message: 'File size exceeds maximum allowed size',
  path: ['file']
}).refine((data) => {
  return data.allowedTypes.includes(data.file.type);
}, {
  message: 'File type not allowed',
  path: ['file']
});

// CSV validation schemas
export const csvRowSchema = z.object({
  ticket_number: z.string().min(1, 'Ticket number is required').max(100, 'Ticket number too long'),
  ticket_category: z.string().min(1, 'Ticket category is required').max(100, 'Ticket category too long'),
  holder_name: z.string().max(200, 'Holder name too long').optional(),
  holder_email: emailSchema.optional(),
  holder_phone: phoneSchema.optional()
});

export const csvUploadSchema = z.object({
  event_id: uuidSchema,
  rows: z.array(csvRowSchema).min(1, 'At least one row is required').max(10000, 'Too many rows')
});

// API request validation schemas
export const apiRequestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string().max(500, 'Path too long'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.any().optional(),
  query: z.record(z.string(), z.string()).optional()
});

// Rate limiting validation schemas
export const rateLimitSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required').max(200, 'Identifier too long'),
  action: z.enum(['login', 'api', 'telegram', 'upload', 'export']),
  requests: z.number().int().min(0).max(1000000),
  window_start: z.number().int().min(0),
  blocked: z.boolean().optional(),
  block_expiry: z.number().int().min(0).optional()
});

// Security validation schemas
export const csrfTokenSchema = z.object({
  token: z.string().min(32, 'Invalid CSRF token').max(64, 'Invalid CSRF token'),
  timestamp: z.number().int().min(0),
  expires_at: z.number().int().min(0)
});

export const sessionSchema = z.object({
  user_id: uuidSchema,
  session_id: z.string().min(32, 'Invalid session ID').max(64, 'Invalid session ID'),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  ip_address: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[a-fA-F0-9:]+:+)+[a-fA-F0-9]+$/, 'Invalid IP address').optional(),
  user_agent: z.string().max(500, 'User agent too long').optional()
});

// Validation helper functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return {
      success: false,
      errors: ['Validation failed']
    };
  }
}

export function validateInputSafe<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}

// Sanitization helpers that work with Zod
export function sanitizeAndValidate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  // First sanitize the data
  const sanitized = sanitizeObject(data);

  // Then validate
  return validateInput(schema, sanitized);
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return obj.trim().slice(0, 10000); // Limit string length
  }

  if (Array.isArray(obj)) {
    return obj.slice(0, 1000).map(sanitizeObject); // Limit array size
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    const keys = Object.keys(obj).slice(0, 100); // Limit object keys
    for (const key of keys) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  return obj;
}

// Series event validation utilities
export interface SeriesValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  autoExtendMainEvent?: boolean;
  newMainEventEndDate?: string;
}

/**
 * Validates a series event against its parent event
 * Implements the series validation rules from the specification
 */
export function validateSeriesEvent(
  seriesEvent: { start_date: string; end_date: string },
  mainEvent: { start_date: string; end_date: string },
  otherSeriesEvents?: Array<{ start_date: string; end_date: string }>
): SeriesValidationResult {
  const result: SeriesValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const seriesStart = new Date(seriesEvent.start_date);
  const seriesEnd = new Date(seriesEvent.end_date);
  const mainStart = new Date(mainEvent.start_date);
  let mainEnd = new Date(mainEvent.end_date);

  // Rule 1: Series start date cannot be before main event start date
  if (seriesStart < mainStart) {
    result.valid = false;
    result.errors.push('Series start date cannot be before the main event start date.');
  }

  // Rule 2: If series ends after main event, auto-extend main event
  if (seriesEnd > mainEnd) {
    result.autoExtendMainEvent = true;
    result.newMainEventEndDate = seriesEvent.end_date;
    result.warnings.push(
      `This will extend the main event's end date to ${seriesEnd.toLocaleDateString()} ${seriesEnd.toLocaleTimeString()}.`
    );
    mainEnd = seriesEnd; // Update for overlap checking
  }

  // Rule 3: Check for overlapping series events
  if (otherSeriesEvents && otherSeriesEvents.length > 0) {
    for (const otherSeries of otherSeriesEvents) {
      const otherStart = new Date(otherSeries.start_date);
      const otherEnd = new Date(otherSeries.end_date);

      // Check if there's any overlap
      const hasOverlap = (
        (seriesStart >= otherStart && seriesStart < otherEnd) ||
        (seriesEnd > otherStart && seriesEnd <= otherEnd) ||
        (seriesStart <= otherStart && seriesEnd >= otherEnd)
      );

      if (hasOverlap) {
        result.valid = false;
        result.errors.push('Series events cannot overlap in time.');
        break;
      }
    }
  }

  return result;
}

/**
 * Validates event dates according to the specification
 */
export function validateEventDates(
  startDate: string,
  endDate: string,
  isEdit: boolean = false
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  // Check for valid date format
  if (isNaN(start.getTime())) {
    errors.push('Invalid date format for start date.');
  }

  if (isNaN(end.getTime())) {
    errors.push('Invalid date format for end date.');
  }

  // If dates are invalid, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Start date cannot be in the past (only for new events)
  if (!isEdit) {
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    if (start < oneMinuteAgo) {
      errors.push('Start date cannot be in the past.');
    }
  }

  // Note: End date CAN be before or after start date (flexible per spec)
  // We don't enforce end > start

  return {
    valid: errors.length === 0,
    errors
  };
}

// Type exports for use in components
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export type SeriesEventCreateInput = z.infer<typeof seriesEventCreateSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type WristbandCreateInput = z.infer<typeof wristbandCreateSchema>;
export type WristbandUpdateInput = z.infer<typeof wristbandUpdateSchema>;
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;
export type CheckinCreateInput = z.infer<typeof checkinCreateSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type CsvUploadInput = z.infer<typeof csvUploadSchema>;
export type ApiRequestInput = z.infer<typeof apiRequestSchema>;
export type RateLimitInput = z.infer<typeof rateLimitSchema>;
export type CsrfTokenInput = z.infer<typeof csrfTokenSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;



