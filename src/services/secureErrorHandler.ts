/**
 * Secure Error Handling System
 * Prevents information leakage while providing useful error messages
 */

import { auditLogger } from './auditLogger';

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  operation?: string;
  resourceType?: string;
  resourceId?: string;
}

interface SecureError extends Error {
  code?: string;
  statusCode?: number;
  isOperational?: boolean;
  context?: ErrorContext;
  timestamp?: string;
}

class SecureErrorHandler {
  private readonly errorMappings: Record<string, { message: string; statusCode: number; severity: 'low' | 'medium' | 'high' | 'critical' }> = {
    // Authentication errors
    'AUTH_INVALID_CREDENTIALS': {
      message: 'Invalid email or password',
      statusCode: 401,
      severity: 'medium'
    },
    'AUTH_TOKEN_EXPIRED': {
      message: 'Your session has expired. Please log in again.',
      statusCode: 401,
      severity: 'low'
    },
    'AUTH_TOKEN_INVALID': {
      message: 'Invalid authentication token',
      statusCode: 401,
      severity: 'medium'
    },
    'AUTH_ACCOUNT_LOCKED': {
      message: 'Account temporarily locked due to multiple failed login attempts',
      statusCode: 423,
      severity: 'high'
    },
    'AUTH_RATE_LIMITED': {
      message: 'Too many login attempts. Please try again later.',
      statusCode: 429,
      severity: 'high'
    },

    // Authorization errors
    'AUTHZ_INSUFFICIENT_PERMISSIONS': {
      message: 'You do not have permission to perform this action',
      statusCode: 403,
      severity: 'medium'
    },
    'AUTHZ_RESOURCE_NOT_FOUND': {
      message: 'The requested resource was not found',
      statusCode: 404,
      severity: 'low'
    },
    'AUTHZ_SESSION_EXPIRED': {
      message: 'Your session has expired. Please log in again.',
      statusCode: 401,
      severity: 'low'
    },

    // Validation errors
    'VALIDATION_INVALID_INPUT': {
      message: 'The provided data is invalid',
      statusCode: 400,
      severity: 'low'
    },
    'VALIDATION_MISSING_REQUIRED_FIELD': {
      message: 'Required field is missing',
      statusCode: 400,
      severity: 'low'
    },
    'VALIDATION_FILE_TOO_LARGE': {
      message: 'File size exceeds the maximum allowed limit',
      statusCode: 413,
      severity: 'low'
    },
    'VALIDATION_INVALID_FILE_TYPE': {
      message: 'Invalid file type. Please check the file format.',
      statusCode: 400,
      severity: 'low'
    },

    // Database errors
    'DB_CONNECTION_ERROR': {
      message: 'Service temporarily unavailable. Please try again later.',
      statusCode: 503,
      severity: 'high'
    },
    'DB_CONSTRAINT_VIOLATION': {
      message: 'The operation cannot be completed due to data constraints',
      statusCode: 400,
      severity: 'medium'
    },
    'DB_DUPLICATE_KEY': {
      message: 'A record with this information already exists',
      statusCode: 409,
      severity: 'low'
    },

    // Rate limiting errors
    'RATE_LIMIT_EXCEEDED': {
      message: 'Too many requests. Please slow down and try again.',
      statusCode: 429,
      severity: 'medium'
    },

    // Security errors
    'SECURITY_CSRF_TOKEN_INVALID': {
      message: 'Security token is invalid. Please refresh the page and try again.',
      statusCode: 403,
      severity: 'high'
    },
    'SECURITY_SUSPICIOUS_ACTIVITY': {
      message: 'Suspicious activity detected. Your request has been blocked.',
      statusCode: 403,
      severity: 'critical'
    },
    'SECURITY_INVALID_SESSION': {
      message: 'Invalid session. Please log in again.',
      statusCode: 401,
      severity: 'high'
    },

    // System errors
    'SYSTEM_MAINTENANCE': {
      message: 'System is currently under maintenance. Please try again later.',
      statusCode: 503,
      severity: 'medium'
    },
    'SYSTEM_OVERLOADED': {
      message: 'System is currently experiencing high load. Please try again later.',
      statusCode: 503,
      severity: 'high'
    }
  };

