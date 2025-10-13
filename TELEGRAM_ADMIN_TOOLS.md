# Telegram Bot - Administrative Tools

## 🛠️ Portal Management via Telegram

You can now manage your QuickStrap portal directly from Telegram! All portal operations are available as bot commands.

## 📋 Command List

Use `/tools` in the bot to see all available commands.

---

## 🎫 Wristband Management

### Check Wristband Status

**Command:** `/wristband <wristband_id>`

**Example:**
```
You: /wristband WB123456

Bot: 🎫 Wristband Info

ID: WB123456
Status: ✅ Active
Event: Summer Festival 2025
Category: VIP
Registered: 2025-10-01 14:30:00
```

**Use Case:** Verify wristband before check-in, check status, troubleshoot issues

---

## ✅ Check-in Management

### Manual Check-in

**Command:** `/checkin <wristband_id> <gate_name>`

**Example:**
```
You: /checkin WB123456 Gate_A

Bot: ✅ Check-in Successful!

🎫 Wristband: WB123456
🚪 Gate: Gate_A
👤 Staff: admin@quickstrap.com
⏰ Time: 2025-10-06 18:45:23
```

**Use Cases:**
- Manual check-in when NFC fails
- Remote check-in from command center
- Backup check-in method
- Testing check-in flow

---

## 🚪 Gate Management

### List All Gates

**Command:** `/gate list`

**Example:**
```
You: /gate list

Bot: 🚪 Gates

✅ Gate_A (Summer Festival)
✅ Gate_B (Summer Festival)
🟡 Gate_C_Pending (Summer Festival)
❌ Gate_D_Inactive (Winter Event)
```

### Check Gate Status

**Command:** `/gate status <gate_name>`

**Example:**
```
You: /gate status Gate_A

Bot: 🚪 Gate Status

Name: Gate_A
Status: ✅ approved
Event: Summer Festival 2025
Check-ins: 342
Location: Main Entrance
```

### Approve Pending Gate

**Command:** `/gate approve <gate_id>`

**Example:**
```
You: /gate approve 123

Bot: ✅ Gate 123 approved!
```

**Use Case:** Approve auto-discovered gates from remote location

### Create New Gate

**Command:** `/gate create <gate_name> <event_id>`

**Example:**
```
You: /gate create Gate_Emergency_Exit 456

Bot: ✅ Gate created!

ID: 789
Name: Gate_Emergency_Exit
Status: Pending approval
```

**Use Case:** Add gates remotely without portal access

---

## 🎪 Event Management

### List All Events

**Command:** `/event list`

**Example:**
```
You: /event list

Bot: 🎪 Events

✅ Summer Festival - 2025-08-15 (ID: 123)
✅ Music Concert - 2025-09-20 (ID: 124)
⚪ Winter Gala - 2025-12-31 (ID: 125)
```

### List Active Events Only

**Command:** `/event active`

**Example:**
```
You: /event active

Bot: 🎪 Active Events

✅ Summer Festival - 2025-08-15 (ID: 123)
✅ Music Concert - 2025-09-20 (ID: 124)
```

### Get Event Details

**Command:** `/event info <event_id>`

**Example:**
```
You: /event info 123

Bot: 🎪 Event Info

Name: Summer Festival
Status: ✅ Active
Date: 2025-08-15
Gates: 5
Wristbands: 1,234
Check-ins: 987
```

**Use Case:** Quick event overview, monitor progress

---

## 🏟️ Capacity Management

### Set Event Capacity

**Command:** `/capacityset <event_id> <limit>`

**Example:**
```
You: /capacityset 123 1000

Bot: ✅ Capacity Updated!

Event ID: 123
New Limit: 1000
```

**Use Cases:**
- Update capacity remotely
- Emergency capacity adjustments
- Quick limit changes during event

---

## 📖 Command Reference Quick Guide

| Category | Command | Parameters |
|----------|---------|------------|
| **Wristband** | `/wristband` | `<wristband_id>` |
| **Check-in** | `/checkin` | `<wristband_id> <gate_name>` |
| **Gate List** | `/gate list` | None |
| **Gate Status** | `/gate status` | `<gate_name>` |
| **Gate Approve** | `/gate approve` | `<gate_id>` |
| **Gate Create** | `/gate create` | `<gate_name> <event_id>` |
| **Event List** | `/event list` | None |
| **Event Active** | `/event active` | None |
| **Event Info** | `/event info` | `<event_id>` |
| **Capacity** | `/capacityset` | `<event_id> <limit>` |

---

## 💡 Usage Examples

### Scenario 1: Gate Auto-Discovery Approval

```
[Gate auto-discovered at event]

You: /gate list
Bot: Shows pending Gate_C

You: /gate status Gate_C
Bot: Shows details - looks good

You: /gate approve 123
Bot: ✅ Gate 123 approved!
```

### Scenario 2: Manual Check-in (NFC Failed)

```
[Guest wristband won't scan]

You: /wristband WB789012
Bot: Shows wristband is active

You: /checkin WB789012 Gate_A
Bot: ✅ Check-in successful!

[Guest can proceed]
```

### Scenario 3: Monitor Event Progress

```
You: /event active
Bot: Lists active events

You: /event info 123
Bot: Shows 987/1000 check-ins

You: /stats
Bot: Shows detailed statistics

[Everything looks good]
```

### Scenario 4: Emergency Capacity Change

```
[Fire marshal requires lower capacity]

You: /event info 123
Bot: Current limit 1000

You: /capacityset 123 800
Bot: ✅ Capacity updated to 800

[Capacity adjusted immediately]
```

