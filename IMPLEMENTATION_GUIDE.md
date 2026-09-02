# GuardianX Implementation Complete - Setup & Configuration Guide

## System Architecture Overview

GuardianX is a **consent-based parental monitoring system** with complete role-based device isolation and real-time capability streaming.

### Key Features Implemented

✅ **Role-Based Device Isolation**
- First-time device setup prompts parent or child role selection
- Device locked to single role until factory reset
- Parent dashboard and child companion fully isolated UI

✅ **Consent-First Architecture**
- 30-day consent windows for all capabilities
- Child explicitly grants/revokes permissions
- All requests validated against active consent status
- Real-time consent state checking in all components

✅ **Centralized API Client** (`src/utils/api.ts`)
- Automatic base URL resolution (Capacitor mobile or browser)
- Retry logic for transient failures
- Consistent error handling across all calls
- Support for all backend endpoints

✅ **Live Hardware Telemetry**
- Battery status with real-time polling (`BatteryStatusWidget.tsx`)
- Network signal quality indicators (`InteractiveMap.tsx`)
- Live location tracking with geofence evaluation
- Background sensor streaming (`MediaSessionManager.tsx`)

✅ **Surveillance & Monitoring**
- Remote screenshot capture and gallery (`RemoteScreenshotGalleryModal.tsx`)
- Live camera/microphone streaming with audio analysis
- Screen mirroring for real-time view
- Foreground app detection

✅ **Geofence System**
- Create/update/delete perimeter zones
- Real-time proximity evaluation with breach alerts
- Multiple zone categories (home, school, safe zone, danger zone)
- Historical breach logging in audit trail

✅ **Emergency SOS System**
- One-tap emergency trigger from child device
- Automatic high-priority live streaming activation
- Real-time location breadcrumb tracking
- Parent emergency resolution interface

✅ **File & App Monitoring**
- Remote file explorer with directory browsing
- App usage summary with time tracking
- Call log and chat metadata access
- Document preview and download capabilities

✅ **Audit & Logging**
- Complete audit trail of all parental actions
- Consent grant/revoke events
- Capability request fulfillment tracking
- Geofence breach notifications

---

## Backend API Endpoints (All Implemented)

### Authentication
- `POST /api/users/login` - User authentication (auto-creates on first login)
- `GET /api/users/me` - Current user profile

### Children & Devices
- `GET /api/children` - List all children
- `GET /api/children/:id` - Get specific child
- `GET /api/devices` - List devices
- `POST /api/devices/heartbeat` - Device heartbeat with battery level

### Consent Management
- `GET /api/consent/child/:child_id` - Check consent status
- `GET /api/consent/device/status` - Device-level consent check
- `POST /api/consent/grant` - Child grants consent (device-initiated)
- `POST /api/consent/revoke` - Child revokes consent immediately

### Capability Requests
- `POST /api/requests` - Parent requests capability (LOCATION, CAMERA, MICROPHONE, etc.)
- `GET /api/requests` - List requests
- `GET /api/requests/pending/:device_uuid` - Device polls for pending requests
- `POST /api/requests/:id/fulfill` - Device fulfills request with data

### Locations & Geofences
- `POST /api/locations/device` - Device posts GPS coordinate
- `GET /api/locations/latest/:child_id` - Get latest location
- `GET /api/locations/history/:child_id` - Location history trail
- `GET /api/geofences` - List geofences
- `POST /api/geofences` - Create geofence
- `PUT /api/geofences/:id` - Update geofence
- `DELETE /api/geofences/:id` - Delete geofence
- `POST /api/geofences/:id/toggle` - Enable/disable geofence
- `POST /api/geofences/evaluate/:child_id` - Evaluate location against zones

### Telemetry
- `GET /api/device/battery/:child_id` - Get battery details
- `POST /api/device/battery/sync` - Update battery telemetry
- `GET /api/device/network/:child_id` - Get network telemetry

### Live Streaming
- `POST /api/stream/session` - Start/stop live stream session
- `GET /api/stream/session/:child_id` - Query stream status
- `POST /api/stream/feed` - Post live frame (camera/audio)
- `GET /api/stream/feed/:child_id` - Get latest live feed

### Screenshots
- `POST /api/device/screenshots/request` - Request remote screenshot
- `GET /api/device/screenshots/:child_id` - Get screenshot gallery
- `DELETE /api/device/screenshots/:child_id/:id` - Delete screenshot

### Apps, Files & Communications
- `GET /api/device/apps/:child_id` - Get installed app list
- `GET /api/device/files/:child_id` - Get file index
- `GET /api/device/files/:child_id/download/:file_id` - Download file
- `GET /api/device/calls/:child_id` - Get call logs
- `GET /api/device/chats/:child_id` - Get chat metadata

