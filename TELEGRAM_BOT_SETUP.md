# Telegram Bot Setup Guide

## Overview

Your Telegram bot now has **authentication-based access control**. Users must login with credentials before accessing any information commands.

## Features

✅ **Authentication System**
- Username/password login
- Session management (1 hour timeout)
- Login attempt limiting (max 3 attempts)
- Secure logout

✅ **Protected Commands** (require login)
- `/info` - System information
- `/stats` - Event statistics
- `/capacity` - Venue capacity status
- `/gates` - Active gates list
- `/alerts` - Recent security alerts

✅ **Public Commands**
- `/start` - Start the bot
- `/login` - Begin login process
- `/logout` - End session
- `/help` - Show available commands
- `/cancel` - Cancel login process

## How It Works

### 1. User Flow

```
User → /start → Welcome message with login prompt
     → /login → Bot asks for credentials
     → user sends: username:password
     → Bot verifies credentials
     → ✅ Success → Access to all commands
     → ❌ Failure → Retry (max 3 attempts)
```

### 2. Authentication

Default credentials (in `telegramService.ts` line 55):
```typescript
'admin': 'admin123',
'staff': 'staff123',
'manager': 'manager123'
```

**⚠️ IMPORTANT:** In production, update `validCredentials` to fetch from your secure backend/database.

### 3. Session Management

- Sessions expire after 1 hour (configurable at line 62)
- Automatic session cleanup on expiry
- Users must re-login after session expires

## Setup Instructions

### Step 1: Configure Your Bot Token

Edit `telegramService.ts` line 24 or set environment variable:

```typescript
const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
```

### Step 2: Create API Endpoint for Webhook

Create an API endpoint to receive webhook updates from Telegram:

**Example (Express.js):**

```typescript
// src/api/telegram-webhook.ts
import { Request, Response } from 'express';
import { telegramService } from '../services/telegramService';

export async function telegramWebhookHandler(req: Request, res: Response) {
  try {
    const update = req.body;

    // Initialize service if needed
    await telegramService.initialize();

    // Handle the webhook
    const result = await telegramService.handleWebhook(update);

    if (result.success) {
      res.status(200).json({ ok: true });
    } else {
      console.error('Webhook error:', result.error);
      res.status(200).json({ ok: true }); // Still return 200 to Telegram
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// In your Express app
app.post('/api/telegram/webhook', telegramWebhookHandler);
```

**Example (Supabase Edge Function):**

```typescript
// supabase/functions/telegram-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const update = await req.json()

    // Import and use your telegram service
    // const result = await handleWebhook(update)

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

### Step 3: Set Webhook URL

Set your webhook URL with Telegram:

```typescript
// Initialize service
await telegramService.initialize();

// Set webhook
const result = await telegramService.setWebhook('https://your-domain.com/api/telegram/webhook');

if (result.success) {
  console.log('Webhook set successfully!');
} else {
  console.error('Failed to set webhook:', result.error);
}
```

**Or via curl:**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

### Step 4: Verify Webhook

Check webhook status:

```typescript
const info = await telegramService.getWebhookInfo();
console.log('Webhook info:', info);
```

## Usage Examples

### User Interaction

```
User: /start
Bot: 👋 Welcome to QuickStrap NFC Portal!
     🔒 Authentication Required
     Please login to access system information and commands.
     Use /login to authenticate.

User: /login
Bot: 🔐 Login Process
     Please send your credentials in this format:
     username:password
     Example: admin:admin123
     Use /cancel to abort login.

User: admin:admin123
Bot: ✅ Login Successful!
     Welcome, admin!
     📊 Available Commands:
     /info - System information
     /stats - Event statistics
     /capacity - Venue capacity
     /gates - Active gates
     /alerts - Security alerts
     🔧 Use /help anytime for command list