### Scenario 5: Real-time Gate Monitoring

```
You: /gate list
Bot: Shows all gates

You: /gate status Gate_A
Bot: 342 check-ins

[5 minutes later]

You: /gate status Gate_A
Bot: 378 check-ins

[Monitor any gate remotely]
```

---

## 🔐 Security & Permissions

### Authentication Required

All admin tools require login:

```
You: /gate list
Bot: 🔒 Authentication Required
     Please /login first.
```

### Session Management

- Commands extend your session
- 10 minute idle timeout
- Use `/logout` when done

### Audit Trail

- All commands logged
- Staff email recorded
- Timestamp on all operations

---

## 🚀 Real-World Use Cases

### Event Manager

**Morning Setup:**
```
/event active         # Check today's events
/gate list            # Verify all gates ready
/capacityset 123 1000 # Set final capacity
```

**During Event:**
```
/stats                # Monitor progress
/gate status Gate_A   # Check busy gate
/event info 123       # Overall status
```

**Problem Solving:**
```
/wristband WB123      # Verify guest issue
/checkin WB123 Gate_B # Manual check-in
```

### Security Staff

**Gate Monitoring:**
```
/gate list            # All gate statuses
/gate status Gate_C   # Specific gate
/checkin WB456 Gate_C # Manual entry
```

**Incident Response:**
```
/wristband WB789      # Check wristband
/event info 123       # Event status
/alerts               # Security alerts
```

### Operations Manager

**Remote Management:**
```
/event list           # All events today
/capacityset 123 900  # Adjust capacity
/gate approve 456     # Approve new gate
/gate create Gate_VIP 123  # Add VIP gate
```

**Reporting:**
```
/stats                # Overall stats
/event info 123       # Event details
/capacity             # Capacity status
```

---

## 📱 Mobile Command Center

Use Telegram as your mobile command center:

✅ **Monitor events** - Real-time status anywhere
✅ **Approve gates** - No portal login needed
✅ **Manual check-ins** - Backup when NFC fails
✅ **Update capacity** - Quick adjustments
✅ **Check wristbands** - Verify on the go

---

## 🔄 Command Flow Examples

### Quick Check-in Flow

```
1. /wristband WB123  ← Verify valid
2. /checkin WB123 Gate_A  ← Process
3. Done! ✅
```

### Gate Setup Flow

```
1. /gate list  ← See current gates
2. /gate create Gate_VIP 123  ← Add new gate
3. /gate approve 789  ← Approve it
4. /gate status Gate_VIP  ← Confirm active
```

### Event Monitoring Flow

```
1. /event active  ← See today's events
2. /event info 123  ← Get details
3. /stats  ← View statistics
4. /capacity  ← Check capacity
5. Repeat as needed
```

---

## 🆘 Troubleshooting

### "Wristband not found"

**Check:**
1. Verify wristband ID correct
2. Check if wristband registered
3. Use `/event list` to find event ID
4. Contact admin if still issues

### "Gate not found"

**Check:**
1. Verify gate name exact (case-sensitive)
2. Use `/gate list` to see all gates
3. Check gate belongs to correct event
4. Use gate ID instead of name if needed

### "Authentication Required"

**Solution:**
```
/login
[Enter credentials]
[Try command again]
```

### "Error processing command"

**Steps:**
1. Check command syntax
2. Verify parameters correct
3. Try `/tools` for usage help
4. Check logs if admin

---

## 💼 Best Practices

### 1. Regular Monitoring

Set up monitoring routine:
- Check `/stats` every hour
- Monitor `/capacity` during peak times
- Review `/alerts` frequently

### 2. Session Management

- Login at start of shift
- Commands keep session alive
- Logout when done: `/logout`

### 3. Quick Verification

Before manual operations:
- Always check wristband first: `/wristband`
- Verify gate status: `/gate status`
- Confirm event active: `/event info`

### 4. Documentation

Keep notes of:
- Manual check-ins performed
- Gates approved
- Capacity changes made

---

## 📊 Command Statistics

Track your usage:
- Use `/info` to see session time
- Check logs for audit trail
- Monitor performance in portal

---

## 🎯 Tips & Tricks

### Speed Tips

**Use shortcuts:**
```
/wristband WB123     # Instead of typing full command
/gate list           # Quick gate overview
/event active        # Only active events
```

### Batch Operations

**Check multiple items:**
```
/gate list           # Get all gate IDs
/gate status Gate_A  # Check first
/gate status Gate_B  # Check second
/gate status Gate_C  # Check third
```

### Mobile Efficiency

**Save common commands:**
- Create Telegram notes with common commands
- Use command history (up arrow)
- Bookmark frequently used IDs

---

## 🔄 Updates & Maintenance

### Check for Updates

Bot automatically uses latest features.
No updates needed on your end!

### New Features

Watch for:
- New admin commands
- Enhanced reporting
- Additional integrations

---

## 📞 Support

### Command Help

```
/tools       # All commands
/help        # Quick reference
<command>    # Shows usage if wrong
```

### Need More Help?

- Check logs: `supabase functions logs telegram-webhook`
- Review portal for details
- Contact system admin

---

## 🎉 Summary

Your Telegram bot is now a **full portal admin tool!**

✅ Manage wristbands
✅ Process check-ins
✅ Control gates
✅ Monitor events
✅ Adjust capacity

All from your phone! 📱

Use `/tools` to get started! 🚀
