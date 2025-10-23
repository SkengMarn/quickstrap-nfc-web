# Logged In Devices / Active Sessions Feature

## Overview

A comprehensive active session monitoring system that provides real-time visibility into all logged-in users across both the web portal and iOS NFC app, with rich user and device information.

---

## ✅ Features Implemented

### **1. Comprehensive User Information**

| Field | Source | Display |
|-------|--------|---------|
| **Full Name** | `profiles.full_name` | Main user identifier |
| **Email** | `profiles.email` | Contact information |
| **Role** | `profiles.role` | Color-coded badge (Admin, Owner, Scanner, etc.) |
| **Phone Number** | `profiles.phone` | Contact information |
| **User ID** | `active_sessions.user_id` | System identifier |

### **2. Device & Platform Information**

| Field | Detection | Display |
|-------|-----------|---------|
| **Device Type** | User agent parsing | Desktop, Mobile, Tablet with icons |
| **Operating System** | User agent parsing | Windows, macOS, Linux, iOS, Android |
| **Browser** | User agent parsing | Chrome, Firefox, Safari, Edge, Opera |
| **App Type** | Route & User Agent | Web Portal, iOS NFC App, Unknown |
| **Device Icon** | Intelligent detection | 💻 Desktop, 📱 Mobile, 📱 Tablet |

### **3. Current Activity Tracking**

| Field | Source | Purpose |
|-------|--------|---------|
| **Current Route** | `active_sessions.current_route` | Shows exact page user is on |
| **Resource Type** | `active_sessions.current_resource_type` | Event, Dashboard, etc. |
| **Resource Name** | Joined from related table | Specific event or resource name |
| **Organization** | Joined from `organizations` | Current organization context |

### **4. Network & Location**

| Field | Source | Display |
|-------|--------|---------|
| **IP Address** | `active_sessions.ip_address` | Network identifier |
| **User Agent** | `active_sessions.user_agent` | Full technical details (expandable) |

### **5. Session Metadata**

| Field | Calculation | Display |
|-------|-------------|---------|
| **Session Started** | `active_sessions.session_started_at` | When user logged in |
| **Last Activity** | `active_sessions.last_activity_at` | Time ago (e.g., "2m ago") |
| **Duration** | Calculated | How long session has been active |
| **Status** | Activity-based | Active, Idle, or Inactive |

---

## 🎨 Status Indicators

### **Activity Status (Color-Coded)**

| Status | Condition | Color | Icon |
|--------|-----------|-------|------|
| **Active** | Last activity < 5 min | 🟢 Green | Pulsing activity icon |
| **Idle** | Last activity 5-15 min | 🟡 Yellow | Clock icon |
| **Inactive** | Last activity > 15 min | ⚫ Gray | X circle icon |

### **Role Badges (Color-Coded)**

| Role | Color | Badge |
|------|-------|-------|
| **Admin/Super Admin** | 🔴 Red | `[🛡️ Admin]` |
| **Owner** | 🟣 Purple | `[🛡️ Owner]` |
| **Manager** | 🔵 Blue | `[🛡️ Manager]` |
| **Scanner** | 🟢 Green | `[🛡️ Scanner]` |
| **User** | ⚫ Gray | `[🛡️ User]` |

### **App Type Badges**

| App Type | Detection | Color | Icon |
|----------|-----------|-------|------|
| **Web Portal** | Route analysis | 🟢 Green | 🌐 Globe |
| **iOS NFC App** | User agent | 🔵 Blue | 📱 Smartphone |
| **Unknown** | Default | ⚫ Gray | 📊 Activity |

---

## 📊 Dashboard Statistics

The page includes real-time stats cards:

1. **Total Sessions** - Count of all active sessions
2. **Unique Users** - Count of distinct users
3. **Web Portal** - Sessions on web portal
4. **Mobile Apps** - Sessions on mobile apps

---

## 🔍 Detailed Session View

### **Main Table Columns**

1. **User** - Avatar, name, email, role badge
2. **Device & App** - Device icon, type, browser, OS, app badge
3. **Current Activity** - Route, resource name, organization
4. **Location & Network** - IP address, phone number
5. **Session Info** - Start time, last activity, duration
6. **Status** - Activity status badge
7. **Actions** - Expand/view details button

### **Expanded Row Details**

Click the 👁️ icon or row to see:

**User Information:**
- User ID
- Email
- Phone number
- Role

**Technical Details:**
- Session ID
- IP Address
- Browser
- Operating System
- Full User Agent string

---

## 🔄 Auto-Refresh Configuration

Users can configure:
- **Auto-refresh** - On/Off toggle
- **Refresh Interval** - 10s, 30s, 1m, 5m

Last refresh time is displayed at the top.

---

## 📱 Platform Detection

### **How It Works**

The system intelligently detects the platform by analyzing:

1. **User Agent String**
   ```typescript
   // iOS NFC App detection
   if (ua.includes('quickstrap') || ua.includes('nfc-scanner')) {
     return 'iOS NFC App';
   }

   // Web Portal detection
   if (route.includes('dashboard') || route.includes('events')) {
     return 'Web Portal';
   }
   ```

2. **Current Route**
   ```typescript
   // Route examples:
   '/dashboard' → Web Portal
   '/events/123' → Web Portal
   '/scan' → iOS NFC App
   ```

