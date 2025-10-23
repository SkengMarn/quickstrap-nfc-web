/**
 * Comprehensive Audit Logging System
 * Tracks all security-relevant events and user actions
 */

import { supabase } from './supabase';

interface AuditEvent {
  id?: string;
  user_id?: string;
  session_id?: string;
  event_type: string;
  event_category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  success: boolean;
  error_message?: string;
}

interface SecurityEvent extends AuditEvent {
  event_category: 'security';
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  attack_type?: string;
  blocked?: boolean;
}

class AuditLogger {
  private readonly batchSize = 100;
  private readonly flushInterval = 5000; // 5 seconds
  private eventQueue: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Log a general audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    // Validate event data
    if (!this.validateEvent(auditEvent)) {
      console.error('Invalid audit event:', auditEvent);
      return;
    }

    // Add to queue
    this.eventQueue.push(auditEvent);

    // Flush if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'event_category'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      event_category: 'security',
      timestamp: new Date().toISOString()
    };

    await this.logEvent(securityEvent);

    // For critical security events, also send immediate alert
    if (event.severity === 'critical' || event.threat_level === 'critical') {
      await this.sendSecurityAlert(securityEvent);
    }
  }

  /**
   * Log authentication events
   */
  async logAuthentication(
    userId: string | null,
    sessionId: string | null,
    eventType: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'account_locked',
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      user_id: userId || undefined,
      session_id: sessionId || undefined,
      event_type: eventType,
      event_category: 'authentication',
      severity: eventType === 'login_failed' || eventType === 'account_locked' ? 'high' : 'medium',
      description: `User ${eventType}${success ? ' successful' : ' failed'}`,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      error_message: errorMessage
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    userId: string,
    sessionId: string,
    resourceType: string,
    resourceId: string,
    operation: 'read' | 'export' | 'download',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: operation,
      event_category: 'data_access',
      severity: operation === 'export' || operation === 'download' ? 'medium' : 'low',
      description: `User accessed ${resourceType} ${resourceId}`,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  }

  /**
   * Log data modification events
   */
  async logDataModification(
    userId: string,
    sessionId: string,
    resourceType: string,
    resourceId: string,
    operation: 'create' | 'update' | 'delete',
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: operation,
      event_category: 'data_modification',
      severity: operation === 'delete' ? 'high' : 'medium',
      description: `User ${operation}d ${resourceType} ${resourceId}`,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
      success: true
    });
  }

  /**
   * Log authorization events
   */
  async logAuthorization(
    userId: string,
    sessionId: string,
    resourceType: string,
    resourceId: string,
    operation: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: 'authorization',
      event_category: 'authorization',
      severity: success ? 'low' : 'high',
      description: `User ${success ? 'granted' : 'denied'} access to ${resourceType} ${resourceId}`,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress,
      user_agent: userAgent,
      success,
      error_message: errorMessage
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    eventType: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      event_type: eventType,
      event_category: 'system',
      severity,
      description,
      metadata,
      success: true
    });
  }

  /**
   * Log security violations
   */
  async logSecurityViolation(
    eventType: string,
    description: string,
    threatLevel: 'low' | 'medium' | 'high' | 'critical',
    attackType?: string,
    userId?: string,
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
    blocked: boolean = false,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: eventType,
      severity: threatLevel === 'critical' ? 'critical' : threatLevel === 'high' ? 'high' : 'medium',
      description,
      threat_level: threatLevel,
      attack_type: attackType,
      ip_address: ipAddress,
      user_agent: userAgent,
      blocked,
      metadata,
      success: !blocked
    });
  }

  /**
   * Flush events to database
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(eventsToFlush);

      if (error) {
        console.error('Failed to flush audit events:', error);
        // Re-queue events for retry (with limit to prevent memory issues)
        this.eventQueue.unshift(...eventsToFlush.slice(0, 50));
      } else {
        console.log(`Flushed ${eventsToFlush.length} audit events`);
      }
    } catch (error) {
      console.error('Audit flush error:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...eventsToFlush.slice(0, 50));
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop periodic flush
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    // Flush remaining events
    this.flush();
  }

  /**
   * Validate audit event
   */
  private validateEvent(event: AuditEvent): boolean {
    return !!(
      event.event_type &&
      event.event_category &&
      event.severity &&
      event.description &&
      typeof event.success === 'boolean'
    );
  }

  /**
   * Send security alert for critical events
   */
  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      // In a real implementation, this would send alerts via:
      // - Email to security team
      // - Slack/Discord notifications
      // - SMS alerts for critical events
      // - Integration with SIEM systems

      console.error('🚨 CRITICAL SECURITY EVENT:', {
        type: event.event_type,
        threat_level: event.threat_level,
        description: event.description,
        user_id: event.user_id,
        ip_address: event.ip_address,
        timestamp: event.timestamp,
        metadata: event.metadata
      });

      // You could implement actual alerting here
      // await sendEmailAlert(event);
      // await sendSlackAlert(event);
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  /**
   * Get audit events for analysis
   */
  async getAuditEvents(filters: {
    userId?: string;
    eventCategory?: string;
    severity?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<AuditEvent[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.eventCategory) {
        query = query.eq('event_category', filters.eventCategory);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get audit events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get audit events error:', error);
      return [];
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(days: number = 7): Promise<{
    totalEvents: number;
    criticalEvents: number;
    failedLogins: number;
    blockedAttacks: number;
    topAttackTypes: Array<{ type: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString();

      const [totalEvents, criticalEvents, failedLogins, blockedAttacks, attackTypes] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .gte('timestamp', startDateStr),

        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .gte('timestamp', startDateStr)
          .eq('severity', 'critical'),

        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .gte('timestamp', startDateStr)
          .eq('event_type', 'login_failed'),

        supabase
          .from('audit_logs')
          .select('id', { count: 'exact' })
          .gte('timestamp', startDateStr)
          .eq('event_category', 'security')
          .eq('blocked', true),

        supabase
          .from('audit_logs')
          .select('attack_type')
          .gte('timestamp', startDateStr)
          .eq('event_category', 'security')
          .not('attack_type', 'is', null)
      ]);

      // Count attack types
      const attackTypeCounts: Record<string, number> = {};
      attackTypes.data?.forEach(event => {
        if (event.attack_type) {
          attackTypeCounts[event.attack_type] = (attackTypeCounts[event.attack_type] || 0) + 1;
        }
      });

      const topAttackTypes = Object.entries(attackTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalEvents: totalEvents.count || 0,
        criticalEvents: criticalEvents.count || 0,
        failedLogins: failedLogins.count || 0,
        blockedAttacks: blockedAttacks.count || 0,
        topAttackTypes
      };
    } catch (error) {
      console.error('Failed to get security stats:', error);
      return {
        totalEvents: 0,
        criticalEvents: 0,
        failedLogins: 0,
        blockedAttacks: 0,
        topAttackTypes: []
      };
    }
  }
}

export const auditLogger = new AuditLogger();

/**
 * Audit middleware for API routes
 */
export function createAuditMiddleware(
  eventType: string,
  eventCategory: AuditEvent['event_category'],
  severity: AuditEvent['severity'] = 'medium'
) {
  return async (req: Request, userId?: string, sessionId?: string): Promise<void> => {
    const ipAddress = req.headers.get('X-Forwarded-For') ||
                     req.headers.get('CF-Connecting-IP') ||
                     'unknown';
    const userAgent = req.headers.get('User-Agent') || 'unknown';

    await auditLogger.logEvent({
      user_id: userId,
      session_id: sessionId,
      event_type: eventType,
      event_category: eventCategory,
      severity,
      description: `${eventType} request`,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true
    });
  };
}



