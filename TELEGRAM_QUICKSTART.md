# Telegram Bot Quick Start

## 🚨 Quick Fix - Get Your Bot Working Now!

Your bot wasn't working because there was no webhook endpoint to receive messages. Now it's fixed!

## Step 1: Get Your Bot Token

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` (or if you already have a bot, send `/mybots`)
3. Follow instructions to get your bot token
4. Copy the token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 2: Run the Setup Script

Open your terminal in this project directory and run:

```bash
cd /Users/jew/Desktop/quickstrap_nfc_web
./setup-telegram-bot.sh
```

The script will:
- Deploy the webhook endpoint to Supabase
- Configure your bot token
- Register the webhook with Telegram

## Step 3: Test Your Bot

1. Open Telegram and search for your bot name
2. Click "Start" or send `/start`
3. You should see a welcome message!

### Try these commands:

```
/start   - See welcome message
/login   - Start login process
/help    - Get help
```

### Login:

```
1. Send: /login
2. Bot asks for credentials
3. Send: admin:admin123
4. You're logged in!
```

### After login, try:

```
/info      - System information
/stats     - Event statistics
/capacity  - Venue capacity
/gates     - Active gates
/alerts    - Security alerts
/logout    - Logout
```

## Troubleshooting

### "Supabase CLI not found"

Install it:
```bash
npm install -g supabase
```

Then link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### "Bot not responding"

1. Check if function deployed:
   ```bash
   supabase functions list
   ```

2. Check function logs:
   ```bash
   supabase functions logs telegram-webhook --follow
   ```

3. Verify webhook is set:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

### "Authentication not working"

Default credentials are:
- `admin:admin123`
- `staff:staff123`
- `manager:manager123`

Format: `username:password` (no spaces)

### View logs

```bash
supabase functions logs telegram-webhook --follow
```

## Manual Setup (if script fails)

### 1. Deploy function:
```bash
supabase functions deploy telegram-webhook --no-verify-jwt
```

### 2. Set bot token:
```bash
echo "YOUR_BOT_TOKEN" | supabase secrets set TELEGRAM_BOT_TOKEN --env-file -
```

### 3. Get webhook URL:
Your webhook URL will be:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-webhook
```

Replace `YOUR_PROJECT_REF` with your actual project reference from Supabase dashboard.

### 4. Set webhook:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-webhook"}'
```

## Next Steps

### Change credentials

Edit `supabase/functions/telegram-webhook/index.ts` line 20-24:

```typescript
const validCredentials: Record<string, string> = {
  'admin': 'your-secure-password',
  'staff': 'another-password',
  'manager': 'third-password'
};
```

Then redeploy:
```bash
supabase functions deploy telegram-webhook --no-verify-jwt
```

### Connect to real data

The bot currently shows demo data. To connect to your real database:

1. Import Supabase client in the edge function
2. Query your database tables
3. Return real data in command handlers

Example:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function handleStats(botToken: string, chatId: number, userId: number) {
  // Query real stats
  const { data, error } = await supabase
    .from('check_ins')
    .select('*', { count: 'exact' })

  const text = `📈 *Event Statistics*\n\n🎫 Total Check-ins: ${data?.length || 0}\n...`
  await sendMessage(botToken, chatId, text);
}
```

## Support

If you're still having issues:

1. Check logs: `supabase functions logs telegram-webhook --follow`
2. Verify webhook: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
3. Test function directly: Send a POST request to your webhook URL
4. Make sure your Supabase project is not paused

## Bot Commands Reference

| Command | Access | Description |
|---------|--------|-------------|
| /start | Public | Welcome message |
| /login | Public | Begin authentication |
| /help | Public | Show commands |
| /cancel | Public | Cancel login |
| /logout | Authenticated | End session |
| /info | Authenticated | System info |
| /stats | Authenticated | Event statistics |
| /capacity | Authenticated | Venue capacity |
| /gates | Authenticated | Active gates |
| /alerts | Authenticated | Security alerts |

## Security Notes

- Sessions expire after 1 hour
- Max 3 login attempts
- All info commands require authentication
- Store credentials securely (use database in production)
- Consider adding rate limiting
- Use HTTPS for webhook (automatic with Supabase)