User: /info
Bot: 📊 System Information
     ✅ Status: Online
     🔢 Version: 1.0.0
     👥 Active Users: 1
     💾 Database: Connected
     ⏰ Last Update: 2025-10-06 10:30:15
     🔐 Session Expires: 59 minutes
```

### Unauthorized Access Attempt

```
User: /info (without login)
Bot: 🔒 Authentication Required
     Please /login first to use this command.
```

## Customization

### Add New Protected Commands

1. Add command handler in `telegramService.ts`:

```typescript
// Add to handleProtectedCommand switch
case '/mycommand':
  await this.handleMyCommand(chatId, userId);
  break;

// Add handler method
private async handleMyCommand(chatId: number, userId: number) {
  const text = `🎯 My Custom Command\n\nYour data here...`;
  await this.sendMessageToChat(chatId, { text, parse_mode: 'Markdown' });
}
```

2. Update help text to include new command

### Change Session Timeout

Edit line 62 in `telegramService.ts`:

```typescript
// 1 hour = 3600000ms
// 30 minutes = 1800000ms
// 2 hours = 7200000ms
private sessionTimeout = 3600000;
```

### Integrate with Your Backend

Replace mock data with real API calls:

```typescript
private async handleStatsCommand(chatId: number, userId: number) {
  // Fetch real data from your backend
  const response = await fetch('https://your-api.com/stats');
  const stats = await response.json();

  const text = `📈 *Event Statistics*\n\n🎫 Total Check-ins: ${stats.checkins}\n...`;
  await this.sendMessageToChat(chatId, { text, parse_mode: 'Markdown' });
}
```

### Use Database for Credentials

```typescript
// Replace validCredentials with database lookup
private async verifyCredentials(username: string, password: string): Promise<boolean> {
  const response = await fetch('https://your-api.com/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const result = await response.json();
  return result.valid;
}

// Update handleCredentialSubmission to use it
if (await this.verifyCredentials(username, password)) {
  // Login successful
}
```

## Security Recommendations

1. **Never commit credentials** - Use environment variables or secure database
2. **Use HTTPS** for webhook endpoint
3. **Implement rate limiting** on webhook endpoint
4. **Hash passwords** in production
5. **Add IP whitelisting** (Telegram webhook IPs)
6. **Monitor failed login attempts** and implement blocking
7. **Use secure session storage** (Redis/database) instead of in-memory Map

## Troubleshooting

### Bot not responding

1. Check webhook is set correctly: `getWebhookInfo()`
2. Verify bot token is correct
3. Check webhook endpoint is publicly accessible
4. Review server logs for errors

### Authentication issues

1. Verify credentials in `validCredentials`
2. Check session hasn't expired
3. Clear login attempts: restart service

### Commands not working

1. Ensure user is logged in
2. Check command spelling (case-sensitive)
3. Review webhook handler logs

## API Reference

### Main Methods

- `handleWebhook(update)` - Process incoming webhook updates
- `setWebhook(url)` - Configure webhook URL
- `getWebhookInfo()` - Get webhook status
- `initialize()` - Initialize service with config

### Notification Methods (existing)

These still work for sending alerts to admin chat:
- `sendCheckinNotification(data)`
- `sendCapacityAlert(data)`
- `sendSecurityAlert(data)`
- `sendStaffStatusUpdate(data)`
- `sendGateApprovalRequest(data)`
- `sendSystemHealthAlert(data)`

## Testing

Test the bot locally:

1. Use ngrok to expose local server:
   ```bash
   ngrok http 3000
   ```

2. Set webhook to ngrok URL:
   ```typescript
   await telegramService.setWebhook('https://abc123.ngrok.io/api/telegram/webhook');
   ```

3. Chat with your bot on Telegram

4. Monitor console logs for debugging

## Next Steps

- [ ] Set up production webhook endpoint
- [ ] Configure environment variables
- [ ] Update credentials to use secure backend
- [ ] Add database for session persistence
- [ ] Implement additional commands
- [ ] Set up monitoring and logging
- [ ] Add user management interface
