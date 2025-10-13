import { supabase } from './supabase';

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  eventId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationConfig {
  telegram?: {
    enabled: boolean;
    botToken?: string;
    chatId?: string;
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl?: string;
  };
  email?: {
    enabled: boolean;
    recipients?: string[];
  };
}

class WebhookService {
  private webhookEndpoints: Map<string, string> = new Map();
  private notificationConfig: NotificationConfig = {};

  // Initialize webhook service with configuration
  async initialize() {
    try {
      // Load webhook configuration from database
      const { data: config } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'webhooks')
        .single();

      if (config?.settings) {
        this.notificationConfig = config.settings;
        this.webhookEndpoints = new Map(Object.entries(config.settings.endpoints || {}));
      }
    } catch (error) {
      console.warn('Failed to load webhook configuration:', error);
    }
  }

  // Register a webhook endpoint for n8n workflows
  registerWebhook(name: string, url: string) {
    this.webhookEndpoints.set(name, url);
    this.saveConfiguration();
  }

  // Remove a webhook endpoint
  unregisterWebhook(name: string) {
    this.webhookEndpoints.delete(name);
    this.saveConfiguration();
  }

  // Send webhook payload to all registered endpoints
  async sendWebhook(payload: WebhookPayload) {
    const promises = Array.from(this.webhookEndpoints.entries()).map(
      async ([name, url]) => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'QuickStrap-Portal/1.0',
            },
            body: JSON.stringify({
              ...payload,
              source: 'quickstrap-portal',
              webhook_name: name,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          return { name, success: true, response: await response.text() };
        } catch (error) {
          console.error(`Webhook ${name} failed:`, error);
          return { name, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    );

    const results = await Promise.allSettled(promises);
    return results.map((result, index) => 
      result.status === 'fulfilled' ? result.value : {
        name: Array.from(this.webhookEndpoints.keys())[index],
        success: false,
        error: result.reason?.message || 'Unknown error'
      }
    );
  }

  // Trigger specific event notifications
  async triggerNotification(event: string, data: any, eventId?: string) {
    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      eventId,
      metadata: {
        portal_version: '1.0',
        environment: 'production',
      },
    };

    // Send to webhooks
    const webhookResults = await this.sendWebhook(payload);

    // Log the notification
    await this.logNotification(payload, webhookResults);

    return webhookResults;
  }

  // Event-specific notification methods
  async notifyCheckin(checkinData: any) {
    return this.triggerNotification('checkin.created', {
      wristband_id: checkinData.wristband_id,
      gate_name: checkinData.gate_name,
      event_id: checkinData.event_id,
      timestamp: checkinData.timestamp,
      staff_member: checkinData.staff_member,
    }, checkinData.event_id);
  }

  async notifyCapacityAlert(eventData: any) {
    return this.triggerNotification('capacity.alert', {
      event_id: eventData.event_id,
      event_name: eventData.event_name,
      current_count: eventData.current_count,
      capacity_limit: eventData.capacity_limit,
      percentage: Math.round((eventData.current_count / eventData.capacity_limit) * 100),
      alert_level: eventData.current_count >= eventData.capacity_limit ? 'critical' : 'warning',
    }, eventData.event_id);
  }

  async notifySecurityAlert(alertData: any) {
    return this.triggerNotification('security.alert', {
      alert_type: alertData.type,
      wristband_id: alertData.wristband_id,
      event_id: alertData.event_id,
      description: alertData.description,
      severity: alertData.severity || 'medium',
      staff_member: alertData.staff_member,
    }, alertData.event_id);
  }

  async notifyStaffStatus(staffData: any) {
    return this.triggerNotification('staff.status', {
      staff_id: staffData.staff_id,
      staff_name: staffData.staff_name,
      status: staffData.status, // online, offline, break
      event_id: staffData.event_id,
      location: staffData.location,
    }, staffData.event_id);
  }

  async notifyGateRequest(gateData: any) {
    return this.triggerNotification('gate.approval_request', {
      gate_name: gateData.gate_name,
      event_id: gateData.event_id,
      created_by: gateData.created_by,
      location: gateData.location,
      auto_discovered: gateData.auto_discovered,
      request_id: gateData.id,
    }, gateData.event_id);
  }

  async notifySystemHealth(healthData: any) {
    return this.triggerNotification('system.health', {
      status: healthData.status,
      metrics: healthData.metrics,
      alerts: healthData.alerts,
      timestamp: new Date().toISOString(),
    });
  }

  // Update notification configuration
  async updateNotificationConfig(config: Partial<NotificationConfig>) {
    this.notificationConfig = { ...this.notificationConfig, ...config };
    await this.saveConfiguration();
  }

  // Get current configuration
  getConfiguration() {
    return {
      webhooks: Object.fromEntries(this.webhookEndpoints),
      notifications: this.notificationConfig,
    };
  }

  // Save configuration to database
  private async saveConfiguration() {
    try {
      const settings = {
        endpoints: Object.fromEntries(this.webhookEndpoints),
        notifications: this.notificationConfig,
      };

      await supabase
        .from('system_settings')
        .upsert({
          category: 'webhooks',
          settings,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to save webhook configuration:', error instanceof Error ? error.message : error);
    }
  }

  // Log notification for audit trail
  private async logNotification(payload: WebhookPayload, results: any[]) {
    try {
      await supabase
        .from('audit_log')
        .insert({
          action: 'notification_sent',
          details: {
            event: payload.event,
            webhook_results: results,
            payload_size: JSON.stringify(payload).length,
          },
          timestamp: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  // Test webhook endpoint
  async testWebhook(name: string, url?: string) {
    const testUrl = url || this.webhookEndpoints.get(name);
    if (!testUrl) {
      throw new Error(`Webhook ${name} not found`);
    }

    const testPayload: WebhookPayload = {
      event: 'test.webhook',
      data: {
        message: 'This is a test webhook from QuickStrap Portal',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      metadata: {
        test: true,
        webhook_name: name,
      },
    };

    try {
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'QuickStrap-Portal/1.0',
        },
        body: JSON.stringify(testPayload),
      });

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: await response.text(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const webhookService = new WebhookService();
