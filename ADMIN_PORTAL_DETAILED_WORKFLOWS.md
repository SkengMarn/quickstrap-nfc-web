# QuickStrap Admin Portal - Detailed Workflows & User Journeys

## COMPLETE USER WORKFLOWS

### 1. FIRST-TIME ADMIN SETUP

#### Journey: New Organization Owner
```
1. Receive invitation email
2. Click "Accept Invitation" link
3. Redirected to login page
4. Create account (email + password)
5. Email verification
6. Login with credentials
7. Organization auto-selected
8. Interactive tour launches (optional)
9. Dashboard loads with empty state
10. Prompted to create first event
```

**First Event Creation Flow:**
- Click "Create New Event" button
- 7-step wizard opens
- Complete all required fields
- Event created in "draft" status
- Redirected to event details page
- Prompted to upload wristbands
- Prompted to add staff members

---

### 2. DAILY OPERATIONS WORKFLOW

#### Pre-Event Setup (Day Before Event)

**A. Upload Guest List**
```
1. Navigate to event details
2. Go to "Guests" tab
3. Click "Upload Guest List"
4. Select CSV from ticketing platform
5. Preview data (first 5 rows)
6. Map columns if needed
7. Validate data
8. Import guests
9. Review import summary
```

**B. Upload Wristbands**
```
1. Go to "Wristbands" tab
2. Click "Bulk Upload"
3. Select wristband CSV
4. Preview NFC IDs
5. Validate format
6. Check for duplicates
7. Import wristbands
8. Verify count matches guest list
```

**C. Link Wristbands to Guests**
```
Option 1: Auto-link by email
- Click "Auto-link by Email"
- System matches email addresses
- Review matches
- Confirm bulk link

Option 2: Manual link
- Search for guest
- Search for wristband
- Click "Link" button
- Confirm link
```

**D. Configure Gates**
```
1. Go to "Gates" tab
2. Review auto-discovered gates
3. Approve pending gates
4. Set category bindings
5. Test gate connectivity
```

**E. Assign Staff**
```
1. Go to "Team Access" tab
2. Click "Add Staff Member"
3. Enter email address
4. Select role (scanner/manager)
5. Set permissions
6. Send invitation
7. Staff receives email with login link
```

#### Event Day - Live Operations

**Morning Setup (2 hours before):**
```
1. Login to portal
2. Navigate to event
3. Go to "Live Operations" tab
4. Verify all gates online
5. Check staff logged in
6. Review system health
7. Activate event (if in draft)
```

**During Event:**
```
1. Monitor "Live Operations" dashboard
2. Watch real-time check-ins
3. Track capacity percentage
4. Respond to alerts
5. Approve/reject fraud alerts
6. Communicate with staff via Telegram
```

**Alert Response Workflow:**
```
Alert appears → Review details → Assess severity
├─ Low: Acknowledge and monitor
├─ Medium: Investigate and take action
└─ High: Immediate response
    ├─ Block wristband
    ├─ Close gate
    ├─ Notify security
    └─ Log incident
```

**End of Event:**
```
1. Review final check-in count
2. Export check-in logs
3. Generate event report
4. Mark event as "completed"
5. Archive event data
```

#### Post-Event Analysis

```
1. Navigate to "Analytics" tab
2. Review attendance metrics
3. Analyze gate performance
4. Check fraud incidents
5. Export comprehensive report
6. Share with stakeholders
```

---

### 3. GATE MANAGEMENT WORKFLOWS

#### Auto-Discovery Approval Process

**Trigger:** Mobile app detects new gate location

**Portal Workflow:**
```
1. Notification badge appears on "Gates" tab
2. Admin clicks to view pending gates
3. Gate details displayed:
   - GPS coordinates
   - First scan timestamp
   - Confidence score
   - Suggested name
4. Admin reviews:
   - Is location valid?
   - Is name appropriate?
   - Should gate be active?
5. Decision:
   ├─ Approve → Gate status: "active"
   │   └─ Mobile app can now use gate
   ├─ Reject → Gate status: "rejected"
   │   └─ Hidden from mobile app
   └─ Edit → Modify name/location
       └─ Then approve or reject
```

**Bulk Approval:**
```
1. Select multiple pending gates
2. Click "Approve Selected"
3. Confirm bulk action
4. All gates activated simultaneously
```

#### Manual Gate Creation

