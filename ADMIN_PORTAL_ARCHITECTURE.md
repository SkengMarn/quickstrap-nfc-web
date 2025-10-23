# QuickStrap Admin Portal - Complete Architecture Guide

## 1. SYSTEM OVERVIEW

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Auth**: Supabase Auth (JWT-based)
- **Styling**: TailwindCSS
- **State**: React Context + Local State
- **Real-time**: WebSocket subscriptions

### Core Architecture
```
Mobile App (NFC Scanner) ←→ Supabase Database ←→ Admin Portal
                              ↓
                        Real-time Sync
```

---

## 2. AUTHENTICATION & AUTHORIZATION

### Login Flow (`src/pages/LoginPage.tsx`)
1. Email/password validation
2. Rate limiting (5 attempts/15min)
3. Supabase Auth generates JWT
4. Session stored in httpOnly cookie
5. Organization membership verified
6. Redirect to dashboard

### Authorization Roles
- **Owner**: Full system access, billing
- **Admin**: Event management, staff control
- **Manager**: Operations, monitoring
- **Scanner**: Mobile app only (no portal access)

### Row Level Security (RLS)
All database queries filtered by organization membership via PostgreSQL RLS policies.

---

## 3. NAVIGATION STRUCTURE

### Main Routes (`src/App.tsx`)
```
/ - Dashboard
/events - Event list & management
/events/:id - Event details (9 tabs)
/wristbands - Wristband management
/tickets - Ticket management
/checkins - Check-in logs
/analytics - System analytics
/reports - Export & reporting
/fraud - Fraud detection
/emergency - Emergency controls
/organization - Org settings
/settings - User settings
```

---

## 4. DASHBOARD (`src/pages/Dashboard.tsx`)

### Key Metrics (Real-time)
- Total Events (active/upcoming breakdown)
- Active Wristbands (checked-in count)
- Live Check-ins Today (WebSocket updates)
- Active Gates (health scores)

### Live Activity Feed
- Real-time check-ins
- Gate discoveries
- Staff actions
- Fraud alerts
- Auto-scroll with filters

### System Health Panel
- Database connection status
- API response time
- Active WebSocket connections
- Error rate monitoring

---

## 5. EVENT MANAGEMENT

### Event Creation Wizard (7 Steps)
1. **Basic Info**: Name, description, organization
2. **Date & Time**: Start/end with validation
3. **Location**: Venue, address, GPS
4. **iOS Compatibility**: Ticket linking mode
5. **Capacity & Alerts**: Max capacity, threshold alerts
6. **Security & Gates**: Security mode, auto-discovery
7. **Review & Confirm**: Summary and activation

### Event Details Page (9 Tabs)

#### Tab 1: Overview
- Event health score (composite metric)
- Live capacity tracking
- Lifecycle status tracker
- Activity feed
- Emergency controls

#### Tab 2: Wristbands
- Overview statistics
- Advanced search & filtering
- Bulk operations (activate, link, block)
- CSV upload
- Ticket integration

#### Tab 3: Gates & Entry Points
- Gate operations dashboard
- Auto-discovery workflow
- Performance analytics
- Category bindings
- Emergency gate controls

#### Tab 4: Event Series
- Multi-day/session management
- Series creation & scheduling
- Wristband/gate assignments
- Per-series analytics

#### Tab 5: Guests
- Guest list upload (CSV)
- Guest management
- Invitation system
- Check-in status tracking

#### Tab 6: Live Operations
- Real-time metrics
- Check-ins per hour graph
- Staff online status
- Live alerts
- System monitoring

#### Tab 7: Analytics
- Time series analysis
- Gate performance
- Category insights
- Geographic analysis
- Export options

#### Tab 8: Team Access
- Staff access table
- Grant/revoke access
- Role management
- Access audit log

#### Tab 9: Settings
- Basic information editing
- Operational settings
- Advanced configuration
- Quick actions

---

## 6. WRISTBAND MANAGEMENT

### Global Wristband Page (`src/pages/WristbandsPage.tsx`)
- Cross-event wristband view
- Advanced filtering
- Bulk operations
- CSV import/export

### Bulk Upload (`src/components/WristbandBulkUpload.tsx`)
**CSV Format**:
```csv
nfc_id,category,attendee_name,email,phone
ABC123456789,VIP,John Doe,john@example.com,+1234567890
```