  /**
   * Create a secure error with proper context
   */
  createError(
    code: string,
    originalError?: Error,
    context?: ErrorContext
  ): SecureError {
    const errorMapping = this.errorMappings[code];

    if (!errorMapping) {
      // Unknown error - use generic message
      return this.createGenericError(originalError, context);
    }

    const secureError = new Error(errorMapping.message) as SecureError;
    secureError.code = code;
    secureError.statusCode = errorMapping.statusCode;
    secureError.isOperational = true;
    secureError.context = context;
    secureError.timestamp = new Date().toISOString();

    // Preserve original error stack in development only
    if (process.env.NODE_ENV === 'development' && originalError) {
      secureError.stack = originalError.stack;
    }

    return secureError;
  }

  /**
   * Create a generic error for unknown error codes
   */
  private createGenericError(originalError?: Error, context?: ErrorContext): SecureError {
    const secureError = new Error('An unexpected error occurred. Please try again.') as SecureError;
    secureError.code = 'UNKNOWN_ERROR';
    secureError.statusCode = 500;
    secureError.isOperational = false;
    secureError.context = context;
    secureError.timestamp = new Date().toISOString();

    if (process.env.NODE_ENV === 'development' && originalError) {
      secureError.stack = originalError.stack;
    }

    return secureError;
  }

  /**
   * Handle and log errors securely
   */
  async handleError(
    error: Error | SecureError,
    context?: ErrorContext
  ): Promise<{ message: string; statusCode: number; code?: string }> {
    let secureError: SecureError;

    if (this.isSecureError(error)) {
      secureError = error;
    } else {
      // Convert unknown error to secure error
      secureError = this.createError('UNKNOWN_ERROR', error, context);
    }

    // Log the error for monitoring
    await this.logError(secureError, context);

    // Return safe error response
    return {
      message: secureError.message,
      statusCode: secureError.statusCode || 500,
      code: secureError.code
    };
  }