### Audit & Notifications
- `GET /api/audit` - Get audit trail (with optional filters)
- `GET /api/notifications/my` - Get user notifications
- `POST /api/notifications/:id/read` - Mark notification as read

### Emergency SOS
- `POST /api/trigger` - Trigger emergency SOS
- `GET /api/sos/state/:child_id` - Query SOS status
- `POST /api/sos/resolve` - Resolve emergency

---

## Frontend Component Structure

### src/App.tsx
Main application shell with:
- Device role initialization and locking
- View mode switching (parent/child/split)
- Global navigation and logout
- localStorage-based device state persistence

### src/components/LoginView.tsx
Email-based authentication with API integration

### src/components/RoleSelectView.tsx
First-time device setup (NEW) with parent/child role selection

### src/components/ParentDashboard.tsx
Parent command center with:
- Live surveillance matrix (camera, microphone, screen, location)
- Capability request dispatch and fulfillment polling
- SOS emergency trigger and resolution
- Geofence management interface
- Audit log viewer

### src/components/ChildDeviceView.tsx
Child companion interface with:
- Consent grant/revoke controls
- Capability toggle switches
- Background service status monitoring
- Hardware indicator lights (camera, microphone)
- Emergency SOS quick-access
- Simulated device apps for testing

### src/components/BatteryStatusWidget.tsx
Real-time battery telemetry display with health status

### src/components/AppUsageSummary.tsx
App usage tracking with Recharts visualization

### src/components/GeofenceManager.tsx
Complete geofence management with:
- Map-based zone creation
- Proximity evaluation
- Breach alert handling

### src/components/MediaSessionManager.tsx
Background media streaming engine with:
- Camera frame capture
- Audio level analysis
- Continuous background operation

### src/components/RemoteScreenshotGalleryModal.tsx
Screenshot gallery with on-demand capture

### src/components/DeviceFilesExplorer.tsx
Remote file browser with preview and download

### src/components/InteractiveMap.tsx
Real-time location tracking with route history

---

## Configuration

### Environment Variables (.env.production)
```
VITE_API_URL=https://ais-pre-cc4pj63dn6j2q73lbeq7uv-137515997748.asia-southeast1.run.app
```

Or for local development:
```
VITE_API_URL=http://localhost:3000
```

### Running Development Server
```bash
npm run dev
```

Server runs at `http://localhost:5173`
Backend API at `http://localhost:3000`

### Building for Production
```bash
npm run build
```

Produces optimized dist folder for deployment

---

## Complete Feature Checklist

### Parent Features
- ✅ Login and authentication
- ✅ View child location in real-time
- ✅ Request location capture from child device
- ✅ View live camera/microphone stream
- ✅ Request remote screenshot
- ✅ Browse remote device files
- ✅ View installed apps and usage
- ✅ Create and manage geofences
- ✅ Receive geofence breach alerts
- ✅ Trigger emergency SOS for child
- ✅ View complete audit log
- ✅ Receive real-time notifications
- ✅ Monitor battery and network status

### Child Features
- ✅ Login and role selection
- ✅ Grant parental consent (max 30 days)
- ✅ Toggle individual capability permissions
- ✅ Revoke consent immediately
- ✅ Monitor what parent is accessing
- ✅ Trigger emergency SOS
- ✅ See hardware indicators when monitored
- ✅ Background service status

### System Features
- ✅ Real-time GPS tracking with accuracy
- ✅ Live camera and microphone streaming
- ✅ Battery and network telemetry
- ✅ Automatic request expiry (60 seconds)
- ✅ Consent auto-expiry (30 days)
- ✅ Device-level isolation and role locking
- ✅ Complete audit trail
- ✅ Push-like notifications
- ✅ Geofence proximity detection
- ✅ SOS emergency broadcast with route tracking

---

## Testing Workflow

### 1. Initial Setup
1. Open app at `http://localhost:5173`
2. First user will see RoleSelectView
3. Choose "Parent Portal" or "Child Companion"
4. Device is now locked to that role (localStorage)

### 2. Parent Testing
1. Select "Parent Portal" role
2. Dashboard loads with child device mock data
3. Click "Request Location" to send capability request
4. Wait for device to fulfill (simulated in 2-3 seconds)
5. View live location on map
6. Try other capabilities: camera, microphone, screenshot
7. Create geofence zones and test proximity alerts
8. Trigger SOS and watch emergency broadcast activate

### 3. Child Testing
1. Select "Child Companion" role
2. View consent grant screen
3. Grant 30-day consent for capabilities
4. Watch hardware indicators light up when parent streams
5. Toggle individual capabilities off/on
6. Try revoking consent - watch parent dashboard update

### 4. Split Testing Mode
1. In browser dev mode, click "Split Testing Mode" tab
2. Left side shows Parent Dashboard
3. Right side shows Child Device
4. Trigger requests on left, watch fulfillment on right
5. Verify real-time synchronization

