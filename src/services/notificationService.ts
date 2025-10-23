import { webhookService } from './webhookService';
import { telegramService } from './telegramService';
import { supabase } from './supabase';

export interface NotificationTemplate {
  id: string;
  name: string;
  event: string;
  template: string;
  channels: string[];
  enabled: boolean;
}

export interface NotificationRule {
  id: string;
  name: string;
  event: string;
  conditions: Record<string, any>;
  actions: string[];
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

class NotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();
  private rules: Map<string, NotificationRule> = new Map();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load templates and rules from database
      await Promise.all([
        this.loadTemplates(),
        this.loadRules(),
        webhookService.initialize(),
        telegramService.initialize(),
      ]);

      // Set up default templates if none exist
      if (this.templates.size === 0) {
        await this.createDefaultTemplates();
      }

      // Set up default rules if none exist
      if (this.rules.size === 0) {
        await this.createDefaultRules();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  // Load notification templates from database
  private async loadTemplates() {
    try {
      const { data: templates } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('enabled', true);

      if (templates) {
        templates.forEach(template => {
          this.templates.set(template.event, template);
        });
      }
    } catch (error) {
      console.warn('Failed to load notification templates:', error);
    }
  }

  // Load notification rules from database
  private async loadRules() {
    try {
      const { data: rules } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('enabled', true);

      if (rules) {
        rules.forEach(rule => {
          this.rules.set(rule.event, rule);
        });
      }
    } catch (error) {
      console.warn('Failed to load notification rules:', error);
    }
  }

  // Create default notification templates
  private async createDefaultTemplates() {
    const defaultTemplates: Omit<NotificationTemplate, 'id'>[] = [
      {
        name: 'Check-in Alert',
        event: 'checkin.created',
        template: '🎫 New check-in at {{gate_name}}\n👤 Wristband: {{wristband_id}}\n📍 Event: {{event_name}}\n⏰ {{timestamp}}',
        channels: ['telegram', 'slack'],
        enabled: true,
      },
      {
        name: 'Capacity Warning',
        event: 'capacity.alert',
        template: '⚠️ Capacity Alert: {{event_name}}\n📊 {{current_count}}/{{capacity_limit}} ({{percentage}}%)\n🚨 Status: {{alert_level}}',
        channels: ['telegram', 'slack', 'email'],
        enabled: true,
      },
      {
        name: 'Security Alert',
        event: 'security.alert',
        template: '🚨 Security Alert: {{alert_type}}\n🎫 Wristband: {{wristband_id}}\n📝 {{description}}\n⚡ Severity: {{severity}}',
        channels: ['telegram', 'slack', 'email'],
        enabled: true,
      },
      {
        name: 'Staff Status Update',
        event: 'staff.status',
        template: '👤 Staff Update: {{staff_name}}\n📍 Status: {{status}}\n🎪 Event: {{event_name}}\n📍 Location: {{location}}',
        channels: ['telegram'],
        enabled: true,
      },
      {
        name: 'Gate Approval Request',
        event: 'gate.approval_request',
        template: '🚪 New Gate Request\n📝 Name: {{gate_name}}\n👤 Created by: {{created_by}}\n📍 Location: {{location}}\n🤖 Auto-discovered: {{auto_discovered}}',
        channels: ['telegram', 'slack'],
        enabled: true,
      },
      {
        name: 'System Health Alert',
        event: 'system.health',
        template: '🔧 System Health: {{status}}\n📊 Metrics: {{metrics}}\n⚠️ Alerts: {{alerts}}',
        channels: ['telegram', 'email'],
        enabled: true,
      },
    ];

    try {
      for (const template of defaultTemplates) {
        const { data } = await supabase
          .from('notification_templates')
          .insert(template)
          .select()
          .single();

        if (data) {
          this.templates.set(data.event, data);
        }
      }
    } catch (error) {
      console.error('Failed to create default templates:', error);
    }
  }

  // Create default notification rules
  private async createDefaultRules() {
    const defaultRules: Omit<NotificationRule, 'id'>[] = [
      {
        name: 'High-frequency check-ins',
        event: 'checkin.created',
        conditions: { min_interval: 60 }, // seconds
        actions: ['webhook', 'telegram'],
        enabled: true,
        priority: 'medium',
      },
      {
        name: 'Capacity threshold alerts',
        event: 'capacity.alert',
        conditions: { threshold: 80 }, // percentage
        actions: ['webhook', 'telegram', 'email'],
        enabled: true,
        priority: 'high',
      },
      {
        name: 'Critical security alerts',
        event: 'security.alert',
        conditions: { severity: ['high', 'critical'] },
        actions: ['webhook', 'telegram', 'slack', 'email'],
        enabled: true,
        priority: 'critical',
      },
      {
        name: 'Staff offline alerts',
        event: 'staff.status',
        conditions: { status: 'offline', duration: 300 }, // 5 minutes
        actions: ['webhook', 'telegram'],
        enabled: true,
        priority: 'medium',
      },
    ];

    try {
      for (const rule of defaultRules) {
        const { data } = await supabase
          .from('notification_rules')
          .insert(rule)
          .select()
          .single();

        if (data) {
          this.rules.set(data.event, data);
        }
      }
    } catch (error) {
      console.error('Failed to create default rules:', error);
    }
  }

  // Process and send notification
  async sendNotification(event: string, data: any, eventId?: string) {
    await this.initialize();

    try {
      // Check if we have a rule for this event
      const rule = this.rules.get(event);
      if (!rule || !rule.enabled) {
        return { success: false, reason: 'No active rule' };
      }

      // Check if conditions are met
      if (!this.evaluateConditions(rule.conditions, data)) {
        return { success: false, reason: 'Conditions not met' };
      }

      // Get template for formatting
      const template = this.templates.get(event);
      if (!template || !template.enabled) {
        return { success: false, reason: 'No active template' };
      }

      // Format message using template
      const formattedMessage = this.formatMessage(template.template, data);

      // Send via webhooks (which will trigger n8n workflows)
      const webhookResults = await webhookService.triggerNotification(event, {
        ...data,
        formatted_message: formattedMessage,
        template_id: template.id,
        rule_id: rule.id,
        priority: rule.priority,
        channels: template.channels,
      }, eventId);

      // Also send directly to Telegram if enabled
      let telegramResult = null;
      if (template.channels.includes('telegram')) {
        try {
          telegramResult = await this.sendToTelegram(event, data);
        } catch (error) {
          console.warn('Failed to send Telegram notification:', error);
        }
      }

      // Log the notification
      await this.logNotification(event, data, formattedMessage, webhookResults);

      return {
        success: true,
        message: formattedMessage,
        webhookResults,
        priority: rule.priority,
      };
    } catch (error) {
      console.error(`Failed to send notification for event ${event}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Evaluate rule conditions
  private evaluateConditions(conditions: Record<string, any>, data: any): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'threshold':
          if (data.percentage && data.percentage < value) return false;
          break;
        case 'severity':
          if (Array.isArray(value) && !value.includes(data.severity)) return false;
          break;
        case 'status':
          if (data.status !== value) return false;
          break;
        case 'min_interval':
          // This would need additional logic to track timing
          break;
        default:
          if (data[key] !== value) return false;
      }
    }
    return true;
  }

  // Format message using template
  private formatMessage(template: string, data: any): string {
    let message = template;
    
    // Replace template variables
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Format timestamp if present
    if (data.timestamp) {
      const date = new Date(data.timestamp);
      message = message.replace('{{timestamp}}', date.toLocaleString());
    }

    return message;
  }

  // Log notification for audit trail
  private async logNotification(event: string, data: any, message: string, results: any[]) {
    try {
      await supabase
        .from('audit_log')
        .insert({
          action: 'notification_processed',
          details: {
            event,
            message,
            data_keys: Object.keys(data),
            webhook_count: results.length,
            success_count: results.filter(r => r.success).length,
          },
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  // Send to Telegram based on event type
  private async sendToTelegram(event: string, data: any) {
    switch (event) {
      case 'checkin.created':
        return telegramService.sendCheckinNotification(data);
      case 'capacity.alert':
        return telegramService.sendCapacityAlert(data);
      case 'security.alert':
        return telegramService.sendSecurityAlert(data);
      case 'staff.status':
        return telegramService.sendStaffStatusUpdate(data);
      case 'gate.approval_request':
        return telegramService.sendGateApprovalRequest(data);
      case 'system.health':
        return telegramService.sendSystemHealthAlert(data);
      default:
        // For unknown events, send a generic message
        return telegramService.sendMessage({
          text: `🔔 *${event}*\n\n${JSON.stringify(data, null, 2)}`,
          parse_mode: 'Markdown'
        });
    }
  }

  // Convenience methods for specific events
  async notifyCheckin(checkinData: any) {
    return this.sendNotification('checkin.created', checkinData, checkinData.event_id);
  }

  async notifyCapacityAlert(eventData: any) {
    return this.sendNotification('capacity.alert', eventData, eventData.event_id);
  }

  async notifySecurityAlert(alertData: any) {
    return this.sendNotification('security.alert', alertData, alertData.event_id);
  }

  async notifyStaffStatus(staffData: any) {
    return this.sendNotification('staff.status', staffData, staffData.event_id);
  }

  async notifyGateRequest(gateData: any) {
    return this.sendNotification('gate.approval_request', gateData, gateData.event_id);
  }

  async notifySystemHealth(healthData: any) {
    return this.sendNotification('system.health', healthData);
  }

  // Management methods
  async createTemplate(template: Omit<NotificationTemplate, 'id'>) {
    const { data } = await supabase
      .from('notification_templates')
      .insert(template)
      .select()
      .single();

    if (data) {
      this.templates.set(data.event, data);
    }

    return data;
  }

  async updateTemplate(id: string, updates: Partial<NotificationTemplate>) {
    const { data } = await supabase
      .from('notification_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (data) {
      this.templates.set(data.event, data);
    }

    return data;
  }

  async createRule(rule: Omit<NotificationRule, 'id'>) {
    const { data } = await supabase
      .from('notification_rules')
      .insert(rule)
      .select()
      .single();

    if (data) {
      this.rules.set(data.event, data);
    }

    return data;
  }

  async updateRule(id: string, updates: Partial<NotificationRule>) {
    const { data } = await supabase
      .from('notification_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (data) {
      this.rules.set(data.event, data);
    }

    return data;
  }

  // Get current configuration
  getConfiguration() {
    return {
      templates: Array.from(this.templates.values()),
      rules: Array.from(this.rules.values()),
      webhooks: webhookService.getConfiguration(),
    };
  }
}

export const notificationService = new NotificationService();
