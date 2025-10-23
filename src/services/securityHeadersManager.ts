/**
 * Security Headers Middleware and Monitoring
 * Comprehensive security headers management with monitoring
 */

import { auditLogger } from './auditLogger';
import { securityMonitor } from './securityMonitor';

interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security': string;
  'Cross-Origin-Opener-Policy': string;
  'Cross-Origin-Resource-Policy': string;
  'X-Permitted-Cross-Domain-Policies': string;
  'Cache-Control': string;
  'Pragma': string;
  'Expires': string;
}

interface SecurityHeaderViolation {
  header: string;
  expected: string;
  actual: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

class SecurityHeadersManager {
  private readonly defaultHeaders: SecurityHeaders;
  private violations: SecurityHeaderViolation[] = [];
  private readonly maxViolations = 1000;

  constructor() {
    this.defaultHeaders = this.initializeDefaultHeaders();
  }

  /**
   * Initialize default security headers
   */
  private initializeDefaultHeaders(): SecurityHeaders {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-{random}' https://api.telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.telegram.org wss://*.supabase.co; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  /**
   * Generate security headers with dynamic values
   */
  generateHeaders(nonce?: string): SecurityHeaders {
    const headers = { ...this.defaultHeaders };

    // Replace nonce placeholder if provided
    if (nonce) {
      headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace('{random}', nonce);
    }

    return headers;
  }

  /**
   * Add security headers to response
   */
  addSecurityHeaders(response: Response, nonce?: string): Response {
    const securityHeaders = this.generateHeaders(nonce);

    const newHeaders = new Headers(response.headers);

    // Add all security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  /**
   * Create response with security headers
   */
  createSecureResponse(
    body: string | null,
    init: ResponseInit = {},
    nonce?: string
  ): Response {
    const response = new Response(body, init);
    return this.addSecurityHeaders(response, nonce);
  }

  /**
   * Validate incoming request headers
   */
  async validateRequestHeaders(
    request: Request,
    userId?: string,
    sessionId?: string
  ): Promise<{ valid: boolean; violations: SecurityHeaderViolation[] }> {
    const violations: SecurityHeaderViolation[] = [];
    const ipAddress = request.headers.get('X-Forwarded-For') ||
                     request.headers.get('CF-Connecting-IP') ||
                     'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    // Check for suspicious headers
    const suspiciousHeaders = [
      'X-Forwarded-Host',
      'X-Original-URL',
      'X-Rewrite-URL'
    ];

    for (const header of suspiciousHeaders) {
      if (request.headers.has(header)) {
        violations.push({
          header,
          expected: 'not present',
          actual: request.headers.get(header) || 'present',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent
        });
      }
    }

    // Check for missing required headers in API requests
    if (request.url.includes('/api/')) {
      const requiredHeaders = ['User-Agent', 'Accept'];

      for (const header of requiredHeaders) {
        if (!request.headers.has(header)) {
          violations.push({
            header,
            expected: 'present',
            actual: 'missing',
            severity: 'low',
            timestamp: new Date().toISOString(),
            ipAddress,
            userAgent
          });
        }
      }
    }

    // Log violations
    if (violations.length > 0) {
      await this.logHeaderViolations(violations, userId, sessionId);
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Monitor response headers for compliance
   */
  async monitorResponseHeaders(
    response: Response,
    request: Request,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const violations: SecurityHeaderViolation[] = [];
    const ipAddress = request.headers.get('X-Forwarded-For') ||
                     request.headers.get('CF-Connecting-IP') ||
                     'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    // Check for missing security headers
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy'
    ];

    for (const header of requiredHeaders) {
      if (!response.headers.has(header)) {
        violations.push({
          header,
          expected: 'present',
          actual: 'missing',
          severity: 'high',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent
        });
      }
    }

    // Check for weak CSP
    const csp = response.headers.get('Content-Security-Policy');
    if (csp) {
      if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
        violations.push({
          header: 'Content-Security-Policy',
          expected: 'no unsafe directives',
          actual: 'contains unsafe directives',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent
        });
      }
    }

    // Check for weak HSTS
    const hsts = response.headers.get('Strict-Transport-Security');
    if (hsts && !hsts.includes('includeSubDomains')) {
      violations.push({
        header: 'Strict-Transport-Security',
        expected: 'includeSubDomains',
        actual: 'missing includeSubDomains',
        severity: 'low',
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent
      });
    }

    // Log violations
    if (violations.length > 0) {
      await this.logHeaderViolations(violations, userId, sessionId);
    }
  }

  /**
   * Log header violations
   */
  private async logHeaderViolations(
    violations: SecurityHeaderViolation[],
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    // Store violations
    this.violations.push(...violations);

    // Keep only recent violations
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(-this.maxViolations);
    }

    // Log critical violations
    const criticalViolations = violations.filter(v => v.severity === 'critical');

    for (const violation of criticalViolations) {
      await securityMonitor.processEvent({
        eventType: 'security_header_violation',
        eventCategory: 'security',
        severity: 'critical',
        description: `Critical security header violation: ${violation.header}`,
        userId,
        sessionId,
        ipAddress: violation.ipAddress,
        userAgent: violation.userAgent,
        metadata: {
          header: violation.header,
          expected: violation.expected,
          actual: violation.actual
        }
      });
    }

    // Log all violations to audit log
    await auditLogger.logEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: 'security_header_violation',
      event_category: 'security',
      severity: violations.some(v => v.severity === 'critical') ? 'critical' : 'medium',
      description: `Security header violations detected: ${violations.length} violations`,
      ip_address: violations[0]?.ipAddress,
      user_agent: violations[0]?.userAgent,
      metadata: {
        violations: violations.map(v => ({
          header: v.header,
          expected: v.expected,
          actual: v.actual,
          severity: v.severity
        }))
      },
      success: false
    });
  }