```
1. Click "Add Manual Gate"
2. Enter gate details:
   - Name (required)
   - Location description
   - GPS coordinates (optional)
   - Category restrictions
3. Set status (active/inactive)
4. Save gate
5. Gate immediately available
```

#### Gate Performance Monitoring

**Real-time Metrics:**
- Scans per minute
- Success rate
- Average processing time
- Queue length estimate

**Alert Conditions:**
- Health score < 50%
- No activity for 30 minutes
- Error rate > 10%
- Processing time > 5 seconds

**Response Actions:**
- Investigate gate issue
- Restart gate device
- Reassign staff
- Close gate temporarily

---

### 4. FRAUD DETECTION WORKFLOWS

#### Automatic Fraud Detection

**Detection Triggers:**
```
1. Duplicate check-in detected
   ├─ Same wristband
   ├─ Different gates
   └─ < 5 minutes apart

2. Impossible speed detected
   ├─ Gates > 100m apart
   └─ < 1 minute between scans

3. Blocked wristband used
   └─ Attempt to check in

4. Invalid category
   ├─ Wristband category
   └─ Not allowed at gate

5. Time violation
   └─ Check-in outside event hours
```

**Alert Workflow:**
```
1. Fraud rule triggered
2. Alert created in database
3. Portal receives real-time notification
4. Alert appears in:
   - Live Operations dashboard
   - Fraud Detection page
   - Notification center
5. Admin reviews alert:
   - View wristband details
   - Check check-in history
   - Review gate logs
6. Admin decision:
   ├─ False Positive
   │   └─ Mark as resolved
   ├─ True Positive
   │   ├─ Block wristband
   │   ├─ Notify security
   │   └─ Log incident
   └─ Investigate Further
       └─ Add to watch list
```

#### Manual Fraud Investigation

```
1. Navigate to Fraud Detection page
2. Filter by:
   - Event
   - Date range
   - Severity
   - Status
3. Click on alert
4. View full context:
   - Wristband profile
   - All check-ins
   - Gate locations
   - Timeline visualization
5. Take action:
   - Block wristband
   - Unblock wristband
   - Add notes
   - Close alert
```

---

### 5. EMERGENCY PROCEDURES

#### Emergency Lockdown

**Trigger:** Security threat or capacity exceeded

**Procedure:**
```
1. Navigate to Emergency page
2. Click "LOCKDOWN MODE"
3. Confirm action (requires password re-entry)
4. System actions:
   ├─ All gates stop accepting check-ins
   ├─ Mobile apps show "LOCKDOWN" message
   ├─ Staff notified via push notification
   ├─ Telegram alert sent
   └─ Audit log entry created
5. Admin can:
   ├─ Broadcast message to staff
   ├─ View current attendance
   ├─ Monitor gate status
   └─ Lift lockdown when safe
```

**Lifting Lockdown:**
```
1. Click "Lift Lockdown"
2. Confirm action
3. System resumes normal operations
4. Staff notified
5. Check-ins resume
```

#### Capacity Emergency

**Trigger:** Attendance > 100% capacity

**Automatic Actions:**
```
1. Red alert on dashboard
2. Email to all admins
3. Push notification to staff
4. Telegram alert
5. Gates auto-pause (if configured)
```

**Admin Response:**
```
1. Review current count
2. Verify accuracy
3. Options:
   ├─ Adjust capacity limit
   ├─ Stop new check-ins
   ├─ Enable exit tracking
   └─ Initiate evacuation protocol
```

#### Medical Emergency

**Procedure:**
```
1. Staff reports via mobile app
2. Alert appears in portal
3. Admin actions:
   ├─ Log incident details
   ├─ Track location
   ├─ Coordinate response
   ├─ Update status
   └─ Close incident when resolved
```

---

### 6. REPORTING WORKFLOWS

#### Generate Event Report

```
1. Navigate to Reports page
2. Select report type:
   - Event Summary
   - Detailed Check-ins
   - Gate Performance
   - Staff Activity
   - Fraud Incidents
3. Configure parameters:
   - Event selection
   - Date range
   - Filters
   - Grouping
4. Preview report
5. Export format:
   ├─ PDF (formatted)
   ├─ Excel (data tables)
   ├─ CSV (raw data)
   └─ JSON (API)
6. Download or email
```

#### Scheduled Reports