3. **Device Type**
   ```typescript
   // Device detection
   if (ua.includes('mobile') || ua.includes('iphone')) return 'Mobile';
   if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet';
   return 'Desktop';
   ```

---

## 🎯 Use Cases

### **1. Real-Time Monitoring**
- See who is currently logged in
- Monitor active staff during events
- Track concurrent users

### **2. Security Auditing**
- Identify suspicious sessions
- Monitor IP addresses
- Track device usage

### **3. Support & Troubleshooting**
- See what page user is on
- Help with user issues
- Monitor app usage

### **4. Analytics**
- Track portal vs mobile usage
- Monitor peak usage times
- Analyze user behavior

---

## 📁 Files Created

### **Component**
```
src/components/events/ActiveSessionsTable.tsx
```
- Comprehensive session table
- Auto-refresh functionality
- Expandable row details
- Real-time status updates

### **Page**
```
src/pages/LoggedInDevicesPage.tsx
```
- Main dashboard page
- Statistics cards
- Settings panel
- Information guide

### **Documentation**
```
LOGGED_IN_DEVICES_FEATURE.md
```
- Complete feature documentation

---

## 🔗 Integration with Existing Schema

### **Database Tables Used**

1. **active_sessions** - Main session tracking
   ```sql
   - user_id (FK to auth.users)
   - organization_id (FK to organizations)
   - current_route
   - current_resource_type
   - current_resource_id
   - ip_address
   - user_agent
   - device_type
   - last_activity_at
   - session_started_at
   ```

2. **profiles** - User information
   ```sql
   - id (matches auth.users)
   - email
   - full_name
   - role
   - phone
   ```

3. **organizations** - Organization context
   ```sql
   - id
   - name
   ```

4. **events** - Resource names (when applicable)
   ```sql
   - id
   - name
   ```

---

## 💡 Usage Examples

### **Viewing All Sessions**
```typescript
// Shows all active sessions in the organization
<ActiveSessionsTable
  organizationId={currentOrganization?.id}
  autoRefresh={true}
  refreshInterval={30}
/>
```

### **Filtering by Event**
```typescript
// Shows only sessions viewing/working on a specific event
<ActiveSessionsTable
  eventId="event-uuid-here"
  organizationId={currentOrganization?.id}
  autoRefresh={true}
  refreshInterval={30}
/>
```

### **Custom Refresh Settings**
```typescript
// Disable auto-refresh
<ActiveSessionsTable
  organizationId={currentOrganization?.id}
  autoRefresh={false}
/>

// Custom refresh interval
<ActiveSessionsTable
  organizationId={currentOrganization?.id}
  autoRefresh={true}
  refreshInterval={60} // 1 minute
/>
```

---

## 🎨 UI/UX Features

### **Visual Design**
- ✅ Color-coded status indicators
- ✅ Icon-based device identification
- ✅ Role-based badge colors
- ✅ Expandable row details
- ✅ Responsive table layout
- ✅ Hover effects

### **Interactions**
- ✅ Click row to expand details
- ✅ Manual refresh button
- ✅ Auto-refresh toggle
- ✅ Configurable refresh interval
- ✅ Smooth animations

### **Information Density**
- ✅ Compact main view
- ✅ Detailed expanded view
- ✅ Time-relative displays ("2m ago")
- ✅ Truncated long values
- ✅ Tooltips (where applicable)

---

## 📈 Real-Time Data Flow

```mermaid
User Activity
    ↓
active_sessions table updated
    ↓
Auto-refresh timer (every N seconds)
    ↓
Query active_sessions
    ↓
Join with profiles, organizations, events
    ↓
Parse user agents
    ↓
Calculate status indicators
    ↓
Render table with rich information
    ↓
User can expand for more details
```

---

## 🔐 Security Considerations

1. **Access Control**
   - Only authorized users can view sessions
   - Organization-scoped queries
   - No password or sensitive data shown

2. **Privacy**
   - IP addresses visible to admins only
   - Full user agent in expanded view only
   - User consent for tracking

3. **Data Retention**
   - Old sessions automatically cleaned up
   - Session expiry handled by backend
   - No permanent storage of session data

---

## 🚀 Future Enhancements

Potential additions:

1. **Session Actions**
   - Force logout
   - Send message to user
   - Lock/unlock account

2. **Advanced Filtering**
   - Filter by role
   - Filter by device type
   - Filter by app type
   - Filter by status

3. **Analytics**
   - Session duration charts
   - Peak usage times graph
   - Device type distribution
   - Geographic location map

4. **Notifications**
   - Alert on suspicious activity
   - Notify on multiple sessions
   - Alert on unusual locations

5. **Export**
   - Export session data to CSV
   - Generate usage reports
   - Audit trail export

---

## ✅ Summary

The Logged In Devices feature provides:

✅ **Complete visibility** into all active user sessions
✅ **Rich user information** from profiles
✅ **Device detection** with intelligent parsing
✅ **App identification** (Web Portal vs iOS NFC App)
✅ **Real-time status** with auto-refresh
✅ **Network information** including IP addresses
✅ **Session tracking** with duration and last activity
✅ **Expandable details** for in-depth information
✅ **Role-based badges** for quick identification
✅ **Color-coded indicators** for status at a glance

This transforms basic session tracking into a comprehensive user monitoring and analytics dashboard!