  /**
   * Generate CSP report
   */
  generateCSPReport(violations: any[]): string {
    const report = {
      'csp-report': {
        'document-uri': violations[0]?.documentUri || 'unknown',
        'referrer': violations[0]?.referrer || 'unknown',
        'violated-directive': violations[0]?.violatedDirective || 'unknown',
        'effective-directive': violations[0]?.effectiveDirective || 'unknown',
        'original-policy': violations[0]?.originalPolicy || 'unknown',
        'disposition': violations[0]?.disposition || 'unknown',
        'blocked-uri': violations[0]?.blockedUri || 'unknown',
        'line-number': violations[0]?.lineNumber || 0,
        'column-number': violations[0]?.columnNumber || 0,
        'source-file': violations[0]?.sourceFile || 'unknown'
      }
    };

    return JSON.stringify(report);
  }

  /**
   * Handle CSP violation reports
   */
  async handleCSPViolationReport(report: any, request: Request): Promise<void> {
    const ipAddress = request.headers.get('X-Forwarded-For') ||
                     request.headers.get('CF-Connecting-IP') ||
                     'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    await securityMonitor.processEvent({
      eventType: 'csp_violation',
      eventCategory: 'security',
      severity: 'medium',
      description: `CSP violation: ${report['csp-report']?.violatedDirective || 'unknown'}`,
      ipAddress,
      userAgent,
      metadata: {
        cspReport: report['csp-report'],
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Get security header statistics
   */
  getHeaderStats(): {
    totalViolations: number;
    violationsBySeverity: Record<string, number>;
    violationsByHeader: Record<string, number>;
    recentViolations: SecurityHeaderViolation[];
  } {
    const violationsBySeverity: Record<string, number> = {};
    const violationsByHeader: Record<string, number> = {};

    this.violations.forEach(violation => {
      violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1;
      violationsByHeader[violation.header] = (violationsByHeader[violation.header] || 0) + 1;
    });

    const recentViolations = this.violations
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    return {
      totalViolations: this.violations.length,
      violationsBySeverity,
      violationsByHeader,
      recentViolations
    };
  }

  /**
   * Generate security headers report
   */
  generateSecurityReport(): {
    headers: SecurityHeaders;
    violations: SecurityHeaderViolation[];
    stats: any;
    recommendations: string[];
  } {
    const stats = this.getHeaderStats();
    const recommendations: string[] = [];

    // Generate recommendations based on violations
    if (stats.violationsBySeverity.critical > 0) {
      recommendations.push('Address critical security header violations immediately');
    }

    if (stats.violationsByHeader['Content-Security-Policy'] > 0) {
      recommendations.push('Review and strengthen Content Security Policy');
    }

    if (stats.violationsByHeader['X-Frame-Options'] > 0) {
      recommendations.push('Ensure X-Frame-Options is properly configured');
    }

    if (stats.totalViolations > 100) {
      recommendations.push('Consider implementing automated security header monitoring');
    }

    return {
      headers: this.defaultHeaders,
      violations: this.violations,
      stats,
      recommendations
    };
  }

  /**
   * Update security headers configuration
   */
  updateHeaders(newHeaders: Partial<SecurityHeaders>): void {
    Object.assign(this.defaultHeaders, newHeaders);
  }

  /**
   * Get current headers configuration
   */
  getCurrentHeaders(): SecurityHeaders {
    return { ...this.defaultHeaders };
  }
}

export const securityHeadersManager = new SecurityHeadersManager();

/**
 * Security headers middleware for API routes
 */
export function createSecurityHeadersMiddleware() {
  return async (request: Request, response: Response): Promise<Response> => {
    // Validate request headers
    await securityHeadersManager.validateRequestHeaders(request);

    // Monitor response headers
    await securityHeadersManager.monitorResponseHeaders(response, request);

    // Add security headers if missing
    return securityHeadersManager.addSecurityHeaders(response);
  };
}

/**
 * CSP violation report endpoint handler
 */
export async function handleCSPViolationReport(request: Request): Promise<Response> {
  try {
    const report = await request.json();
    await securityHeadersManager.handleCSPViolationReport(report, request);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Failed to handle CSP violation report:', error);
    return new Response('Bad Request', { status: 400 });
  }
}

/**
 * Security headers monitoring endpoint
 */
export async function getSecurityHeadersReport(): Promise<Response> {
  const report = securityHeadersManager.generateSecurityReport();

  return new Response(JSON.stringify(report), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...securityHeadersManager.generateHeaders()
    }
  });
}