**Process**:
1. File upload
2. Preview & validation
3. Column mapping
4. Import with progress
5. Error reporting

### Wristband Actions
- **View**: Full profile, check-in history
- **Edit**: Update information, change category
- **Block/Unblock**: Security control with reason
- **Link Ticket**: Associate with ticket system
- **Delete**: Permanent removal (with confirmation)

---

## 7. GATE MANAGEMENT

### Auto-Discovery Workflow
1. Mobile app detects new gate location
2. Gate created in "probation" status
3. Portal shows pending approval
4. Admin reviews gate details
5. Approve → "active" | Reject → "rejected"

### Gate Health Calculation
```typescript
score = 50 (base)
+ check-in volume (0-30)
+ location data (15)
+ time active (0-10)
- auto-created penalty (20 if <5 check-ins)
= 0-100%
```

### Gate Operations
- Manual gate creation
- Edit gate details (name, location, status)
- Category bindings (which categories can use gate)
- Performance analytics
- Emergency controls (close all, open all, reset)

---

## 8. CHECK-IN MANAGEMENT

### Check-ins Page (`src/pages/CheckinsPage.tsx`)
- Real-time check-in log
- Filters: event, date range, gate, category
- Sorting by any column
- Export to CSV
- Check-in details modal

### Check-in Process (Mobile App → Portal)
1. Mobile app scans NFC wristband
2. Validates wristband status
3. Checks gate permissions
4. Creates check-in log entry
5. Portal receives real-time update via WebSocket
6. Activity feed updates
7. Metrics recalculated

---

## 9. ANALYTICS & REPORTING

### Analytics Page (`src/pages/AnalyticsPage.tsx`)
**Metrics**:
- Time series (hourly/daily check-ins)
- Gate performance (throughput, success rate)
- Category distribution
- Peak period analysis
- Fraud detection metrics

**Visualizations**:
- Line charts (trends)
- Bar charts (comparisons)
- Pie charts (distributions)
- Heatmaps (geographic/temporal)

### Reports Page (`src/pages/ReportsPage.tsx`)
**Report Types**:
- Event summary report
- Check-in detailed report
- Gate performance report
- Staff activity report
- Fraud detection report

**Export Formats**:
- PDF (formatted report)
- Excel (data tables)
- CSV (raw data)
- JSON (API format)

---

## 10. FRAUD DETECTION

### Fraud Detection Page (`src/pages/FraudDetectionPage.tsx`)

**Detection Rules**:
1. **Duplicate Check-ins**: Same wristband, multiple gates, <5min apart
2. **Impossible Speed**: Check-ins at distant gates too quickly
3. **Blocked Wristband**: Attempt to use blocked wristband
4. **Invalid Category**: Wristband category not allowed at gate
5. **Time Violation**: Check-in outside event hours

**Alert Actions**:
- Auto-block wristband (configurable)
- Notify security staff
- Log incident
- Flag for review

**Fraud Dashboard**:
- Active alerts count
- Alert history
- False positive rate
- Resolution tracking

---

## 11. EMERGENCY CONTROLS

### Emergency Page (`src/pages/EmergencyPage.tsx`)

**Emergency Actions**:
1. **Lockdown Mode**: Stop all check-ins immediately
2. **Broadcast Alert**: Push notification to all staff
3. **Capacity Override**: Temporarily adjust limits
4. **Gate Control**: Close/open specific gates
5. **Evacuation Mode**: Track exit check-outs

**Emergency Procedures**:
- Pre-defined emergency protocols
- One-click activation
- Automatic notifications
- Audit trail logging

---

## 12. STAFF & ACCESS CONTROL

### Staff Management (`src/pages/StaffManagementPage.tsx`)

**Staff Operations**:
- Add staff member (email invitation)
- Assign role (owner/admin/manager/scanner)
- Set permissions (granular access control)
- Revoke access
- View activity log

**Permission Hierarchy**:
```
Owner > Admin > Manager > Scanner
```

**Access Audit**:
- Who granted access
- When access granted/revoked
- Login history
- Actions performed

---

## 13. ORGANIZATION MANAGEMENT

### Organization Page (`src/pages/OrganizationPage.tsx`)

**Organization Settings**:
- Organization name
- Contact information
- Billing details
- Subscription plan
- Usage statistics

