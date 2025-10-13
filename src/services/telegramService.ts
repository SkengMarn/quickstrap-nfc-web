interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

interface TelegramMessage {
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  disable_notification?: boolean;
  reply_markup?: any;
}

interface AuthenticatedUser {
  userId: number;
  username: string;
  authenticatedAt: number;
  sessionExpiry: number;
}

interface WebhookUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

class TelegramService {
  private config: TelegramConfig = {
    botToken: '',
    chatId: '',
    enabled: false
  };

  // Authentication state
  private authenticatedUsers: Map<number, AuthenticatedUser> = new Map();
  private loginAttempts: Map<number, { username?: string; attempts: number; lastAttempt: number }> = new Map();

  // Valid credentials - REMOVED HARDCODED VALUES FOR SECURITY
  // In production, this should authenticate against Supabase Auth or secure backend
  private validCredentials: Record<string, string> = {};

  // Session timeout (1 hour)
  private sessionTimeout = 3600000;

  // Initialize with configuration
  async initialize() {
    try {
      // Load from environment variables only (never hardcode credentials)
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
      const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

      this.config = {
        botToken,
        chatId,
        enabled: !!(botToken && chatId)
      };

      if (!botToken || !chatId) {
        console.warn('Telegram service disabled: Missing VITE_TELEGRAM_BOT_TOKEN or VITE_TELEGRAM_CHAT_ID environment variables');
      } else {
        console.log('Telegram service initialized:', {
          enabled: this.config.enabled,
          hasBotToken: !!this.config.botToken,
          hasChatId: !!this.config.chatId
        });
      }
    } catch (error) {
      console.error('Failed to initialize Telegram service:', error);
    }
  }

