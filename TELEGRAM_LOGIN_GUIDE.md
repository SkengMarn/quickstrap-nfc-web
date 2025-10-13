# Telegram Bot - Updated Login Guide

## ✅ Bot Updated!

Your Telegram bot now uses the **same email/password** as your portal login!

## 🔐 New Login Flow

### Step 1: Start Login

**You send:**
```
/login
```

**Bot replies:**
```
🔐 Login to QuickStrap Portal

Please enter your email address:

Use /cancel to abort login.
```

---

### Step 2: Enter Email

**You send:**
```
your-email@example.com
```

**Bot replies:**
```
🔐 Email received!

Now please enter your password:
```

---

### Step 3: Enter Password

**You send:**
```
your-password
```

**Bot replies (if successful):**
```
✅ Login Successful!

Welcome back!

📊 Available Commands:
/info - System information
/stats - Event statistics
/capacity - Venue capacity
/gates - Active gates
/alerts - Security alerts

🔧 Use /help anytime for command list
```

**Bot replies (if failed):**
```
❌ Invalid Credentials

Attempt 1/3

Please enter your email address again or use /cancel to abort.
```

---

## 📱 Complete Example

```
You: /start
Bot: 👋 Welcome to QuickStrap NFC Portal!
     🔒 Authentication Required
     Please login to access system information and commands.
     Use /login to authenticate.

You: /login
Bot: 🔐 Login to QuickStrap Portal
     Please enter your email address:
     Use /cancel to abort login.

You: admin@quickstrap.com
Bot: 🔐 Email received!
     Now please enter your password:

You: MySecurePassword123
Bot: ✅ Login Successful!
     Welcome back!
     📊 Available Commands:
     /info - System information
     /stats - Event statistics
     /capacity - Venue capacity
     /gates - Active gates
     /alerts - Security alerts
     🔧 Use /help anytime for command list

You: /info
Bot: 📊 System Information
     ✅ Status: Online
     🔢 Version: 1.0.0
     👥 Active Users: 1
     💾 Database: Connected
     ⏰ Last Update: [timestamp]
     🔐 Session Expires: 59 minutes
```

---

## 🔄 Key Changes

| Old Way | New Way |
|---------|---------|
| Send `username:password` in one message | Enter email, then password separately |
| Hardcoded credentials | Uses portal authentication |
| Format: `admin:admin123` | Natural email/password entry |

---

## 🎯 Features

✅ **Portal Integration**
- Uses same credentials as web portal
- Authenticates against Supabase Auth
- Secure password verification

✅ **Two-Step Login**
- Email first
- Password second
- Natural conversation flow

✅ **Security**
- Passwords not stored in code
- 3 login attempts max
- Session expires after 1 hour
- Wrong credentials restart from email step

✅ **Error Handling**
- Invalid email format detection
- Failed login attempts tracking
- Clear error messages

---

## 🚨 Important Notes

1. **Use Portal Credentials**: Same email/password you use to login to the web portal
2. **No Colon Format**: Don't send `email:password` - send them separately
3. **Wait for Prompts**: Let the bot ask for each step
4. **Cancel Anytime**: Use `/cancel` to abort login
5. **Session Duration**: You'll stay logged in for 1 hour

---

## 🛠️ Troubleshooting

### "Invalid email format"
- Make sure your email includes `@`
- Example: `user@domain.com`

### "Invalid Credentials"
- Check your email is correct
- Verify password (case-sensitive)
- Make sure you have a portal account

### "No active login session"
- Start with `/login` first
- Don't send email/password without starting login

### "Too many failed attempts"
- Wait a moment
- Send `/login` to restart
- Make sure you're using correct credentials

### Still not working?
Check logs:
```bash
supabase functions logs telegram-webhook --follow
```

---

## 📋 All Commands

| Command | Login Required? | Description |
|---------|----------------|-------------|
| `/start` | ❌ No | Welcome message |
| `/login` | ❌ No | Start login (2 steps) |
| `/help` | ❌ No | Show commands |
| `/cancel` | ❌ No | Cancel login |
| `/info` | ✅ Yes | System information |
| `/stats` | ✅ Yes | Event statistics |
| `/capacity` | ✅ Yes | Venue capacity |
| `/gates` | ✅ Yes | Active gates |
| `/alerts` | ✅ Yes | Security alerts |
| `/logout` | ✅ Yes | End session |

---

## 🔧 For Developers

The bot now:
- Imports `@supabase/supabase-js`
- Uses `supabase.auth.signInWithPassword()`
- Validates against your Supabase Auth users
- Manages login state with `step: 'email' | 'password'`

File: `supabase/functions/telegram-webhook/index.ts`

Redeploy after changes:
```bash
supabase functions deploy telegram-webhook --no-verify-jwt
```

---

## 🎉 Ready to Use!

Open Telegram and search for: **@quickstrapbot**

Then follow the new 2-step login process!
