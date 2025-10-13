# 🧭 QuickStrap Telegram Command Library

Complete command reference for the QuickStrap NFC Event Management System via Telegram.

## 🚀 Getting Started

1. **Authentication Required**: Use `/login` first
2. **Command Format**: `/quickstrap <command> [arguments...]`
3. **Help**: `/quickstrap help` for command list

---

## 🪪 1. Wristband Management

| Command | Description | Example |
|---------|-------------|---------|
| `link_ticket_wristband <WristbandID> <TicketCode>` | Links a valid ticket to a wristband | `/quickstrap link_ticket_wristband WB123 TK456789` |
| `unlink_wristband <WristbandID>` | Unlinks a wristband from its ticket (admin only) | `/quickstrap unlink_wristband WB123` |
| `activate_wristband <WristbandID>` | Marks wristband as active and ready for scanning | `/quickstrap activate_wristband WB123` |
| `deactivate_wristband <WristbandID>` | Temporarily deactivates a wristband | `/quickstrap deactivate_wristband WB123` |
| `replace_wristband <OldID> <NewID>` | Transfers access to new wristband | `/quickstrap replace_wristband WB123 WB456` |
| `get_wristband_info <WristbandID>` | Returns detailed wristband information | `/quickstrap get_wristband_info WB123` |
| `verify_wristband <NFC_ID>` | Checks if NFC wristband is valid | `/quickstrap verify_wristband NFC789` |
| `list_wristbands_event <EventID>` | Lists all wristbands for an event | `/quickstrap list_wristbands_event EVT001` |

---

## 🎟️ 2. Ticket Operations

| Command | Description | Example |
|---------|-------------|---------|
| `issue_ticket <EventID> <Category> <UserID>` | Creates a new ticket entry | `/quickstrap issue_ticket EVT001 VIP USER123` |
| `cancel_ticket <TicketCode>` | Cancels a ticket and linked wristband | `/quickstrap cancel_ticket TK456789` |
| `verify_ticket <TicketCode>` | Checks ticket validity and status | `/quickstrap verify_ticket TK456789` |
| `transfer_ticket <TicketCode> <NewUserID>` | Reassigns ticket ownership | `/quickstrap transfer_ticket TK456789 USER456` |

---

## 🚪 3. Gate Management

| Command | Description | Example |
|---------|-------------|---------|
| `register_gate <EventID> <GateName> <Category>` | Adds a gate to an event | `/quickstrap register_gate EVT001 "Main Entrance" ENTRY` |
| `activate_gate <GateID>` | Marks gate as active for scanning | `/quickstrap activate_gate GATE001` |
| `deactivate_gate <GateID>` | Deactivates a malfunctioning gate | `/quickstrap deactivate_gate GATE001` |
| `sync_gates_all <EventID>` | Forces gate data synchronization | `/quickstrap sync_gates_all EVT001` |

---

## 🧍 4. Staff & Security Operations

| Command | Description | Example |
|---------|-------------|---------|
| `add_staff <Phone> <Role> <EventID>` | Registers new staff member | `/quickstrap add_staff +1234567890 SCANNER EVT001` |
| `update_staff_role <StaffID> <Role>` | Updates staff member's role | `/quickstrap update_staff_role STAFF001 ADMIN` |
| `remove_staff <StaffID>` | Removes staff access | `/quickstrap remove_staff STAFF001` |

**Available Roles:** `SCANNER`, `ADMIN`, `SECURITY`, `MANAGER`

---

## 🔒 5. Fraud & Security Controls

| Command | Description | Example |
|---------|-------------|---------|
| `log_fraud_case <WristbandID> <EventID> <Type>` | Logs suspicious activity | `/quickstrap log_fraud_case WB123 EVT001 DUPLICATE_ENTRY` |
| `flag_wristband <WristbandID> <Reason>` | Flags wristband for investigation | `/quickstrap flag_wristband WB123 "Suspicious activity"` |
| `unflag_wristband <WristbandID>` | Removes flag after verification | `/quickstrap unflag_wristband WB123` |

**Fraud Types:** `DUPLICATE_ENTRY`, `FAKE_NFC`, `MULTI_SCAN`, `SUSPICIOUS_BEHAVIOR`

---

## 🧾 6. Check-In Operations