**Multi-Organization Support**:
- Users can belong to multiple orgs
- Organization selector in header
- Data scoped by organization
- Separate billing per org

---

## 14. REAL-TIME FEATURES

### WebSocket Subscriptions
```typescript
// Subscribe to event changes
supabase
  .channel(`event:${eventId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'checkin_logs',
    filter: `event_id=eq.${eventId}`
  }, (payload) => {
    handleRealtimeUpdate(payload);
  })
  .subscribe();
```

**Real-time Updates**:
- Check-in logs
- Gate discoveries
- Wristband status changes
- Staff activity
- System alerts

**Update Frequency**:
- Critical data: Instant (WebSocket)
- Metrics: 30 seconds (polling)
- Analytics: 5 minutes (polling)

---

## 15. SECURITY FEATURES

### Security Measures
- JWT authentication
- Row Level Security (RLS)
- CSRF protection
- XSS prevention
- Rate limiting
- Input sanitization
- Secure cookie storage
- HTTPS enforcement

### Audit Logging
All admin actions logged:
- User ID
- Action type
- Timestamp
- IP address
- Resource affected
- Before/after values

---

## 16. API & INTEGRATIONS

### Webhook System (`src/pages/WebhooksPage.tsx`)

**Webhook Events**:
- `event.created`
- `event.updated`
- `checkin.created`
- `gate.discovered`
- `fraud.detected`

**Webhook Configuration**:
- URL endpoint
- Secret key (HMAC signature)
- Event filters
- Retry policy
- Test webhook button

### Telegram Bot Integration
- Command interface for admins
- Real-time notifications
- Event status queries
- Emergency alerts
- Staff communication

---

## 17. DATA FLOW EXAMPLES

### Check-in Flow
```
1. Mobile app scans NFC wristband
2. App sends check-in request to Supabase
3. RLS validates user has access to event
4. Check-in log created in database
5. Trigger updates metrics cache
6. WebSocket pushes update to portal
7. Portal updates activity feed
8. Portal recalculates event health score
```

### Gate Discovery Flow
```
1. Mobile app detects new GPS location
2. App creates gate in "probation" status
3. Portal receives real-time notification
4. Admin sees "Pending Approval" badge
5. Admin reviews gate details
6. Admin approves gate
7. Gate status → "active"
8. Mobile app receives update
9. Gate available for check-ins
```

---

## 18. ERROR HANDLING

### Error States
- Network errors (retry with exponential backoff)
- Authentication errors (redirect to login)
- Permission errors (show access denied message)
- Validation errors (inline form feedback)
- Server errors (show error boundary)

### Error Boundary (`src/components/ErrorBoundary.tsx`)
- Catches React component errors
- Displays fallback UI
- Logs error details
- Provides recovery options

---

## 19. PERFORMANCE OPTIMIZATIONS

### Code Splitting
- Lazy loading all pages
- Route-based code splitting
- Component-level code splitting
- Reduced initial bundle size

### Data Caching
- React Query for API caching
- LocalStorage for user preferences
- Session storage for temporary data
- Stale-while-revalidate strategy

### Real-time Optimization
- Debounced updates
- Batch processing
- Selective subscriptions
- Connection pooling

---

## 20. USER EXPERIENCE

### Loading States
- Skeleton screens
- Progress indicators
- Optimistic updates
- Loading spinners

### Notifications
- Toast notifications (success/error/info)
- Push notifications (critical alerts)
- Email notifications (summaries)
- In-app notification center

### Responsive Design
- Desktop: Full sidebar navigation
- Tablet: Collapsible sidebar
- Mobile: Hamburger menu
- Touch-optimized controls

---

## 21. DEPLOYMENT & MONITORING

### Environment Configuration
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_DEFAULT_ORG_ID=xxx
```

### Monitoring
- Error tracking (Sentry integration ready)
- Performance monitoring
- User analytics
- System health checks

---

## 22. FUTURE ENHANCEMENTS

### Planned Features
- Advanced AI fraud detection
- Predictive analytics
- Mobile app for admins
- Multi-language support
- White-label customization
- Advanced reporting builder
- Integration marketplace

---

This architecture supports enterprise-scale event management with real-time monitoring, comprehensive security, and intuitive admin controls.