  /**
   * Handle Supabase errors securely
   */
  async handleSupabaseError(
    error: any,
    context?: ErrorContext
  ): Promise<{ message: string; statusCode: number; code?: string }> {
    let errorCode = 'UNKNOWN_ERROR';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    // Map Supabase error codes to our secure error codes
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique constraint violation
          errorCode = 'DB_DUPLICATE_KEY';
          severity = 'low';
          break;
        case '23503': // Foreign key constraint violation
          errorCode = 'DB_CONSTRAINT_VIOLATION';
          severity = 'medium';
          break;
        case '23502': // Not null constraint violation
          errorCode = 'VALIDATION_MISSING_REQUIRED_FIELD';
          severity = 'low';
          break;
        case '42501': // Insufficient privileges
          errorCode = 'AUTHZ_INSUFFICIENT_PERMISSIONS';
          severity = 'medium';
          break;
        case 'PGRST116': // Row not found
          errorCode = 'AUTHZ_RESOURCE_NOT_FOUND';
          severity = 'low';
          break;
        case 'PGRST301': // JWT expired
          errorCode = 'AUTH_TOKEN_EXPIRED';
          severity = 'low';
          break;
        case 'PGRST302': // JWT invalid
          errorCode = 'AUTH_TOKEN_INVALID';
          severity = 'medium';
          break;
        default:
          errorCode = 'DB_CONNECTION_ERROR';
          severity = 'high';
      }
    }

    const secureError = this.createError(errorCode, error, context);

    // Log the error
    await this.logError(secureError, context);

    return {
      message: secureError.message,
      statusCode: secureError.statusCode || 500,
      code: secureError.code
    };
  }

  /**
   * Handle validation errors securely
   */
  async handleValidationError(
    errors: Array<{ field: string; message: string }>,
    context?: ErrorContext
  ): Promise<{ message: string; statusCode: number; code?: string; fields?: Record<string, string> }> {
    const fieldErrors: Record<string, string> = {};

    errors.forEach(error => {
      fieldErrors[error.field] = error.message;
    });

    const secureError = this.createError('VALIDATION_INVALID_INPUT', undefined, context);

    await this.logError(secureError, context);

    return {
      message: 'Validation failed. Please check your input.',
      statusCode: 400,
      code: 'VALIDATION_INVALID_INPUT',
      fields: fieldErrors
    };
  }

  /**
   * Log error securely
   */
  private async logError(error: SecureError, context?: ErrorContext): Promise<void> {
    try {
      const severity = this.errorMappings[error.code || 'UNKNOWN_ERROR']?.severity || 'medium';

      await auditLogger.logEvent({
        user_id: context?.userId,
        session_id: context?.sessionId,
        event_type: 'error',
        event_category: 'system',
        severity,
        description: `Error: ${error.message}`,
        resource_type: context?.resourceType,
        resource_id: context?.resourceId,
        ip_address: context?.ipAddress,
        user_agent: context?.userAgent,
        metadata: {
          error_code: error.code,
          status_code: error.statusCode,
          is_operational: error.isOperational,
          operation: context?.operation
        },
        success: false,
        error_message: error.message
      });

      // For critical errors, also log to console with more detail
      if (severity === 'critical') {
        console.error('🚨 CRITICAL ERROR:', {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          context,
          stack: error.stack
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Check if error is already a SecureError
   */
  private isSecureError(error: any): error is SecureError {
    return error && typeof error.code === 'string' && typeof error.statusCode === 'number';
  }

  /**
   * Create error response for API endpoints
   */
  async createErrorResponse(
    error: Error | SecureError,
    context?: ErrorContext
  ): Promise<Response> {
    const { message, statusCode, code } = await this.handleError(error, context);

    return new Response(
      JSON.stringify({
        error: {
          message,
          code,
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Code': code || 'UNKNOWN_ERROR'
        }
      }
    );
  }

  /**
   * Create error response for Supabase Edge Functions
   */
  async createSupabaseErrorResponse(
    error: any,
    context?: ErrorContext
  ): Promise<Response> {
    const { message, statusCode, code } = await this.handleSupabaseError(error, context);

    return new Response(
      JSON.stringify({
        error: {
          message,
          code,
          timestamp: new Date().toISOString()
        }
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Error-Code': code || 'UNKNOWN_ERROR'
        }
      }
    );
  }

  /**
   * Get error statistics for monitoring
   */
  async getErrorStats(days: number = 7): Promise<{
    totalErrors: number;
    criticalErrors: number;
    errorByCode: Record<string, number>;
    errorBySeverity: Record<string, number>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();

      // Note: supabase client needs to be imported or passed as parameter
      // For now, return empty stats if supabase is not available
      const data: any[] = [];
      const error = null;
      
      // TODO: Import supabase client to enable error stats
      // const { data, error } = await supabase
      //   .from('audit_logs')
      //   .select('metadata, severity')
      //   .gte('timestamp', startDateStr)
      //   .eq('event_type', 'error');

      if (error) {
        console.error('Failed to get error stats:', error);
        return {
          totalErrors: 0,
          criticalErrors: 0,
          errorByCode: {},
          errorBySeverity: {}
        };
      }

      const errorByCode: Record<string, number> = {};
      const errorBySeverity: Record<string, number> = {};
      let criticalErrors = 0;

      data?.forEach(log => {
        const errorCode = log.metadata?.error_code || 'UNKNOWN';
        errorByCode[errorCode] = (errorByCode[errorCode] || 0) + 1;

        const severity = log.severity || 'medium';
        errorBySeverity[severity] = (errorBySeverity[severity] || 0) + 1;

        if (severity === 'critical') {
          criticalErrors++;
        }
      });

      return {
        totalErrors: data?.length || 0,
        criticalErrors,
        errorByCode,
        errorBySeverity
      };
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        totalErrors: 0,
        criticalErrors: 0,
        errorByCode: {},
        errorBySeverity: {}
      };
    }
  }
}

export const secureErrorHandler = new SecureErrorHandler();

/**
 * Error handling middleware for API routes
 */
export function createErrorMiddleware() {
  return async (error: Error, req: Request, context?: ErrorContext): Promise<Response> => {
    return secureErrorHandler.createErrorResponse(error, context);
  };
}

/**
 * Supabase error handling middleware
 */
export function createSupabaseErrorMiddleware() {
  return async (error: any, context?: ErrorContext): Promise<Response> => {
    return secureErrorHandler.createSupabaseErrorResponse(error, context);
  };
}