| Command | Description | Example |
|---------|-------------|---------|
| `record_checkin <WristbandID> <GateID>` | Manually logs a check-in event | `/quickstrap record_checkin WB123 GATE001` |
| `get_checkin_log <WristbandID>` | Retrieves all check-in records | `/quickstrap get_checkin_log WB123` |
| `get_recent_checkins <EventID> <Minutes>` | Lists recent check-ins | `/quickstrap get_recent_checkins EVT001 30` |

---

## 📊 7. Reporting & Analytics Tools

| Command | Description | Example |
|---------|-------------|---------|
| `report_event_summary <EventID>` | Full event performance overview | `/quickstrap report_event_summary EVT001` |
| `report_gate_activity <EventID>` | Gate-by-gate scan volume and issues | `/quickstrap report_gate_activity EVT001` |
| `report_staff_performance <EventID>` | Staff rankings by performance | `/quickstrap report_staff_performance EVT001` |
| `report_fraud_summary <EventID>` | Fraud cases and suspicious activity | `/quickstrap report_fraud_summary EVT001` |

---

## 🧩 8. System Maintenance & Admin Commands

| Command | Description | Example |
|---------|-------------|---------|
| `purge_cache <EventID>` | Clears cached gate and wristband states | `/quickstrap purge_cache EVT001` |
| `archive_event <EventID>` | Archives event data for storage | `/quickstrap archive_event EVT001` |
| `version` | Displays current system version | `/quickstrap version` |

---

## 💬 9. Messaging & Notification Tools

| Command | Description | Example |
|---------|-------------|---------|
| `notify_staff <EventID> <Message>` | Sends message to all event staff | `/quickstrap notify_staff EVT001 "Break time in 10 minutes"` |
| `broadcast_alert <EventID> <AlertType>` | Pushes emergency or system alerts | `/quickstrap broadcast_alert EVT001 emergency` |

**Alert Types:** `emergency`, `security`, `weather`, `capacity`, `system`

---

## 🧠 10. Developer / Debug Tools

| Command | Description | Example |
|---------|-------------|---------|
| `debug_event_sync <EventID>` | Tests synchronization endpoints | `/quickstrap debug_event_sync EVT001` |
| `simulate_checkin <WristbandID> <GateID>` | Runs mock check-in for testing | `/quickstrap simulate_checkin WB123 GATE001` |

---

## 📱 Quick Reference Examples

### **Common Workflows**

**1. Link and Activate Wristband:**
```
/quickstrap link_ticket_wristband WB123 TK456789
/quickstrap activate_wristband WB123
/quickstrap verify_wristband NFC789
```

**2. Handle Security Issue:**
```
/quickstrap flag_wristband WB123 "Duplicate detected"
/quickstrap log_fraud_case WB123 EVT001 DUPLICATE_ENTRY
/quickstrap broadcast_alert EVT001 security
```

**3. Event Monitoring:**
```
/quickstrap report_event_summary EVT001
/quickstrap get_recent_checkins EVT001 15
/quickstrap sync_gates_all EVT001
```

**4. Staff Management:**
```
/quickstrap add_staff +1234567890 SCANNER EVT001
/quickstrap notify_staff EVT001 "Event starting in 30 minutes"
```

---

## 🔐 Security & Authentication

- **Rate Limited**: Commands are rate-limited to prevent abuse
- **Role-Based Access**: Different commands require different permission levels
- **Audit Trail**: All commands are logged for compliance
- **Secure Storage**: Sensitive data is encrypted and secured

---

## 🆘 Support & Troubleshooting

**Common Issues:**

1. **"Authentication Required"** → Use `/login` first
2. **"Rate limit exceeded"** → Wait before sending more commands
3. **"Wristband not found"** → Check wristband ID format
4. **"Event not found"** → Verify event ID exists

**Get Help:**
- `/quickstrap help` - Full command list
- `/quickstrap help <category>` - Category-specific help
- `/quickstrap version` - System information

---

## 🚀 Integration Notes

This command system integrates with:
- **QuickStrap Portal** - Real-time sync with web interface
- **Supabase Database** - All data stored securely
- **Rate Limiting** - Built-in protection against abuse
- **Audit Logging** - Complete activity tracking

**Status:** ✅ Production Ready | 🔒 Fully Secured | 📊 Analytics Enabled