```
1. Go to Reports page
2. Click "Schedule Report"
3. Configure:
   - Report type
   - Frequency (daily/weekly/monthly)
   - Recipients (email list)
   - Format
   - Filters
4. Save schedule
5. Reports auto-generated and emailed
```

#### Custom Report Builder

```
1. Click "Custom Report"
2. Select data sources:
   - Check-ins
   - Wristbands
   - Gates
   - Staff activity
3. Choose fields to include
4. Add filters
5. Configure grouping
6. Add calculations
7. Preview results
8. Save as template
9. Export or schedule
```

---

### 7. STAFF MANAGEMENT WORKFLOWS

#### Onboard New Staff Member

```
1. Go to Team Access tab
2. Click "Add Staff Member"
3. Enter details:
   - Email address
   - Full name
   - Role (scanner/manager/admin)
4. Set permissions:
   - Events access (all or specific)
   - Features access (checkboxes)
   - Expiry date (optional)
5. Send invitation
6. Staff receives email:
   - Welcome message
   - Login instructions
   - Temporary password
   - Mobile app download link
7. Staff logs in
8. Forced password change
9. Profile setup
10. Ready to work
```

#### Revoke Staff Access

```
1. Go to Team Access tab
2. Find staff member
3. Click "Revoke Access"
4. Confirm action
5. System actions:
   - Access immediately revoked
   - Active sessions terminated
   - Mobile app logged out
   - Audit log entry
   - Email notification sent
```

#### Monitor Staff Activity

```
1. Go to Team Access tab
2. Click on staff member
3. View activity:
   - Login history
   - Check-ins performed
   - Gates used
   - Actions taken
   - Time on duty
4. Export activity log
```

---

### 8. WRISTBAND LIFECYCLE

#### Complete Wristband Journey

**Creation:**
```
1. Wristband manufactured with NFC chip
2. NFC ID programmed
3. Admin uploads wristband data to portal
4. Wristband status: "inactive"
```

**Activation:**
```
1. Admin activates wristband
2. Status: "active"
3. Wristband ready for assignment
```

**Assignment:**
```
1. Link to guest profile
2. Link to ticket (if applicable)
3. Assign category
4. Email confirmation sent to guest
```

**Distribution:**
```
1. Guest receives wristband at venue
2. Staff scans to verify
3. Guest wears wristband
```

**First Check-in:**
```
1. Guest approaches gate
2. Staff scans wristband
3. System validates:
   - Wristband active?
   - Category allowed?
   - Already checked in?
   - Event active?
4. Check-in recorded
5. Guest enters
```

**Re-entry (if allowed):**
```
1. Guest exits and returns
2. Staff scans wristband
3. System checks scan mode
4. If "multiple" allowed:
   - New check-in recorded
   - Guest re-enters
5. If "single" only:
   - Check-in denied
   - Error message shown
```

**Blocking:**
```
Trigger: Fraud detected or admin action
1. Wristband status: "blocked"
2. Reason logged
3. All gates reject wristband
4. Guest notified (optional)
```

**End of Event:**
```
1. Event marked complete
2. Wristbands remain in system
3. Check-in history preserved
4. Can be reused for future events
```

---

### 9. ANALYTICS WORKFLOWS

#### Real-time Analytics

**Live Dashboard:**
```
1. Navigate to event
2. Go to Live Operations tab
3. View real-time:
   - Current check-ins (last 5 min)
   - Capacity percentage
   - Check-ins per hour graph
   - Active gates
   - Staff online
4. Auto-refresh every 10 seconds
```

#### Post-Event Analysis

**Attendance Analysis:**
```
1. Go to Analytics tab
2. View metrics:
   - Total attendance
   - Peak attendance time
   - Average dwell time
   - Entry/exit patterns
3. Compare to:
   - Expected attendance
   - Previous events
   - Industry benchmarks
```

**Gate Performance:**
```
1. View gate metrics:
   - Throughput (scans/hour)
   - Success rate
   - Average processing time
   - Queue estimates
2. Identify:
   - Best performing gates
   - Bottlenecks
   - Optimization opportunities
```

**Category Analysis:**
```
1. View category breakdown:
   - Distribution
   - Check-in rates
   - Popular categories
   - Capacity utilization
2. Insights:
   - Pricing optimization
   - Capacity planning
   - Marketing effectiveness
```

