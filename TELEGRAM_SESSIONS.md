# Telegram Bot - Session Management

## ✅ Smart Session Management Implemented!

Your bot now uses **activity-based sessions** that stay open while you're actively using them!

## How It Works

### Old Way (Fixed Timeout) ❌
- Login → Session expires after 1 hour
- Even if you're actively using it
- Forced to re-login every hour

### New Way (Activity-Based) ✅
- Login → Session stays active while you use it
- **Only expires after 10 minutes of inactivity**
- Automatically extends on every command
- Logout when you're done

## Session Behavior

### ⏱️ Automatic Extension

Every time you use a command, your session extends by 10 more minutes:

```
You: /login
     [Successfully logged in]
     Session expires: 10 minutes from now

You: /info
     [Session extended]
     Session expires: 10 minutes from now

[5 minutes pass]

You: /stats
     [Session extended again]
     Session expires: 10 minutes from now

[Wait 10 minutes without any command]

     [Session expired - need to login again]
```

### 🔄 Commands That Extend Your Session

✅ **All these commands keep your session alive:**
- `/info` - System information
- `/stats` - Event statistics
- `/capacity` - Venue capacity
- `/gates` - Active gates
- `/alerts` - Security alerts
- `/help` - Show help

### 🚪 Manual Logout

**NEW: `/logout` command added!**

When you're done, logout manually:

```
You: /logout
Bot: 👋 Logged out successfully!
     Use /login to login again.
```

**Why logout manually?**
- Ends your session immediately
- More secure if on shared device
- Cleaner than waiting for timeout
- Good practice!

## Complete User Flow

### Scenario 1: Active Use (Session Stays Open)

```
8:00 AM - Login
8:00 AM - Session expires at 8:10 AM

8:05 AM - /info
8:05 AM - Session expires at 8:15 AM (extended!)

8:12 AM - /stats
8:12 AM - Session expires at 8:22 AM (extended!)

8:18 AM - /gates
8:18 AM - Session expires at 8:28 AM (extended!)

8:25 AM - /logout
8:25 AM - Logged out immediately
```
✅ **Session stayed open for 25 minutes because you were active!**

### Scenario 2: Idle Timeout

```
8:00 AM - Login
8:00 AM - Session expires at 8:10 AM

8:05 AM - /info
8:05 AM - Session expires at 8:15 AM (extended!)

[Don't use any commands for 10 minutes]

8:15 AM - /stats
Bot: 🔒 Authentication Required
     Please /login first to use this command.
```
❌ **Session expired after 10 minutes of inactivity**

### Scenario 3: Manual Logout

```
8:00 AM - Login
8:02 AM - /info
8:03 AM - /stats
8:04 AM - Done with my work
8:04 AM - /logout
Bot: 👋 Logged out successfully!
```
✅ **Clean logout when done!**

## Commands Reference

### Public Commands (No Login)
| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/login` | Start login process |
| `/help` | Show available commands |

### Protected Commands (Login Required)
| Command | Description | Extends Session? |
|---------|-------------|------------------|
| `/info` | System information | ✅ Yes |
| `/stats` | Event statistics | ✅ Yes |
| `/capacity` | Venue capacity | ✅ Yes |
| `/gates` | Active gates | ✅ Yes |
| `/alerts` | Security alerts | ✅ Yes |
| `/help` | Show help | ✅ Yes |
| `/logout` | End session | ❌ No (logs out) |

## Session Status

Check your session status with `/info`:

```
You: /info
Bot: 📊 System Information

✅ Status: Online
🔢 Version: 1.0.0
💾 Database: Connected
⏰ Last Update: 2025-10-06 18:30:15
🔐 Session expires in: 9 min (if idle)

💡 Use /logout when done
```

The "Session expires in" shows how long until timeout **if you remain idle**.

## Best Practices

### ✅ DO:

1. **Use /logout when done**
   - Especially on shared devices
   - Good security practice
   - Clean session management

2. **Stay active to keep session open**
   - Commands automatically extend your session
   - No need to re-login frequently

3. **Monitor session status**
   - Use `/info` to check when it expires
   - Helpful for long monitoring sessions

### ❌ DON'T:

1. **Don't worry about timeout while active**
   - Session won't expire while you're using it
   - 10 minutes is only for idle time

2. **Don't stay logged in unnecessarily**
   - Use `/logout` when done
   - Security best practice

3. **Don't share your session**
   - Always use in private one-on-one chat
   - Logout from shared devices

## Technical Details

### Session Extension Logic

```typescript
// On every protected command:
1. Check if user is authenticated
2. If yes → Extend session by 10 minutes
3. Process command
4. Return response
```

### Database Implementation

- **Table:** `telegram_auth_sessions`
- **Expiry Field:** `session_expiry` (timestamp)
- **Update:** Set to `NOW() + 10 minutes` on each command

### Idle Timeout

- **Duration:** 10 minutes
- **Trigger:** No commands used
- **Effect:** Session expires, requires re-login

## Examples

### Example 1: Monitoring Dashboard

```
You: /login
     [Login with email/password]

You: /stats
     [View statistics - session extended]

You: /capacity
     [Check capacity - session extended]

You: /alerts
     [Check alerts - session extended]

You: /gates
     [View gates - session extended]

     [Repeat as needed - session stays active]

You: /logout
     [Done monitoring - logout]
```

### Example 2: Quick Check

```
You: /login
     [Quick login]

You: /info
     [Get info - session extended]

     [Got what I needed]

You: /logout
     [Logout immediately]
```

### Example 3: Forgot to Logout

```
You: /login
     [Login]

You: /stats
     [Check stats]

     [Walk away from device]
     [10 minutes pass with no activity]

     [Session auto-expires]
     [No risk if someone accesses your device]
```

## Session Security

### 🔒 Security Features:

1. **Activity-Based Expiry**
   - 10 minute idle timeout
   - Protects against forgotten sessions

2. **Manual Logout**
   - Immediate session termination
   - User control over security

3. **Auto-Cleanup**
   - Database automatically removes expired sessions
   - No stale session buildup

4. **Session Extension Logging**
   - All extensions logged in function logs
   - Audit trail for security review

## Troubleshooting

### "Authentication Required" after being logged in

**Cause:** Session expired (10 minutes idle)

**Solution:** Login again with `/login`

### Want longer sessions?

**Current:** 10 minutes idle timeout

**Note:** This is a security feature. Use commands to keep session active, or adjust timeout in code if needed.

### Session not extending?

**Check:**
1. Are you using protected commands? (`/info`, `/stats`, etc.)
2. Is your session already expired?
3. Check logs: `supabase functions logs telegram-webhook`

## Summary

| Feature | Old | New |
|---------|-----|-----|
| Timeout | Fixed 1 hour | 10 min idle |
| Extension | ❌ No | ✅ On every command |
| Manual Logout | ❌ Not visible | ✅ `/logout` command |
| Active Use | Times out anyway | Stays open |
| Idle Timeout | 1 hour | 10 minutes |

---

## 🎯 Key Takeaways

1. **Session stays active while you use it** ⏱️
2. **10 minute idle timeout for security** 🔒
3. **Use `/logout` when done** 🚪
4. **All commands extend your session automatically** ✅

Your bot is now smarter and more secure! 🎉
