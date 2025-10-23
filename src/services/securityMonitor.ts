/**
 * Security Monitoring and Alerting System
 * Real-time security monitoring with intelligent alerting
 */

import { auditLogger } from '../services/auditLogger';

interface SecurityAlert {
  id: string;
  type: 'threat_detected' | 'anomaly_detected' | 'policy_violation' | 'system_compromise';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface SecurityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: SecurityCondition[];
  actions: SecurityAction[];
  cooldownMs: number;
  lastTriggered?: string;
}

interface SecurityCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: any;
  timeWindowMs?: number;
}

interface SecurityAction {
  type: 'alert' | 'block' | 'log' | 'email' | 'webhook';
  config: Record<string, any>;
}

interface ThreatIntelligence {
  maliciousIPs: Set<string>;
  suspiciousUserAgents: Set<string>;
  knownAttackPatterns: RegExp[];
  geoBlockedCountries: Set<string>;
}

class SecurityMonitor {
  private alerts: Map<string, SecurityAlert> = new Map();
  private rules: Map<string, SecurityRule> = new Map();
  private threatIntel: ThreatIntelligence;
  private monitoringInterval?: NodeJS.Timeout;
  private alertCooldowns: Map<string, number> = new Map();

  constructor() {
    this.threatIntel = this.initializeThreatIntelligence();
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  /**
   * Initialize threat intelligence data
   */
  private initializeThreatIntelligence(): ThreatIntelligence {
    return {
      maliciousIPs: new Set([
        // Add known malicious IPs here
        // These would typically come from threat intelligence feeds
      ]),
      suspiciousUserAgents: new Set([
        'sqlmap',
        'nikto',
        'nmap',
        'masscan',
        'zap',
        'burp',
        'w3af',
        'havij',
        'sqlninja'
      ]),
      knownAttackPatterns: [
        /union\s+select/i,
        /drop\s+table/i,
        /insert\s+into/i,
        /delete\s+from/i,
        /<script[^>]*>.*?<\/script>/i,
        /javascript:/i,
        /vbscript:/i,
        /onload\s*=/i,
        /onerror\s*=/i,
        /eval\s*\(/i,
        /expression\s*\(/i
      ],
      geoBlockedCountries: new Set([
        // Add countries to block if needed
        // 'CN', 'RU', 'KP' // Example
      ])
    };
  }

  /**
   * Initialize default security rules
   */
  private initializeDefaultRules(): void {
    // Rule 1: Multiple failed login attempts
    this.addRule({
      id: 'multiple_failed_logins',
      name: 'Multiple Failed Login Attempts',
      description: 'Detects multiple failed login attempts from the same IP',
      enabled: true,
      severity: 'high',
      conditions: [
        {
          field: 'event_type',
          operator: 'equals',
          value: 'login_failed',
          timeWindowMs: 15 * 60 * 1000 // 15 minutes
        }
      ],
      actions: [
        { type: 'alert', config: { channels: ['email', 'webhook'] } },
        { type: 'block', config: { duration: 30 * 60 * 1000 } } // 30 minutes
      ],
      cooldownMs: 5 * 60 * 1000 // 5 minutes
    });

    // Rule 2: Suspicious user agents
    this.addRule({
      id: 'suspicious_user_agent',
      name: 'Suspicious User Agent',
      description: 'Detects requests with known attack tool user agents',
      enabled: true,
      severity: 'critical',
      conditions: [
        {
          field: 'user_agent',
          operator: 'contains',
          value: 'sqlmap'
        }
      ],
      actions: [
        { type: 'alert', config: { channels: ['email', 'webhook', 'sms'] } },
        { type: 'block', config: { duration: 24 * 60 * 60 * 1000 } } // 24 hours
      ],
      cooldownMs: 60 * 1000 // 1 minute
    });

    // Rule 3: SQL injection attempts
    this.addRule({
      id: 'sql_injection_attempt',
      name: 'SQL Injection Attempt',
      description: 'Detects potential SQL injection attempts',
      enabled: true,
      severity: 'critical',
      conditions: [
        {
          field: 'description',
          operator: 'regex',
          value: 'union\\s+select'
        }
      ],
      actions: [
        { type: 'alert', config: { channels: ['email', 'webhook', 'sms'] } },
        { type: 'block', config: { duration: 24 * 60 * 60 * 1000 } }
      ],
      cooldownMs: 60 * 1000
    });

    // Rule 4: Unusual data access patterns
    this.addRule({
      id: 'unusual_data_access',
      name: 'Unusual Data Access Pattern',
      description: 'Detects unusual data access patterns',
      enabled: true,
      severity: 'medium',
      conditions: [
        {
          field: 'event_category',
          operator: 'equals',
          value: 'data_access',
          timeWindowMs: 60 * 60 * 1000 // 1 hour
        }
      ],
      actions: [
        { type: 'alert', config: { channels: ['email'] } },
        { type: 'log', config: {} }
      ],
      cooldownMs: 30 * 60 * 1000 // 30 minutes
    });

    // Rule 5: Rate limit violations
    this.addRule({
      id: 'rate_limit_violation',
      name: 'Rate Limit Violation',
      description: 'Detects rate limit violations',
      enabled: true,
      severity: 'medium',
      conditions: [
        {
          field: 'event_type',
          operator: 'equals',
          value: 'rate_limit_exceeded'
        }
      ],
      actions: [
        { type: 'alert', config: { channels: ['webhook'] } },
        { type: 'log', config: {} }
      ],
      cooldownMs: 10 * 60 * 1000 // 10 minutes
    });
  }

  /**
   * Add a security rule
   */
  addRule(rule: SecurityRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a security rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Process a security event
   */
  async processEvent(event: {
    eventType: string;
    eventCategory: string;
    severity: string;
    description: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    // Check against threat intelligence
    await this.checkThreatIntelligence(event);

    // Check against security rules
    await this.checkSecurityRules(event);

    // Log the event
    await auditLogger.logSecurityEvent({
      event_type: event.eventType,
      severity: event.severity as any,
      description: event.description,
      threat_level: this.calculateThreatLevel(event),
      user_id: event.userId,
      session_id: event.sessionId,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      metadata: event.metadata,
      success: true
    });
  }

  /**
   * Check event against threat intelligence
   */
  private async checkThreatIntelligence(event: any): Promise<void> {
    const threats: string[] = [];

    // Check IP address
    if (event.ipAddress && this.threatIntel.maliciousIPs.has(event.ipAddress)) {
      threats.push('Known malicious IP address');
    }

    // Check user agent
    if (event.userAgent) {
      for (const suspiciousUA of this.threatIntel.suspiciousUserAgents) {
        if (event.userAgent.toLowerCase().includes(suspiciousUA)) {
          threats.push(`Suspicious user agent: ${suspiciousUA}`);
        }
      }
    }

    // Check for attack patterns
    if (event.description) {
      for (const pattern of this.threatIntel.knownAttackPatterns) {
        if (pattern.test(event.description)) {
          threats.push(`Known attack pattern detected: ${pattern.source}`);
        }
      }
    }

    // Create alerts for detected threats
    for (const threat of threats) {
      await this.createAlert({
        type: 'threat_detected',
        severity: 'critical',
        title: 'Threat Detected',
        description: threat,
        userId: event.userId,
        sessionId: event.sessionId,
        ipAddress: event.ipAddress,
        metadata: { threat, originalEvent: event }
      });
    }
  }

  /**
   * Check event against security rules
   */
  private async checkSecurityRules(event: any): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      const cooldownKey = `${rule.id}_${event.ipAddress || 'unknown'}`;
      const lastTriggered = this.alertCooldowns.get(cooldownKey) || 0;
      if (Date.now() - lastTriggered < rule.cooldownMs) {
        continue;
      }

      // Check conditions
      if (this.evaluateConditions(rule.conditions, event)) {
        // Rule triggered
        this.alertCooldowns.set(cooldownKey, Date.now());
        rule.lastTriggered = new Date().toISOString();

        // Execute actions
        await this.executeActions(rule.actions, rule, event);
      }
    }
  }

  /**
   * Evaluate security rule conditions
   */
  private evaluateConditions(conditions: SecurityCondition[], event: any): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(event, condition.field);

      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'greater_than':
          return fieldValue > condition.value;
        case 'less_than':
          return fieldValue < condition.value;
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'regex':
          return new RegExp(condition.value, 'i').test(String(fieldValue));
        default:
          return false;
      }
    });
  }

  /**
   * Get field value from event object
   */
  private getFieldValue(event: any, field: string): any {
    const keys = field.split('.');
    let value = event;

    for (const key of keys) {
      value = value?.[key];
    }

    return value;
  }

  /**
   * Execute security rule actions
   */
  private async executeActions(actions: SecurityAction[], rule: SecurityRule, event: any): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'alert':
            await this.createAlert({
              type: 'policy_violation',
              severity: rule.severity,
              title: rule.name,
              description: rule.description,
              userId: event.userId,
              sessionId: event.sessionId,
              ipAddress: event.ipAddress,
              metadata: { rule: rule.id, action: action.type, originalEvent: event }
            });
            break;

          case 'block':
            await this.blockIP(event.ipAddress, action.config.duration);
            break;

          case 'log':
            console.log(`Security rule triggered: ${rule.name}`, event);
            break;

          case 'email':
            await this.sendEmailAlert(rule, event, action.config);
            break;

          case 'webhook':
            await this.sendWebhookAlert(rule, event, action.config);
            break;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  /**
   * Create a security alert
   */
  private async createAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const securityAlert: SecurityAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.set(securityAlert.id, securityAlert);

    // Send immediate notifications for critical alerts
    if (alert.severity === 'critical') {
      await this.sendImmediateNotification(securityAlert);
    }

    console.warn(`🚨 SECURITY ALERT: ${alert.title}`, securityAlert);
  }

  /**
   * Block an IP address
   */
  private async blockIP(ipAddress: string, durationMs: number): Promise<void> {
    if (!ipAddress) return;

    // In a real implementation, this would:
    // 1. Add IP to firewall blocklist
    // 2. Update CDN/WAF rules
    // 3. Store in database for persistence

    console.log(`Blocking IP ${ipAddress} for ${durationMs}ms`);

    // Add to threat intelligence
    this.threatIntel.maliciousIPs.add(ipAddress);
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(rule: SecurityRule, event: any, config: any): Promise<void> {
    // In a real implementation, this would send emails via:
    // - SendGrid, Mailgun, AWS SES, etc.
    console.log(`Email alert sent for rule: ${rule.name}`);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(rule: SecurityRule, event: any, config: any): Promise<void> {
    try {
      const payload = {
        rule: rule.name,
        severity: rule.severity,
        event: event,
        timestamp: new Date().toISOString()
      };

      // In a real implementation, this would send to:
      // - Slack, Discord, Microsoft Teams
      // - SIEM systems
      // - Custom webhook endpoints

      console.log(`Webhook alert sent for rule: ${rule.name}`);
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Send immediate notification for critical alerts
   */
  private async sendImmediateNotification(alert: SecurityAlert): Promise<void> {
    // In a real implementation, this would:
    // - Send SMS alerts
    // - Call emergency contacts
    // - Trigger automated response procedures

    console.error(`🚨 CRITICAL SECURITY ALERT: ${alert.title}`, alert);
  }

  /**
   * Calculate threat level based on event
   */
  private calculateThreatLevel(event: any): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;

    // Base score from severity
    switch (event.severity) {
      case 'low': score += 1; break;
      case 'medium': score += 2; break;
      case 'high': score += 3; break;
      case 'critical': score += 4; break;
    }

    // Additional scoring based on event characteristics
    if (event.ipAddress && this.threatIntel.maliciousIPs.has(event.ipAddress)) {
      score += 3;
    }

    if (event.userAgent) {
      for (const suspiciousUA of this.threatIntel.suspiciousUserAgents) {
        if (event.userAgent.toLowerCase().includes(suspiciousUA)) {
          score += 2;
        }
      }
    }

    // Determine threat level
    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.performPeriodicChecks();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Perform periodic security checks
   */
  private async performPeriodicChecks(): Promise<void> {
    try {
      // Check for unresolved critical alerts
      const criticalAlerts = Array.from(this.alerts.values())
        .filter(alert => alert.severity === 'critical' && !alert.resolved);

      if (criticalAlerts.length > 0) {
        console.warn(`Found ${criticalAlerts.length} unresolved critical alerts`);
      }

      // Clean up old alerts (older than 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      for (const [id, alert] of this.alerts.entries()) {
        if (new Date(alert.timestamp).getTime() < thirtyDaysAgo) {
          this.alerts.delete(id);
        }
      }

      // Clean up old cooldowns
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      for (const [key, timestamp] of this.alertCooldowns.entries()) {
        if (timestamp < oneHourAgo) {
          this.alertCooldowns.delete(key);
        }
      }
    } catch (error) {
      console.error('Periodic security check failed:', error);
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get security dashboard data
   */
  async getDashboardData(): Promise<{
    activeAlerts: SecurityAlert[];
    alertStats: {
      total: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    threatStats: {
      blockedIPs: number;
      suspiciousUserAgents: number;
      attackPatterns: number;
    };
    recentEvents: any[];
  }> {
    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    const alertStats = {
      total: activeAlerts.length,
      critical: activeAlerts.filter(a => a.severity === 'critical').length,
      high: activeAlerts.filter(a => a.severity === 'high').length,
      medium: activeAlerts.filter(a => a.severity === 'medium').length,
      low: activeAlerts.filter(a => a.severity === 'low').length
    };

    const threatStats = {
      blockedIPs: this.threatIntel.maliciousIPs.size,
      suspiciousUserAgents: this.threatIntel.suspiciousUserAgents.size,
      attackPatterns: this.threatIntel.knownAttackPatterns.length
    };

    // Get recent security events
    const recentEvents = await auditLogger.getAuditEvents({
      eventCategory: 'security',
      limit: 20
    });

    return {
      activeAlerts,
      alertStats,
      threatStats,
      recentEvents
    };
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      alert.resolvedBy = resolvedBy;
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }
}

export const securityMonitor = new SecurityMonitor();

/**
 * Security monitoring middleware
 */
export function createSecurityMiddleware() {
  return async (req: Request, userId?: string, sessionId?: string): Promise<void> => {
    const ipAddress = req.headers.get('X-Forwarded-For') ||
                     req.headers.get('CF-Connecting-IP') ||
                     'unknown';
    const userAgent = req.headers.get('User-Agent') || 'unknown';

    await securityMonitor.processEvent({
      eventType: 'api_request',
      eventCategory: 'system',
      severity: 'low',
      description: `${req.method} ${req.url}`,
      userId,
      sessionId,
      ipAddress,
      userAgent
    });
  };
}