---

### 10. INTEGRATION WORKFLOWS

#### Webhook Setup

```
1. Navigate to Webhooks page
2. Click "Add Webhook"
3. Configure:
   - Endpoint URL
   - Secret key (auto-generated)
   - Events to subscribe:
     ☐ event.created
     ☐ event.updated
     ☐ checkin.created
     ☐ gate.discovered
     ☐ fraud.detected
   - Retry policy
4. Test webhook
5. Save configuration
6. Webhook active
```

**Webhook Payload Example:**
```json
{
  "event": "checkin.created",
  "timestamp": "2025-10-21T10:30:00Z",
  "data": {
    "id": "uuid",
    "wristband_id": "uuid",
    "gate_id": "uuid",
    "event_id": "uuid",
    "timestamp": "2025-10-21T10:30:00Z"
  },
  "signature": "hmac-sha256-signature"
}
```

#### Telegram Bot Setup

```
1. Navigate to Settings
2. Go to Integrations
3. Click "Connect Telegram"
4. Scan QR code with Telegram
5. Bot sends verification code
6. Enter code in portal
7. Bot connected
8. Configure notifications:
   - Check-in milestones
   - Fraud alerts
   - Capacity warnings
   - System errors
9. Test notification
10. Save settings
```

**Telegram Commands:**
```
/event list - Show all events
/event status <id> - Get event status
/checkins <event_id> - Current check-in count
/gates <event_id> - Gate status
/alerts - View active alerts
/lockdown <event_id> - Emergency lockdown
```

---

### 11. TROUBLESHOOTING WORKFLOWS

#### Gate Not Responding

**Diagnosis:**
```
1. Check gate status in portal
2. View last activity timestamp
3. Check network connectivity
4. Review error logs
```

**Resolution:**
```
1. Contact staff at gate
2. Verify mobile device:
   - Battery level
   - Network connection
   - App version
   - GPS enabled
3. Restart mobile app
4. If persists:
   - Reassign staff
   - Use backup device
   - Create manual gate
```

#### Check-in Failing

**Diagnosis:**
```
1. View wristband details
2. Check status (active/blocked?)
3. Verify category allowed at gate
4. Check event active?
5. Review error message
```

**Resolution:**
```
1. If wristband blocked:
   - Review block reason
   - Unblock if appropriate
2. If category issue:
   - Update gate bindings
   - Or change wristband category
3. If event inactive:
   - Activate event
4. If technical issue:
   - Check system status
   - Contact support
```

#### Data Sync Issues

**Diagnosis:**
```
1. Check WebSocket connection
2. View network status
3. Check database latency
4. Review error logs
```

**Resolution:**
```
1. Refresh browser
2. Clear cache
3. Check internet connection
4. Verify Supabase status
5. If persists, contact support
```

---

### 12. ADVANCED WORKFLOWS

#### Multi-Event Management

**Scenario:** Managing multiple simultaneous events

**Workflow:**
```
1. Dashboard shows all events
2. Filter by:
   - Status (active only)
   - Date (today)
   - Location
3. Quick switch between events:
   - Event selector dropdown
   - Keyboard shortcuts
   - Recent events list
4. Monitor all events:
   - Multi-event dashboard
   - Aggregated metrics
   - Cross-event alerts
```

#### Event Series Management

**Scenario:** Multi-day festival with different sessions

**Setup:**
```
1. Create main event (3-day festival)
2. Add series:
   - Day 1: Friday Night
   - Day 2: Saturday All Day
   - Day 3: Sunday Afternoon
3. Configure each series:
   - Specific start/end times
   - Capacity overrides
   - Gate assignments
   - Category restrictions
4. Assign wristbands to series:
   - VIP: All 3 days
   - General: Single day
   - Staff: All days
```

**Operations:**
```
1. Monitor per-series metrics
2. Switch between series views
3. Compare attendance across days
4. Adjust capacity per series
```

#### White-Label Customization

**Scenario:** Brand the portal for client

**Configuration:**
```
1. Go to Organization Settings
2. Upload logo
3. Set brand colors:
   - Primary color
   - Secondary color
   - Accent color
4. Customize:
   - Email templates
   - Report headers
   - Login page
5. Preview changes
6. Apply branding
```

---

This comprehensive workflow documentation covers every major user journey and operational procedure in the QuickStrap Admin Portal.