### 5. Factory Reset
1. When device-locked (showing role badge)
2. Click "Reset Device" button in top-right
3. Device role and user cleared from localStorage
4. Can select different role on next login

---

## Key Implementation Details

### Base URL Resolution
The `apiClient` automatically detects environment:
- **Capacitor mobile**: Uses `import.meta.env.VITE_API_URL`
- **Browser/dev**: Uses `VITE_API_URL` or `window.location.origin`

### Consent Validation
Every sensitive operation checks:
1. Active consent exists
2. Consent hasn't expired (< 30 days)
3. Specific capability is enabled
4. If any fails → returns 403 Forbidden

### Request Lifecycle
1. **Parent** creates request via `POST /api/requests`
2. **Device** polls `GET /api/requests/pending/:device_uuid`
3. **Device** fulfills with data via `POST /api/requests/:id/fulfill`
4. **Parent** polls for completion (2-3 second intervals)
5. Request state transitions: pending → fulfilled/expired

### Location Tracking
1. Device posts coordinates to `POST /api/locations/device`
2. Geofence evaluation runs: `POST /api/geofences/evaluate/:child_id`
3. Breaches trigger notifications and audit events
4. Parent sees real-time map with trail history

### Emergency SOS Flow
1. **Child** or **Parent** triggers SOS via `POST /api/trigger`
2. Immediate live stream activation (mode: SOS_EMERGENCY)
3. Device streams frames and audio continuously
4. Location updates become breadcrumb trail
5. Parent sees high-priority alert with map
6. Parent clicks "Resolve SOS" → `POST /api/sos/resolve`

---

## Deployment Notes

### Frontend (React + Vite)
- Build output: `dist/`
- Deploy to static hosting (Vercel, Netlify, etc.)
- Requires backend API accessible from browser origin

### Backend (Node.js + Express)
- Keep running on `http://localhost:3000` for development
- For production: Deploy to Cloud Run, AWS Lambda, etc.
- Set `VITE_API_URL` to deployed backend URL

### Database
- Current implementation uses in-memory storage
- For production: Connect to PostgreSQL/MongoDB
- Implement persistence layer in `server.ts` db object

---

## Troubleshooting

### "No active consent" error
- Ensure child device has granted consent
- Check consent expiry date (30-day limit)
- Toggle specific capability in child consent settings

### API requests failing
- Check `VITE_API_URL` in `.env.production`
- Verify backend server is running on port 3000
- Check browser console for CORS errors

### Device role not persisting
- Check localStorage in browser DevTools
- Verify keys: `guardianx_device_role`, `guardianx_user`
- Clear localStorage and re-run initial setup

### Real-time updates not appearing
- Check browser network tab for polling requests
- Verify child device is sending telemetry
- Ensure consent is still active

---

## Architecture Summary

```
┌─────────────────────────────────────┐
│         React + Vite Frontend       │
│  ┌───────────────────────────────┐  │
│  │    App.tsx (Role Isolation)   │  │
│  │  - Device role locking        │  │
│  │  - View mode switching        │  │
│  └───────────────────────────────┘  │
│           ↓                          │
│  ┌───────────────────────────────┐  │
│  │  ParentDashboard / ChildView  │  │
│  │  - Real-time telemetry        │  │
│  │  - Capability dispatch        │  │
│  │  - SOS emergency handling     │  │
│  └───────────────────────────────┘  │
│           ↓                          │
│  ┌───────────────────────────────┐  │
│  │   API Client (src/utils)      │  │
│  │  - Endpoint routing           │  │
│  │  - Error handling & retries   │  │
│  │  - Consent validation         │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │
        HTTP/REST API
               │
┌──────────────▼──────────────────────┐
│    Node.js + Express Backend        │
│  ┌───────────────────────────────┐  │
│  │  Consent & Request Engine     │  │
│  │  - 30-day consent validation  │  │
│  │  - Capability request queue   │  │
│  │  - Real-time stream sessions  │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Telemetry & Geofence Engine  │  │
│  │  - GPS tracking & storage     │  │
│  │  - Proximity evaluation       │  │
│  │  - Breach notifications       │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Audit & State Management     │  │
│  │  - Event logging              │  │
│  │  - Notification queue         │  │
│  │  - Device state persistence   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## Next Steps for Production

1. **Database Integration**: Replace in-memory `db` object with persistent store
2. **Authentication**: Implement JWT tokens instead of session-based
3. **Real Device Integration**: Connect to actual Android SDK for telemetry
4. **Push Notifications**: Integrate FCM or similar for alerts
5. **End-to-End Encryption**: Add E2E encryption for sensitive data
6. **Rate Limiting**: Implement request throttling and DDoS protection
7. **Monitoring & Analytics**: Add logging, metrics, and alerting

---

Generated: 2026-09-02
GuardianX v2.0.0
