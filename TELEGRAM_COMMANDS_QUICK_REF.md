# Telegram Bot - Quick Command Reference

## 📱 Your Mobile Portal Command Center

---

## 🔑 Getting Started

```
/start    - Welcome message
/login    - Login with portal credentials
/help     - Show all commands
/tools    - Show admin tools
/logout   - End session
```

---

## 📊 Information Commands

```
/info      - System status
/stats     - Event statistics
/capacity  - Venue capacity
/gates     - Active gates list
/alerts    - Security alerts
```

---

## 🛠️ Administrative Tools

### 🎫 Wristbands

```
/wristband <id>
Example: /wristband WB123456
```

### ✅ Check-ins

```
/checkin <wristband_id> <gate_name>
Example: /checkin WB123456 Gate_A
```

### 🚪 Gates

```
/gate list                        - List all gates
/gate status <name>               - Gate details
/gate approve <id>                - Approve gate
/gate create <name> <event_id>    - Create gate

Examples:
/gate list
/gate status Gate_A
/gate approve 123
/gate create Gate_VIP 456
```

### 🎪 Events

```
/event list          - List all events
/event active        - Active events only
/event info <id>     - Event details

Examples:
/event list
/event active
/event info 123
```

### 🏟️ Capacity

```
/capacityset <event_id> <limit>
Example: /capacityset 123 1000
```

---

## ⚡ Quick Actions

### Check Wristband & Check-in
```
1. /wristband WB123456
2. /checkin WB123456 Gate_A
```

### Monitor Event
```
1. /event info 123
2. /stats
3. /capacity
```

### Approve New Gate
```
1. /gate list
2. /gate approve 789
```

---

## 💡 Pro Tips

- All commands extend your session
- Session expires after 10 min idle
- Use `/tools` for detailed help
- Commands are case-sensitive
- Gate names must match exactly

---

## 🔒 Security

✅ Login required for all admin tools
✅ Email/password auto-deleted from chat
✅ 10 minute idle timeout
✅ All actions logged with your email
✅ Use `/logout` when done

---

## 📞 Need Help?

```
/help     - Quick reference
/tools    - Detailed admin tools help
```

---

## 🎯 Common Tasks

| Task | Command |
|------|---------|
| Check wristband | `/wristband WB123` |
| Manual check-in | `/checkin WB123 Gate_A` |
| List gates | `/gate list` |
| Approve gate | `/gate approve 123` |
| Check event | `/event info 123` |
| Set capacity | `/capacityset 123 1000` |
| View stats | `/stats` |
| Check alerts | `/alerts` |

---

**Bot:** @quickstrapbot
**Docs:** See `TELEGRAM_ADMIN_TOOLS.md`
