#!/bin/bash

# Telegram Bot Setup Script
# This script deploys the webhook endpoint and configures your Telegram bot

echo "🤖 Telegram Bot Setup"
echo "====================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Ask for bot token
echo "📝 Please enter your Telegram Bot Token:"
echo "(Get it from @BotFather on Telegram)"
read -p "Token: " BOT_TOKEN

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ Bot token is required!"
    exit 1
fi

echo ""
echo "🚀 Step 1: Deploying Edge Function..."
echo ""

# Deploy the edge function
supabase functions deploy telegram-webhook --no-verify-jwt

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy edge function"
    exit 1
fi

echo ""
echo "✅ Edge function deployed successfully!"
echo ""

# Set the bot token as a secret
echo "🔐 Step 2: Setting bot token as secret..."
echo ""

echo "$BOT_TOKEN" | supabase secrets set TELEGRAM_BOT_TOKEN --env-file -

if [ $? -ne 0 ]; then
    echo "❌ Failed to set bot token secret"
    exit 1
fi

echo ""
echo "✅ Bot token set successfully!"
echo ""

# Get the function URL
echo "📡 Step 3: Getting webhook URL..."
echo ""

# Get project reference
PROJECT_REF=$(supabase status | grep "API URL" | awk '{print $3}' | cut -d'/' -f3 | cut -d'.' -f1)

if [ -z "$PROJECT_REF" ]; then
    echo "⚠️  Could not auto-detect project reference"
    echo "Please enter your Supabase project reference:"
    echo "(Found in your Supabase dashboard URL: https://supabase.com/dashboard/project/YOUR-REF)"
    read -p "Project Reference: " PROJECT_REF
fi

WEBHOOK_URL="https://${PROJECT_REF}.supabase.co/functions/v1/telegram-webhook"

echo ""
echo "📍 Webhook URL: $WEBHOOK_URL"
echo ""

# Set the webhook with Telegram
echo "🔗 Step 4: Registering webhook with Telegram..."
echo ""

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo ""
    echo "✅ Webhook registered successfully!"
else
    echo ""
    echo "❌ Failed to register webhook"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your bot is now ready to use!"
echo ""
echo "📱 Next steps:"
echo "1. Open Telegram and search for your bot"
echo "2. Send /start to begin"
echo "3. Send /login to authenticate"
echo "4. Login with: admin:admin123"
echo ""
echo "🔐 Default credentials:"
echo "   admin:admin123"
echo "   staff:staff123"
echo "   manager:manager123"
echo ""
echo "⚙️  To change credentials, edit:"
echo "   supabase/functions/telegram-webhook/index.ts (line 20-24)"
echo ""
echo "📊 To view logs:"
echo "   supabase functions logs telegram-webhook"
echo ""