  // Update configuration
  async updateConfig(config: Partial<TelegramConfig>) {
    this.config = { ...this.config, ...config };
    
    // SECURITY FIX: Use secure storage for sensitive config
    const { secureStorage } = await import('../utils/secureStorage');
    secureStorage.setItem('telegram_config', this.config, { 
      encrypt: true,
      expiry: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  // Get current configuration
  getConfig(): TelegramConfig {
    return { ...this.config };
  }

  // Send message to Telegram
  async sendMessage(message: TelegramMessage): Promise<{ success: boolean; error?: string; messageId?: number }> {
    if (!this.config.enabled) {
      return { success: false, error: 'Telegram not configured' };
    }

    if (!this.config.botToken || !this.config.chatId) {
      return { success: false, error: 'Missing bot token or chat ID' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
      
      const payload = {
        chat_id: this.config.chatId,
        text: message.text,
        parse_mode: message.parse_mode || 'Markdown',
        disable_notification: message.disable_notification || false
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        return { 
          success: true, 
          messageId: result.result.message_id 
        };
      } else {
        return { 
          success: false, 
          error: result.description || 'Failed to send message' 
        };
      }
    } catch (error) {
      console.error('Telegram send error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  // Send check-in notification
  async sendCheckinNotification(data: {
    wristband_id: string;
    gate_name: string;
    event_name: string;
    timestamp: string;
    staff_member: string;
    status?: string;
    category?: string;
  }) {
    const message = {
      text: `🎫 *New Check-in*

👤 Wristband: \`${data.wristband_id}\`
🚪 Gate: ${data.gate_name}
🎪 Event: ${data.event_name}
⏰ Time: ${new Date(data.timestamp).toLocaleString()}
👨‍💼 Staff: ${data.staff_member}
${data.category ? `🏷️ Category: ${data.category}` : ''}
${data.status ? `✅ Status: ${data.status}` : ''}`,
      parse_mode: 'Markdown' as const
    };

    return this.sendMessage(message);
  }

  // Send capacity alert
  async sendCapacityAlert(data: {
    event_name: string;
    current_count: number;
    capacity_limit: number;
    percentage: number;
    alert_level: string;
  }) {
    const emoji = data.alert_level === 'critical' ? '🚨' : '⚠️';
    
    const message = {
      text: `${emoji} *Capacity Alert*

🎪 Event: ${data.event_name}
📊 Attendance: ${data.current_count}/${data.capacity_limit} (${data.percentage}%)
🚨 Level: ${data.alert_level.toUpperCase()}

${data.percentage >= 100 ? '🔴 **CAPACITY REACHED**' : data.percentage >= 90 ? '🟡 **NEAR CAPACITY**' : '🟢 **MONITORING**'}`,
      parse_mode: 'Markdown' as const
    };

    return this.sendMessage(message);
  }

  // Send security alert
  async sendSecurityAlert(data: {
    alert_type: string;
    wristband_id: string;
    event_name: string;
    description: string;
    severity: string;
    staff_member: string;
  }) {
    const emoji = data.severity === 'critical' ? '🚨' : data.severity === 'high' ? '⚠️' : '🔔';
    
    const message = {
      text: `${emoji} *Security Alert*

🚨 Type: ${data.alert_type}
🎫 Wristband: \`${data.wristband_id}\`
📝 ${data.description}
⚡ Severity: ${data.severity.toUpperCase()}
🎪 Event: ${data.event_name}
👨‍💼 Reported by: ${data.staff_member}

${data.severity === 'critical' ? '🔴 **IMMEDIATE ATTENTION REQUIRED**' : ''}`,
      parse_mode: 'Markdown' as const
    };

    return this.sendMessage(message);
  }

  // Send staff status update
  async sendStaffStatusUpdate(data: {
    staff_name: string;
    status: string;
    event_name: string;
    location?: string;
  }) {
    const statusEmoji = {
      online: '🟢',
      offline: '🔴',
      break: '🟡',
      busy: '🟠'
    }[data.status] || '⚪';

    const message = {
      text: `👤 *Staff Update*

${statusEmoji} ${data.staff_name} is now **${data.status.toUpperCase()}**
🎪 Event: ${data.event_name}
${data.location ? `📍 Location: ${data.location}` : ''}
⏰ Time: ${new Date().toLocaleString()}`,
      parse_mode: 'Markdown' as const
    };

    return this.sendMessage(message);
  }

  // Send gate approval request
  async sendGateApprovalRequest(data: {
    gate_name: string;
    event_name: string;
    created_by: string;
    location?: string;
    auto_discovered: boolean;
  }) {
    const message = {
      text: `🚪 *Gate Approval Request*

📝 Gate Name: ${data.gate_name}
🎪 Event: ${data.event_name}
👤 Created by: ${data.created_by}
${data.location ? `📍 Location: ${data.location}` : ''}
🤖 Auto-discovered: ${data.auto_discovered ? 'Yes' : 'No'}

⏳ *Awaiting approval in portal*`,
      parse_mode: 'Markdown' as const
    };

    return this.sendMessage(message);
  }

  // Send system health alert
  async sendSystemHealthAlert(data: {
    status: string;
    metrics: any;
    alerts: string[];
  }) {
    const statusEmoji = data.status === 'healthy' ? '🟢' : data.status === 'warning' ? '🟡' : '🔴';
    
    const message = {
      text: `🔧 *System Health Update*

${statusEmoji} Status: **${data.status.toUpperCase()}**
📊 Metrics: ${JSON.stringify(data.metrics, null, 2)}
${data.alerts.length > 0 ? `⚠️ Alerts:\n${data.alerts.map(alert => `• ${alert}`).join('\n')}` : '✅ No active alerts'}
⏰ Time: ${new Date().toLocaleString()}`,
      parse_mode: 'Markdown' as const
    };

    return this.sendMessage(message);
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; error?: string; botInfo?: any }> {
    if (!this.config.botToken) {
      return { success: false, error: 'No bot token configured' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/getMe`;
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && result.ok) {
        // Send test message if chat ID is available
        if (this.config.chatId) {
          await this.sendMessage({
            text: '🧪 *Test Message*\n\nYour QuickStrap Portal is connected to Telegram! 🚀',
            parse_mode: 'Markdown'
          });
        }

        return { 
          success: true, 
          botInfo: result.result 
        };
      } else {
        return { 
          success: false, 
          error: result.description || 'Failed to get bot info' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  // Get chat info (to help find chat ID)
  async getChatUpdates(): Promise<{ success: boolean; updates?: any[]; error?: string }> {
    if (!this.config.botToken) {
      return { success: false, error: 'No bot token configured' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/getUpdates`;
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && result.ok) {
        return {
          success: true,
          updates: result.result
        };
      } else {
        return {
          success: false,
          error: result.description || 'Failed to get updates'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // ==================== AUTHENTICATION & WEBHOOK HANDLING ====================

  // Check if user is authenticated
  private isAuthenticated(userId: number): boolean {
    const user = this.authenticatedUsers.get(userId);
    if (!user) return false;

    // Check if session expired
    if (Date.now() > user.sessionExpiry) {
      this.authenticatedUsers.delete(userId);
      return false;
    }

    return true;
  }

  // Send message to specific chat
  private async sendMessageToChat(chatId: number, message: TelegramMessage): Promise<any> {
    if (!this.config.botToken) {
      throw new Error('Bot token not configured');
    }

    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: message.text,
      parse_mode: message.parse_mode || 'Markdown',
      disable_notification: message.disable_notification || false,
      reply_markup: message.reply_markup
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  // Handle /start command
  private async handleStartCommand(chatId: number, userId: number, username?: string) {
    const isAuth = this.isAuthenticated(userId);

    const text = isAuth
      ? `🔓 Welcome back, ${username || 'User'}!\n\nYou're logged in. Available commands:\n\n📊 *Information Commands:*\n/info - System information\n/stats - Event statistics\n/capacity - Venue capacity status\n/gates - Active gates list\n/alerts - Recent alerts\n\n🔧 *Other Commands:*\n/help - Show help\n/logout - Logout`
      : `👋 Welcome to QuickStrap NFC Portal!\n\n🔒 *Authentication Required*\n\nPlease login to access system information and commands.\n\nUse /login to authenticate.`;

    await this.sendMessageToChat(chatId, { text, parse_mode: 'Markdown' });
  }

  // Handle /login command
  private async handleLoginCommand(chatId: number, userId: number) {
    if (this.isAuthenticated(userId)) {
      await this.sendMessageToChat(chatId, {
        text: '✅ You are already logged in!\n\nUse /logout to logout first.',
        parse_mode: 'Markdown'
      });
      return;
    }

    // Initialize login attempt
    this.loginAttempts.set(userId, { attempts: 0, lastAttempt: Date.now() });

    await this.sendMessageToChat(chatId, {
      text: '🔐 *Login Process*\n\nPlease send your credentials in this format:\n`username:password`\n\nExample: `admin:admin123`\n\nUse /cancel to abort login.',
      parse_mode: 'Markdown'
    });
  }

  // Handle /logout command
  private async handleLogoutCommand(chatId: number, userId: number, username?: string) {
    if (!this.isAuthenticated(userId)) {
      await this.sendMessageToChat(chatId, {
        text: '❌ You are not logged in.',
        parse_mode: 'Markdown'
      });
      return;
    }

    this.authenticatedUsers.delete(userId);
    await this.sendMessageToChat(chatId, {
      text: `👋 Logged out successfully!\n\nUse /login to login again.`,
      parse_mode: 'Markdown'
    });
  }

  // Handle /help command
  private async handleHelpCommand(chatId: number, userId: number) {
    const isAuth = this.isAuthenticated(userId);

    const text = isAuth
      ? `📚 *Available Commands*\n\n📊 *Information Commands:*\n/info - System information\n/stats - Event statistics\n/capacity - Venue capacity status\n/gates - Active gates list\n/alerts - Recent security alerts\n\n🔧 *Account Commands:*\n/help - Show this help\n/logout - Logout from bot\n\nAll information commands require authentication.`
      : `📚 *Help*\n\n🔒 *Authentication Required*\n\nPlease /login first to access commands.\n\n*After login you'll have access to:*\n• System information\n• Event statistics\n• Capacity monitoring\n• Gate management\n• Security alerts`;

    await this.sendMessageToChat(chatId, { text, parse_mode: 'Markdown' });
  }

  // Handle credential submission
  private async handleCredentialSubmission(chatId: number, userId: number, text: string) {
    const attempt = this.loginAttempts.get(userId);
    if (!attempt) {
      await this.sendMessageToChat(chatId, {
        text: '❌ No active login session. Use /login to start.',
        parse_mode: 'Markdown'
      });
      return;
    }

    // Parse credentials
    const parts = text.split(':');
    if (parts.length !== 2) {
      await this.sendMessageToChat(chatId, {
        text: '❌ Invalid format. Use: `username:password`\n\nExample: `admin:admin123`',
        parse_mode: 'Markdown'
      });
      return;
    }

    const [username, password] = parts.map(p => p.trim());

    // SECURITY FIX: Use Supabase Auth instead of hardcoded credentials
    try {
      // Import Supabase client dynamically to avoid circular dependencies
      const { supabase } = await import('./supabase');
      
      // Authenticate against Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username, // Treat username as email
        password: password
      });

      if (error || !data.user) {
        // Failed login
        attempt.attempts++;
        attempt.lastAttempt = Date.now();

        if (attempt.attempts >= 3) {
          this.loginAttempts.delete(userId);
          await this.sendMessageToChat(chatId, {
            text: '🚫 *Login Failed*\n\nToo many failed attempts. Please try /login again later.',
            parse_mode: 'Markdown'
          });
        } else {
          await this.sendMessageToChat(chatId, {
            text: `❌ *Invalid Credentials*\n\nAttempt ${attempt.attempts}/3\n\nPlease try again or use /cancel to abort.`,
            parse_mode: 'Markdown'
          });
        }
        return;
      }

      // Successful login
      const user: AuthenticatedUser = {
        userId,
        username: data.user.email || username,
        authenticatedAt: Date.now(),
        sessionExpiry: Date.now() + this.sessionTimeout
      };

      this.authenticatedUsers.set(userId, user);
      this.loginAttempts.delete(userId);

      await this.sendMessageToChat(chatId, {
        text: `✅ *Login Successful!*\n\nWelcome, ${data.user.email}!\n\n📊 *Available Commands:*\n/info - System information\n/stats - Event statistics\n/capacity - Venue capacity\n/gates - Active gates\n/alerts - Security alerts\n\n🔧 Use /help anytime for command list`,
        parse_mode: 'Markdown'
      });

      // Sign out immediately to avoid session conflicts
      await supabase.auth.signOut();
      
    } catch (authError) {
      console.error('Telegram auth error:', authError);
      await this.sendMessageToChat(chatId, {
        text: '❌ *Authentication Error*\n\nSystem temporarily unavailable. Please try again later.',
        parse_mode: 'Markdown'
      });
    }
  }

  // Protected command handler
  private async handleProtectedCommand(chatId: number, userId: number, command: string) {
    if (!this.isAuthenticated(userId)) {
      await this.sendMessageToChat(chatId, {
        text: '🔒 *Authentication Required*\n\nPlease /login first to use this command.',
        parse_mode: 'Markdown'
      });
      return;
    }

    // Handle different protected commands
    switch (command) {
      case '/info':
        await this.handleInfoCommand(chatId, userId);
        break;
      case '/stats':
        await this.handleStatsCommand(chatId, userId);
        break;
      case '/capacity':
        await this.handleCapacityCommand(chatId, userId);
        break;
      case '/gates':
        await this.handleGatesCommand(chatId, userId);
        break;
      case '/alerts':
        await this.handleAlertsCommand(chatId, userId);
        break;
      default:
        await this.sendMessageToChat(chatId, {
          text: '❌ Unknown command. Use /help to see available commands.',
          parse_mode: 'Markdown'
        });
    }
  }

  // Info command (protected)
  private async handleInfoCommand(chatId: number, userId: number) {
    const user = this.authenticatedUsers.get(userId);
    const sessionRemaining = user ? Math.floor((user.sessionExpiry - Date.now()) / 60000) : 0;

    const text = `📊 *System Information*\n\n✅ Status: Online\n🔢 Version: 1.0.0\n👥 Active Users: ${this.authenticatedUsers.size}\n💾 Database: Connected\n⏰ Last Update: ${new Date().toLocaleString()}\n🔐 Session Expires: ${sessionRemaining} minutes`;

    await this.sendMessageToChat(chatId, { text, parse_mode: 'Markdown' });
  }

  // Stats command (protected)
  private async handleStatsCommand(chatId: number, userId: number) {
    // In production, fetch real stats from backend
    const text = `📈 *Event Statistics*\n\n🎫 Total Check-ins: 1,234\n🚪 Active Gates: 8\n👤 Unique Visitors: 987\n📊 Peak Hour: 8:00 PM (245 check-ins)\n⚡ Avg Response: 120ms\n✅ Success Rate: 98.7%`;

    await this.sendMessageToChat(chatId, { text, parse_mode: 'Markdown' });
  }

  // Capacity command (protected)
  private async handleCapacityCommand(chatId: number, userId: number) {
    // In production, fetch real capacity data
    const text = `🏟️ *Venue Capacity Status*\n\n📊 Main Event:\n  Current: 850 / 1000\n  Capacity: 85%\n  Status: 🟡 Near Capacity\n\n📊 VIP Area:\n  Current: 45 / 50\n  Capacity: 90%\n  Status: 🟡 Near Capacity\n\n📊 General Admission:\n  Current: 650 / 800\n  Capacity: 81%\n  Status: 🟢 Good`;

    await this.sendMessageToChat(chatId, { text, parse_mode: 'Markdown' });
  }

  // Gates command (protected)
  private async handleGatesCommand(chatId: number, userId: number) {
    // In production, fetch real gate data
    const text = `🚪 *Active Gates*\n\n✅ Gate A - Main Entrance\n  Status: Active\n  Check-ins: 342\n\n✅ Gate B - VIP Entrance\n  Status: Active\n  Check-ins: 89\n\n✅ Gate C - Side Entrance\n  Status: Active\n  Check-ins: 156\n\n🟡 Gate D - Emergency Exit\n  Status: Standby\n  Check-ins: 0`;

    await this.sendMessageToChat(chatId, { text, parse_mode: 'Markdown' });
  }

  // Alerts command (protected)
  private async handleAlertsCommand(chatId: number, userId: number) {
    // In production, fetch real alerts
    const text = `🚨 *Recent Security Alerts*\n\n🟢 *Low Priority*\n• Duplicate scan attempt - Gate A (5 min ago)\n• Gate auto-discovery - Gate E (12 min ago)\n\n🟡 *Medium Priority*\n• Capacity 85% reached - Main Event (3 min ago)\n\n✅ No critical alerts`;

    await this.sendMessageToChat(chatId, { text, parse_mode: 'Markdown' });
  }

  // Main webhook handler
  async handleWebhook(update: WebhookUpdate): Promise<{ success: boolean; error?: string }> {
    try {
      const message = update.message;
      if (!message || !message.text) {
        return { success: true }; // Ignore non-text messages
      }

      const chatId = message.chat.id;
      const userId = message.from.id;
      const text = message.text.trim();
      const username = message.from.username || message.from.first_name;

      // Handle commands
      if (text.startsWith('/')) {
        const command = text.split(' ')[0].toLowerCase();

        switch (command) {
          case '/start':
            await this.handleStartCommand(chatId, userId, username);
            break;
          case '/login':
            await this.handleLoginCommand(chatId, userId);
            break;
          case '/logout':
            await this.handleLogoutCommand(chatId, userId, username);
            break;
          case '/help':
            await this.handleHelpCommand(chatId, userId);
            break;
          case '/cancel':
            this.loginAttempts.delete(userId);
            await this.sendMessageToChat(chatId, {
              text: '❌ Login cancelled.',
              parse_mode: 'Markdown'
            });
            break;
          case '/info':
          case '/stats':
          case '/capacity':
          case '/gates':
          case '/alerts':
            await this.handleProtectedCommand(chatId, userId, command);
            break;
          default:
            await this.sendMessageToChat(chatId, {
              text: '❌ Unknown command. Use /help for available commands.',
              parse_mode: 'Markdown'
            });
        }
      } else {
        // Handle credential submission if user is in login flow
        const attempt = this.loginAttempts.get(userId);
        if (attempt) {
          await this.handleCredentialSubmission(chatId, userId, text);
        } else {
          await this.sendMessageToChat(chatId, {
            text: '❓ Please use /help to see available commands.',
            parse_mode: 'Markdown'
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook handler error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Set webhook URL
  async setWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config.botToken) {
      return { success: false, error: 'Bot token not configured' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/setWebhook`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.description || 'Failed to set webhook'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // Get webhook info
  async getWebhookInfo(): Promise<{ success: boolean; info?: any; error?: string }> {
    if (!this.config.botToken) {
      return { success: false, error: 'Bot token not configured' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.botToken}/getWebhookInfo`;
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && result.ok) {
        return { success: true, info: result.result };
      } else {
        return {
          success: false,
          error: result.description || 'Failed to get webhook info'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}

export const telegramService = new TelegramService();
