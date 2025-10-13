# Telegram Bot Setup for QuickStrap Portal

## 🤖 Step 1: Create Telegram Bot

1. **Open Telegram** and search for `@BotFather`
2. **Send**: `/newbot`
3. **Name your bot**: "QuickStrap Notifications"
4. **Username**: "quickstrap_alerts_bot" (or similar)
5. **Save the Bot Token**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## 📱 Step 2: Get Chat ID

### For Personal Messages:
```bash
# 1. Start a chat with your bot
# 2. Send any message to it
# 3. Replace YOUR_BOT_TOKEN and run:
curl https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates

# Look for: "chat":{"id":12345678}
```

### For Group Notifications:
1. Create a Telegram group
2. Add your bot to the group
3. Make the bot an admin (optional but recommended)
4. Send a message mentioning the bot: `@your_bot_name hello`
5. Use the same curl command to get the group chat ID (will be negative)

## ⚙️ Step 3: Set Up n8n

### Install n8n:
```bash
npm install n8n -g
n8n start
```

### Configure Telegram Credentials in n8n:
1. Go to **Settings → Credentials**
2. Click **Add Credential**
3. Select **Telegram**
4. Enter your **Bot Token**
5. Save as "QuickStrap Bot"

### Import Workflow:
1. Go to **Workflows**
2. Click **Import from File**
3. Upload `telegram-n8n-setup.json`
4. **Edit the workflow**:
   - Replace `YOUR_CHAT_ID_HERE` with your actual chat ID
   - Update credential references
5. **Activate the workflow**

## 🔗 Step 4: Connect to Portal

### Get Webhook URL:
1. In n8n, open your workflow
2. Click the **Webhook Trigger** node
3. Copy the **Production URL** (looks like: `https://your-n8n-server.com/webhook/abc123`)

### Add to Portal:
1. Go to **Administration → Webhooks** in your portal
2. Click **Add New Webhook**
3. **Name**: "Telegram Notifications"
4. **URL**: Paste your n8n webhook URL
5. Click **Add**
6. Click **Test** to verify connection

## 📋 Step 5: Configure Notification Settings

In your portal's webhook management:

### Telegram Configuration:
- ✅ **Enable Telegram**
- **Bot Token**: Your bot token (for reference)
- **Chat ID**: Your chat ID (for reference)

### Event Types:
- ✅ **Check-in Events** → Real-time check-in notifications
- ✅ **Capacity Alerts** → When events reach capacity thresholds
- ✅ **Security Alerts** → Fraud detection and security issues
- ✅ **Staff Status** → When staff go online/offline
- ✅ **Gate Requests** → New gate approval requests

## 🧪 Step 6: Test the System

### Test Webhook Connection:
1. In portal, go to **Webhooks**
2. Find your Telegram webhook
3. Click **Test Webhook**
4. Check your Telegram for test message

### Test Real Events:
1. Simulate a check-in in your portal
2. Check Telegram for notification
3. Verify message formatting and content

## 📱 Example Messages You'll Receive

### Check-in Notification:
```
🎫 New Check-in

👤 Wristband: NFC_12345
🚪 Gate: Main Entrance
🎪 Event: Summer Music Festival
⏰ Time: 2024-01-15 14:30:25
👨‍💼 Staff: John Smith
```

### Capacity Alert:
```
⚠️ Alert Notification

Capacity Alert: Summer Music Festival
📊 850/1000 (85%)
🚨 Status: warning

📊 Priority: high
🎪 Event: Summer Music Festival
⏰ Time: 2024-01-15 15:45:12
```

### Critical Alert:
```
🚨 CRITICAL ALERT 🚨

Security Alert: duplicate_scan
🎫 Wristband: NFC_12345
📝 Multiple scans detected within 30 seconds
⚡ Severity: critical

⚡ This requires immediate attention!
🎪 Event: Summer Music Festival
⏰ Time: 2024-01-15 16:20:45
```

## 🔧 Troubleshooting

### Bot Not Responding:
- Check bot token is correct
- Ensure bot is not blocked
- Verify chat ID is correct

### Webhook Errors:
- Check n8n is running
- Verify webhook URL is accessible
- Check n8n execution logs

### Message Formatting Issues:
- Check Markdown syntax in n8n
- Verify data fields are available
- Test with simple text first

## 🚀 Advanced Features

### Multiple Chat Groups:
- Create different workflows for different teams
- Route events by priority or type
- Set up escalation chains

### Rich Formatting:
- Use Telegram's Markdown or HTML
- Add inline keyboards for actions
- Include images or files

### Custom Logic:
- Filter events by time of day
- Rate limiting for high-volume events
- Custom message templates per event type

## 📞 Support

If you need help:
1. Check n8n execution logs
2. Test webhook manually with curl
3. Verify Telegram bot permissions
4. Check portal webhook configuration

Your Telegram notifications are now ready! 🎉
