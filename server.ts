import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// ============================================================
// GUARDIANX PRODUCTION-GRADE IN-MEMORY CORE ENGINE
// ============================================================

export type CapabilityType =
  | 'LOCATION'
  | 'CAMERA'
  | 'MICROPHONE'
  | 'LIVE_VIEW'
  | 'SCREEN'
  | 'DEVICE_STATUS'
  | 'APP_LIST'
  | 'CALL_LOGS'
  | 'CHAT_METADATA'
  | 'FILES';

export interface DeviceFile {
  id: string;
  name: string;
  path: string;
  folder: 'Documents' | 'Downloads' | 'Images' | 'Audio' | 'Videos' | 'School';
  size_bytes: number;
  size_formatted: string;
  mime_type: string;
  last_modified: string;
  content_preview?: string;
  download_url?: string;
  is_flagged_sensitive?: boolean;
}

export interface InstalledApp {
  id: string;
  name: string;
  package_name: string;
  category: 'Education' | 'Entertainment' | 'Social' | 'Games' | 'Productivity' | 'System';
  version: string;
  installed_at: string;
  last_used_at: string;
  usage_today_minutes: number;
  size_mb: number;
  permissions: string[];
  status: 'allowed' | 'monitored' | 'restricted';
}

export interface CallLogMetadata {
  id: string;
  contact_name: string;
  phone_masked: string;
  type: 'incoming' | 'outgoing' | 'missed';
  duration_seconds: number;
  timestamp: string;
  source: 'SIM_1' | 'SIM_2' | 'VoIP';
}

export interface ChatMetadata {
  id: string;
  platform: 'WhatsApp' | 'Telegram' | 'SMS' | 'Discord' | 'Google Messages';
  thread_type: 'direct' | 'group';
  contact_or_group_name: string;
  message_count_24h: number;
  last_active_at: string;
  direction: 'incoming' | 'outgoing' | 'bidirectional';
  unread_count: number;
}

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'running'
  | 'fulfilled'
  | 'denied'
  | 'expired'
  | 'cancelled'
  | 'failed';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface Child {
  id: number;
  parent_id: number;
  name: string;
  age: number;
  created_at: string;
}

interface DeviceBatteryDetails {
  battery_level: number;
  is_charging: boolean;
  charging_type: 'AC_FAST' | 'USB' | 'WIRELESS' | 'NONE';
  temperature_c: number;
  voltage_v: number;
  health: 'GOOD' | 'NORMAL' | 'OVERHEAT' | 'DEGRADED';
  estimated_time_remaining_minutes: number;
  power_saving_mode: boolean;
  screen_on_time_minutes_today: number;
  last_updated: string;
}

interface DeviceNetworkDetails {
  connection_type: 'WIFI' | '5G' | '4G_LTE' | 'OFFLINE';
  signal_strength_bars: number; // 1 to 5
  signal_dbm: number; // e.g. -74
  network_name: string;
  ip_address: string;
  latency_ms: number;
  download_speed_mbps: number;
  upload_speed_mbps: number;
  is_roaming: boolean;
  wifi_frequency_ghz?: number;
}

interface RemoteScreenshot {
  id: string;
  child_id: number;
  device_id: number;
  image_url: string;
  captured_at: string;
  foreground_app: string;
  screen_resolution: string;
  battery_at_capture: number;
  trigger_source: 'parent_request' | 'automated_schedule' | 'safety_trigger';
  notes?: string;
}

interface Device {
  id: number;
  child_id: number;
  device_name: string;
  device_uuid: string;
  pairing_token: string;
  is_active: boolean;
  battery_level: number;
  last_seen: string;
  created_at: string;
  battery_details?: DeviceBatteryDetails;
  network_details?: DeviceNetworkDetails;
}

interface Consent {
  id: number;
  child_id: number;
  parent_id: number;
  device_id: number;
  is_active: boolean;
  granted_at: string;
  expires_at: string;
  revoked_at?: string | null;
  capabilities: { [key in CapabilityType]?: boolean };
}

interface CapabilityRequest {
  id: number;
  parent_id: number;
  child_id: number;
  device_id: number;
  capability: CapabilityType;
  status: RequestStatus;
  payload?: any;
  result_data?: any;
  created_at: string;
  expires_at: string;
  fulfilled_at?: string | null;
  denied_at?: string | null;
  failure_reason?: string | null;
}

interface LocationRecord {
  id: number;
  child_id: number;
  device_id?: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  request_id?: number | null;
  created_at: string;
}

interface AuditEvent {
  id: number;
  actor_id: number;
  actor_type: 'parent' | 'child' | 'system' | 'device';
  child_id: number;
  device_id?: number;
  capability?: CapabilityType;
  request_id?: number;
  event_type: string;
  result: 'SUCCESS' | 'DENIED' | 'EXPIRED' | 'REVOKED' | 'FAILED';
  metadata?: any;
  timestamp: string;
}

interface Notification {
  id: number;
  user_id: number;
  child_id?: number;
  title: string;
  message: string;
  type: 'sos' | 'geofence' | 'consent' | 'capability' | 'system';
  is_read: boolean;
  created_at: string;
}

interface Geofence {
  id: number;
  child_id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

// ------------------------------------------------------------
// INITIAL SEED STATE
// ------------------------------------------------------------

const defaultUser: User = {
  id: 1,
  email: 'parent@gmail.com',
  full_name: 'Parent User',
  role: 'parent',
  created_at: new Date().toISOString(),
};

const defaultChild: Child = {
  id: 1,
  parent_id: 1,
  name: 'Rahul',
  age: 12,
  created_at: new Date().toISOString(),
};

const defaultDevice: Device = {
  id: 1,
  child_id: 1,
  device_name: "Rahul's Android Phone",
  device_uuid: 'd3f9a721-6c2e-4e89-9a1b-3c7d2e4f5a6b',
  pairing_token: 'gx_pair_8f4a2c9e1b7d3a5f',
  is_active: true,
  battery_level: 86,
  last_seen: new Date().toISOString(),
  created_at: new Date().toISOString(),
  battery_details: {
    battery_level: 86,
    is_charging: false,
    charging_type: 'NONE',
    temperature_c: 28.4,
    voltage_v: 4.14,
    health: 'GOOD',
    estimated_time_remaining_minutes: 860, // ~14h 20m
    power_saving_mode: false,
    screen_on_time_minutes_today: 184,
    last_updated: new Date().toISOString(),
  },
  network_details: {
    connection_type: 'WIFI',
    signal_strength_bars: 5,
    signal_dbm: -62,
    network_name: 'Home_5GHz_Mesh',
    ip_address: '192.168.1.142',
    latency_ms: 22,
    download_speed_mbps: 184.5,
    upload_speed_mbps: 42.0,
    is_roaming: false,
    wifi_frequency_ghz: 5.2,
  },
};

// Realistic mock screenshot SVG data URLs for remote capture gallery
function generateAppScreenshotSvg(appName: string, timeStr: string, batteryPct: number, colorTheme: string, subtext: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 780" width="360" height="780">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0F172A"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${colorTheme}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${colorTheme}" stop-opacity="0.08"/>
      </linearGradient>
    </defs>
    <rect width="360" height="780" rx="36" fill="url(#bgGrad)"/>
    <rect x="0" y="0" width="360" height="38" fill="rgba(0,0,0,0.6)"/>
    <text x="24" y="24" fill="#E2E8F0" font-size="12" font-family="monospace" font-weight="bold">${timeStr}</text>
    <circle cx="280" cy="20" r="3" fill="#38BDF8"/>
    <rect x="295" y="14" width="18" height="11" rx="2" fill="none" stroke="#E2E8F0" stroke-width="1.5"/>
    <rect x="297" y="16" width="${(batteryPct / 100) * 14}" height="7" rx="1" fill="#4ADE80"/>
    <text x="320" y="23" fill="#94A3B8" font-size="10" font-family="sans-serif">${batteryPct}%</text>
    
    <!-- App Header Bar -->
    <rect x="16" y="52" width="328" height="56" rx="16" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
    <circle cx="44" cy="80" r="16" fill="${colorTheme}"/>
    <text x="70" y="76" fill="#FFFFFF" font-size="15" font-family="sans-serif" font-weight="bold">${appName}</text>
    <text x="70" y="93" fill="#94A3B8" font-size="11" font-family="sans-serif">Live Screen Active</text>
    
    <!-- Main Content Area -->
    <rect x="16" y="122" width="328" height="180" rx="20" fill="url(#cardGrad)" stroke="${colorTheme}" stroke-opacity="0.4"/>
    <text x="36" y="160" fill="#FFFFFF" font-size="16" font-family="sans-serif" font-weight="bold">${subtext}</text>
    <rect x="36" y="180" width="288" height="8" rx="4" fill="rgba(255,255,255,0.1)"/>
    <rect x="36" y="180" width="210" height="8" rx="4" fill="${colorTheme}"/>
    <text x="36" y="215" fill="#CBD5E1" font-size="12" font-family="sans-serif">Progress: 75% Completed</text>
    <rect x="36" y="235" width="120" height="34" rx="10" fill="${colorTheme}"/>
    <text x="64" y="257" fill="#0F172A" font-size="12" font-family="sans-serif" font-weight="bold">Continue</text>

    <!-- Secondary Widgets -->
    <rect x="16" y="318" width="328" height="90" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
    <text x="36" y="348" fill="#F8FAFC" font-size="13" font-family="sans-serif" font-weight="600">Daily Study Streak</text>
    <text x="36" y="375" fill="#38BDF8" font-size="20" font-family="sans-serif" font-weight="bold">🔥 14 Days Active</text>

    <rect x="16" y="422" width="328" height="230" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)"/>
    <text x="36" y="452" fill="#F8FAFC" font-size="13" font-family="sans-serif" font-weight="600">Recent Activity Log</text>
    <rect x="36" y="470" width="288" height="36" rx="8" fill="rgba(255,255,255,0.05)"/>
    <text x="48" y="493" fill="#E2E8F0" font-size="11" font-family="sans-serif">Task: Chapter 4 Quiz Completed (96%)</text>
    <rect x="36" y="516" width="288" height="36" rx="8" fill="rgba(255,255,255,0.05)"/>
    <text x="48" y="539" fill="#E2E8F0" font-size="11" font-family="sans-serif">Teacher feedback reviewed: "Great work!"</text>
    <rect x="36" y="562" width="288" height="36" rx="8" fill="rgba(255,255,255,0.05)"/>
    <text x="48" y="585" fill="#E2E8F0" font-size="11" font-family="sans-serif">Study timer logged 42 mins</text>

    <!-- Android Home Indicator / Navigation Bar -->
    <rect x="130" y="760" width="100" height="4" rx="2" fill="#94A3B8"/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const initialScreenshots: RemoteScreenshot[] = [
  {
    id: 'shot-1',
    child_id: 1,
    device_id: 1,
    image_url: generateAppScreenshotSvg('Google Classroom', '16:42', 86, '#22C55E', 'Math Assignment: Linear Algebra 7.2'),
    captured_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    foreground_app: 'Google Classroom',
    screen_resolution: '1080 x 2400 (FHD+)',
    battery_at_capture: 86,
    trigger_source: 'parent_request',
    notes: 'Assignment submission screen active',
  },
  {
    id: 'shot-2',
    child_id: 1,
    device_id: 1,
    image_url: generateAppScreenshotSvg('Duolingo', '15:15', 91, '#3B82F6', 'Spanish Unit 3: Daily Routines & Verbs'),
    captured_at: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    foreground_app: 'Duolingo: Language Lessons',
    screen_resolution: '1080 x 2400 (FHD+)',
    battery_at_capture: 91,
    trigger_source: 'parent_request',
    notes: 'Language practice unit in progress',
  },
  {
    id: 'shot-3',
    child_id: 1,
    device_id: 1,
    image_url: generateAppScreenshotSvg('Khan Academy', '13:30', 95, '#A855F7', 'Science: Photosynthesis & Solar Biology'),
    captured_at: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    foreground_app: 'Khan Academy',
    screen_resolution: '1080 x 2400 (FHD+)',
    battery_at_capture: 95,
    trigger_source: 'automated_schedule',
    notes: 'Video lecture playback',
  },
  {
    id: 'shot-4',
    child_id: 1,
    device_id: 1,
    image_url: generateAppScreenshotSvg('YouTube Kids', '11:20', 98, '#EF4444', 'Curated Science Channel: How Rockets Work'),
    captured_at: new Date(Date.now() - 1000 * 60 * 330).toISOString(),
    foreground_app: 'YouTube Kids',
    screen_resolution: '1080 x 2400 (FHD+)',
    battery_at_capture: 98,
    trigger_source: 'parent_request',
    notes: 'Approved science documentary',
  },
];

// 30 days consent expiry from now
const consentExpiryDate = new Date();
consentExpiryDate.setDate(consentExpiryDate.getDate() + 30);

const defaultConsent: Consent = {
  id: 1,
  child_id: 1,
  parent_id: 1,
  device_id: 1,
  is_active: true,
  granted_at: new Date().toISOString(),
  expires_at: consentExpiryDate.toISOString(),
  capabilities: {
    LOCATION: true,
    CAMERA: true,
    MICROPHONE: true,
    LIVE_VIEW: true,
    SCREEN: true,
    DEVICE_STATUS: true,
    APP_LIST: true,
    CALL_LOGS: true,
    CHAT_METADATA: true,
    FILES: true,
  },
};

const initialLocations: LocationRecord[] = [
  {
    id: 1,
    child_id: 1,
    device_id: 1,
    latitude: 28.6139,
    longitude: 77.2090,
    accuracy: 6.2,
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

const initialGeofences: Geofence[] = [
  {
    id: 1,
    child_id: 1,
    name: 'Home Safezone',
    category: 'home',
    latitude: 28.6139,
    longitude: 77.2090,
    radius_meters: 300,
    is_active: true,
    alert_trigger: 'exit',
    color: '#10B981',
    description: 'Residential home perimeter - alerts immediately if child leaves the neighborhood.',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    child_id: 1,
    name: 'St. Mary High School',
    category: 'school',
    latitude: 28.6195,
    longitude: 77.2185,
    radius_meters: 250,
    is_active: true,
    alert_trigger: 'both',
    color: '#3B82F6',
    description: 'School campus and sports ground - notifies on entry and exit during school hours.',
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    child_id: 1,
    name: 'Downtown Arcade & Riverbank (Restricted)',
    category: 'danger_zone',
    latitude: 28.6050,
    longitude: 77.2150,
    radius_meters: 200,
    is_active: true,
    alert_trigger: 'enter',
    color: '#EF4444',
    description: 'Restricted high-traffic riverbank and gaming lounge area - triggers high-priority alert if entered.',
    created_at: new Date().toISOString(),
  },
];

const initialAuditEvents: AuditEvent[] = [
  {
    id: 1,
    actor_id: 1,
    actor_type: 'child',
    child_id: 1,
    device_id: 1,
    event_type: 'CONSENT_POLICY_ESTABLISHED',
    result: 'SUCCESS',
    metadata: {
      valid_days: 30,
      capabilities: ['LOCATION', 'CAMERA', 'MICROPHONE', 'DEVICE_STATUS', 'FILES', 'APP_LIST', 'CALL_LOGS', 'CHAT_METADATA'],
      authorization_mode: 'CRYPTOGRAPHIC_TOKEN_PAIR',
      revocation_rights: 'IMMEDIATE_CHILD_REVOCATION',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 2,
    actor_id: 1,
    actor_type: 'parent',
    child_id: 1,
    device_id: 1,
    event_type: 'GEOFENCE_CREATED',
    result: 'SUCCESS',
    metadata: {
      geofence_id: 1,
      name: 'Home Safezone',
      radius_meters: 300,
      category: 'home',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: 3,
    actor_id: 1,
    actor_type: 'parent',
    child_id: 1,
    device_id: 1,
    capability: 'LOCATION',
    event_type: 'LOCATION_TELEMETRY_SYNC',
    result: 'SUCCESS',
    metadata: { method: 'HIGH_ACCURACY_GPS', accuracy_meters: 8.4, latitude: 28.6139, longitude: 77.2090 },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 4,
    actor_id: 1,
    actor_type: 'parent',
    child_id: 1,
    device_id: 1,
    capability: 'CAMERA',
    event_type: 'CAMERA_SNAPSHOT_CAPTURED',
    result: 'SUCCESS',
    metadata: { sensor: 'FRONT_FACING', resolution: '1080p', flash: false },
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 5,
    actor_id: 1,
    actor_type: 'system',
    child_id: 1,
    device_id: 1,
    event_type: 'GEOFENCE_SAFEZONE_VERIFIED',
    result: 'SUCCESS',
    metadata: { zone_name: 'St. Mary High School', distance_meters: 42, radius_meters: 250 },
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 6,
    actor_id: 1,
    actor_type: 'parent',
    child_id: 1,
    device_id: 1,
    capability: 'FILES',
    event_type: 'FILE_INDEX_SCANNED',
    result: 'SUCCESS',
    metadata: { total_files: 6, total_bytes: 3591460, path: '/storage/emulated/0/' },
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 7,
    actor_id: 1,
    actor_type: 'parent',
    child_id: 1,
    device_id: 1,
    capability: 'MICROPHONE',
    event_type: 'AMBIENT_AUDIO_SAMPLE',
    result: 'SUCCESS',
    metadata: { decibel_level: 42, duration_sec: 10, noise_floor: 'NORMAL' },
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

const initialNotifications: Notification[] = [
  {
    id: 1,
    user_id: 1,
    child_id: 1,
    title: 'Consent Granted',
    message: 'Rahul granted 30-day family safety consent for Location, Camera & Mic.',
    type: 'consent',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 2,
    user_id: 1,
    child_id: 1,
    title: 'Safezone Check',
    message: 'Rahul entered Home Safezone.',
    type: 'geofence',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

interface LiveStreamState {
  child_id: number;
  is_active: boolean;
  mode: 'CAMERA' | 'MICROPHONE' | 'LIVE_VIEW' | 'SOS_EMERGENCY';
  started_at?: string;
  latest_frame?: string;
  audio_level?: number;
  last_updated?: string;
  device_locked?: boolean;
  sos_active?: boolean;
  sos_message?: string;
  sos_latitude?: number;
  sos_longitude?: number;
}

interface SOSRecord {
  is_active: boolean;
  child_id: number;
  triggered_by: 'child' | 'parent';
  message: string;
  latitude: number;
  longitude: number;
  started_at: string;
  resolved_at?: string | null;
  audio_level?: number;
  latest_frame?: string;
  route_points: Array<{ lat: number; lng: number; timestamp: string }>;
}

// DB Containers
const db = {
  users: [defaultUser],
  children: [defaultChild],
  devices: [defaultDevice],
  consents: [defaultConsent],
  capabilityRequests: [] as CapabilityRequest[],
  locations: [...initialLocations],
  auditEvents: [...initialAuditEvents],
  notifications: [...initialNotifications],
  geofences: [...initialGeofences],
  liveStreams: {} as { [child_id: number]: LiveStreamState },
  sosState: {} as { [child_id: number]: SOSRecord },
  installedApps: {} as { [child_id: number]: InstalledApp[] },
  callLogs: {} as { [child_id: number]: CallLogMetadata[] },
  chatMetadata: {} as { [child_id: number]: ChatMetadata[] },
  deviceFiles: {} as { [child_id: number]: DeviceFile[] },
  screenshots: [...initialScreenshots] as RemoteScreenshot[],
};

let nextRequestId = 1;
let nextConsentId = 2;
let nextLocationId = 2;
let nextAuditId = 3;
let nextNotificationId = 3;
let nextGeofenceId = 3;

// Helper: Log Audit Event
function logAudit(
  actor_id: number,
  actor_type: 'parent' | 'child' | 'system' | 'device',
  child_id: number,
  event_type: string,
  result: 'SUCCESS' | 'DENIED' | 'EXPIRED' | 'REVOKED' | 'FAILED',
  opts: { device_id?: number; capability?: CapabilityType; request_id?: number; metadata?: any } = {}
) {
  const event: AuditEvent = {
    id: nextAuditId++,
    actor_id,
    actor_type,
    child_id,
    device_id: opts.device_id,
    capability: opts.capability,
    request_id: opts.request_id,
    event_type,
    result,
    metadata: opts.metadata,
    timestamp: new Date().toISOString(),
  };
  db.auditEvents.unshift(event);
  return event;
}

// Helper: Check Active Consent
function getActiveConsent(childId: number) {
  const now = new Date();
  return db.consents.find(
    (c) => c.child_id === childId && c.is_active && new Date(c.expires_at) > now
  );
}

// Periodic Expired Requests Cleaner (every 10s)
setInterval(() => {
  const now = new Date();
  db.capabilityRequests.forEach((req) => {
    if (req.status === 'pending' && new Date(req.expires_at) < now) {
      req.status = 'expired';
      req.failure_reason = 'Request timed out after 60 seconds without device fulfillment';
      logAudit(req.parent_id, 'system', req.child_id, 'REQUEST_EXPIRED', 'EXPIRED', {
        request_id: req.id,
        capability: req.capability,
      });
    }
  });
}, 5000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const router = express.Router();

  // ------------------------------------------------------------
  // 1. HEALTH & METRICS
  // ------------------------------------------------------------
  router.get(['/api', '/api/info', '/api/version'], (req, res) => {
    res.json({
      service: 'GuardianX Consent Engine',
      status: 'operational',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  router.get(['/health', '/api/health'], (req, res) => {
    const activeConsents = db.consents.filter(
      (c) => c.is_active && new Date(c.expires_at) > new Date()
    );
    res.json({
      status: 'healthy',
      active_consents: activeConsents.length,
      connected_devices: db.devices.length,
      pending_requests: db.capabilityRequests.filter((r) => r.status === 'pending').length,
    });
  });

  // ------------------------------------------------------------
  // 2. AUTHENTICATION & USERS
  // ------------------------------------------------------------
  router.post(['/auth/login', '/api/auth/login', '/users/login', '/api/users/login'], (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ detail: 'Email required' });

    let user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = {
        id: db.users.length + 1,
        email: email.trim(),
        full_name: email.split('@')[0] || 'Parent',
        role: 'parent',
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
    }
    res.json({
      access_token: `gx_jwt_${user.id}_${Date.now()}`,
      token_type: 'bearer',
      user,
    });
  });

  router.get(['/users/me', '/api/users/me'], (req, res) => {
    res.json(db.users[0]);
  });

  // ------------------------------------------------------------
  // 3. CHILDREN & DEVICES
  // ------------------------------------------------------------
  router.get(['/children', '/api/children'], (req, res) => {
    res.json(db.children);
  });

  router.get(['/children/:id', '/api/children/:id'], (req, res) => {
    const child = db.children.find((c) => c.id === Number(req.params.id));
    if (!child) return res.status(404).json({ detail: 'Child not found' });
    res.json(child);
  });

  router.get(['/devices', '/api/devices'], (req, res) => {
    res.json(db.devices);
  });

  router.post(['/devices/heartbeat', '/api/devices/heartbeat'], (req, res) => {
    const { device_uuid, battery_level } = req.body;
    const device = db.devices.find((d) => d.device_uuid === device_uuid);
    if (!device) return res.status(404).json({ detail: 'Device not recognized' });

    device.last_seen = new Date().toISOString();
    if (battery_level !== undefined) device.battery_level = Number(battery_level);
    res.json({ status: 'ok', last_seen: device.last_seen, battery_level: device.battery_level });
  });

  // ------------------------------------------------------------
  // 4. CONSENT STATE ENGINE (Strict Child-Granted Model)
  // ------------------------------------------------------------
  router.get(['/consent/child/:child_id', '/api/consent/child/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const consent = getActiveConsent(childId);
    res.json(consent || null);
  });

  router.get(['/consent/device/status', '/api/consent/device/status'], (req, res) => {
    const { device_uuid } = req.query;
    const device = db.devices.find((d) => d.device_uuid === device_uuid);
    if (!device) return res.status(403).json({ detail: 'Invalid child device' });

    const activeConsent = db.consents.find(
      (c) => c.device_id === device.id && c.is_active && new Date(c.expires_at) > new Date()
    );
    res.json(activeConsent || null);
  });

  // Child Explicitly Grants / Renews Consent (Max 30 Days)
  router.post(['/consent/grant', '/api/consent/grant', '/consent/device/grant', '/api/consent/device/grant'], (req, res) => {
    const { device_uuid, capabilities } = req.body;
    const device = db.devices.find((d) => d.device_uuid === device_uuid);
    if (!device) return res.status(403).json({ detail: 'Invalid device credentials' });

    // Revoke previous consents for this device
    db.consents.forEach((c) => {
      if (c.device_id === device.id && c.is_active) {
        c.is_active = false;
        c.revoked_at = new Date().toISOString();
      }
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day hard limit

    const caps: { [key in CapabilityType]?: boolean } = {
      LOCATION: capabilities?.LOCATION !== false,
      CAMERA: capabilities?.CAMERA !== false,
      MICROPHONE: capabilities?.MICROPHONE !== false,
      LIVE_VIEW: Boolean(capabilities?.LIVE_VIEW),
      SCREEN: capabilities?.SCREEN !== false,
      DEVICE_STATUS: capabilities?.DEVICE_STATUS !== false,
      APP_LIST: capabilities?.APP_LIST !== false,
      CALL_LOGS: capabilities?.CALL_LOGS !== false,
      CHAT_METADATA: capabilities?.CHAT_METADATA !== false,
      FILES: capabilities?.FILES !== false,
    };

    const newConsent: Consent = {
      id: nextConsentId++,
      child_id: device.child_id,
      parent_id: 1,
      device_id: device.id,
      is_active: true,
      granted_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      capabilities: caps,
    };

    db.consents.push(newConsent);

    logAudit(device.child_id, 'child', device.child_id, 'CONSENT_GRANTED', 'SUCCESS', {
      device_id: device.id,
      metadata: { expires_at: expiresAt.toISOString(), capabilities: caps },
    });

    db.notifications.unshift({
      id: nextNotificationId++,
      user_id: 1,
      child_id: device.child_id,
      title: 'Consent Granted',
      message: `${device.device_name} has granted 30-day parental access for: ${Object.keys(caps).filter(k => caps[k as CapabilityType]).join(', ')}.`,
      type: 'consent',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    res.status(201).json(newConsent);
  });

  // Child Revokes Consent Immediately
  router.post(['/consent/:id/revoke', '/api/consent/:id/revoke', '/consent/revoke', '/api/consent/revoke'], (req, res) => {
    const consentId = req.params.id ? Number(req.params.id) : null;
    const consent = consentId
      ? db.consents.find((c) => c.id === consentId)
      : db.consents.find((c) => c.is_active);

    if (!consent) return res.status(404).json({ detail: 'Active consent record not found' });

    consent.is_active = false;
    consent.revoked_at = new Date().toISOString();

    // Terminate any active live streams immediately
    delete db.liveStreams[consent.child_id];

    // Cancel all pending capability requests immediately
    db.capabilityRequests.forEach((r) => {
      if (r.child_id === consent.child_id && r.status === 'pending') {
        r.status = 'cancelled';
        r.failure_reason = 'Cancelled due to immediate consent revocation';
      }
    });

    logAudit(consent.child_id, 'child', consent.child_id, 'CONSENT_REVOKED', 'REVOKED', {
      device_id: consent.device_id,
    });

    db.notifications.unshift({
      id: nextNotificationId++,
      user_id: consent.parent_id,
      child_id: consent.child_id,
      title: 'Consent Revoked',
      message: 'Child has revoked parental consent. All protected capabilities are now locked.',
      type: 'consent',
      is_read: false,
      created_at: new Date().toISOString(),
    });

    res.json({ status: 'revoked', consent });
  });

  // ------------------------------------------------------------
  // 5. CAPABILITY REQUEST STATE ENGINE (Parent -> Backend -> Child)
  // ------------------------------------------------------------
  
  // Parent creates a request (LOCATION, CAMERA, MICROPHONE)
  router.post(['/requests', '/api/requests', '/api/v1/requests', '/location-requests/child/:child_id', '/api/location-requests/child/:child_id'], (req, res) => {
    const childId = req.params.child_id ? Number(req.params.child_id) : Number(req.body.child_id || 1);
    const capability: CapabilityType = req.body.capability || 'LOCATION';

    // 1. Validate Active Consent
    const activeConsent = getActiveConsent(childId);
    if (!activeConsent) {
      logAudit(1, 'parent', childId, 'REQUEST_REJECTED', 'DENIED', {
        capability,
        metadata: { reason: 'No active consent granted by child' },
      });
      return res.status(403).json({ detail: 'Access Denied: No active consent grant from child.' });
    }

    // 2. Validate Specific Capability
    if (!activeConsent.capabilities[capability]) {
      logAudit(1, 'parent', childId, 'REQUEST_REJECTED', 'DENIED', {
        capability,
        metadata: { reason: `Capability ${capability} is not authorized by child` },
      });
      return res.status(403).json({
        detail: `Access Denied: Capability '${capability}' was not authorized in child consent settings.`,
      });
    }

    const device = db.devices.find((d) => d.child_id === childId);
    if (!device) return res.status(404).json({ detail: 'No registered device for child.' });

    // Expiry: 60 seconds from now
    const expiresAt = new Date(Date.now() + 60 * 1000);

    const capabilityReq: CapabilityRequest = {
      id: nextRequestId++,
      parent_id: activeConsent.parent_id,
      child_id: childId,
      device_id: device.id,
      capability,
      status: 'pending',
      payload: req.body.payload || {},
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    db.capabilityRequests.unshift(capabilityReq);

    logAudit(1, 'parent', childId, `${capability}_REQUESTED`, 'SUCCESS', {
      device_id: device.id,
      capability,
      request_id: capabilityReq.id,
    });

    res.status(201).json(capabilityReq);
  });

  // Get Requests List (Parent view or Device view)
  router.get(['/requests', '/api/requests', '/api/v1/requests'], (req, res) => {
    const { child_id, status } = req.query;
    let list = db.capabilityRequests;
    if (child_id) list = list.filter((r) => r.child_id === Number(child_id));
    if (status) list = list.filter((r) => r.status === status);
    res.json(list.slice(0, 30));
  });

  // Child Device fetches its pending requests
  router.get([
    '/requests/pending/:device_uuid',
    '/api/requests/pending/:device_uuid',
    '/location-requests/device/:device_uuid',
    '/api/location-requests/device/:device_uuid'
  ], (req, res) => {
    const { device_uuid } = req.params;
    const device = db.devices.find((d) => d.device_uuid === device_uuid);
    if (!device) return res.status(403).json({ detail: 'Invalid device credentials' });

    const now = new Date();
    // Return newest pending non-expired request
    const pending = db.capabilityRequests.find(
      (r) => r.device_id === device.id && r.status === 'pending' && new Date(r.expires_at) > now
    );

    res.json(pending || null);
  });

  // Child Device fulfills request (uploads GPS, Camera snapshot, Audio status)
  router.post(['/requests/:id/fulfill', '/api/requests/:id/fulfill'], (req, res) => {
    const requestId = Number(req.params.id);
    const { result_data } = req.body;

    const request = db.capabilityRequests.find((r) => r.id === requestId);
    if (!request) return res.status(404).json({ detail: 'Request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ detail: `Request is already in '${request.status}' state` });
    }

    request.status = 'fulfilled';
    request.fulfilled_at = new Date().toISOString();
    request.result_data = result_data || {};

    // If it's a location capability, save to locations table
    if (request.capability === 'LOCATION' && result_data?.latitude && result_data?.longitude) {
      db.locations.unshift({
        id: nextLocationId++,
        child_id: request.child_id,
        device_id: request.device_id,
        latitude: Number(result_data.latitude),
        longitude: Number(result_data.longitude),
        accuracy: Number(result_data.accuracy) || 6,
        request_id: request.id,
        created_at: new Date().toISOString(),
      });
    }

    // If it's APP_LIST capability, save to installedApps
    if (request.capability === 'APP_LIST' && Array.isArray(result_data?.apps)) {
      db.installedApps[request.child_id] = result_data.apps;
    }

    // If it's CALL_LOGS capability, save to callLogs
    if (request.capability === 'CALL_LOGS' && Array.isArray(result_data?.call_logs)) {
      db.callLogs[request.child_id] = result_data.call_logs;
    }

    // If it's CHAT_METADATA capability, save to chatMetadata
    if (request.capability === 'CHAT_METADATA' && Array.isArray(result_data?.chat_threads)) {
      db.chatMetadata[request.child_id] = result_data.chat_threads;
    }

    // If it's FILES capability, save to deviceFiles
    if (request.capability === 'FILES' && Array.isArray(result_data?.files)) {
      db.deviceFiles[request.child_id] = result_data.files;
    }

    logAudit(request.child_id, 'device', request.child_id, `${request.capability}_FULFILLED`, 'SUCCESS', {
      device_id: request.device_id,
      capability: request.capability,
      request_id: request.id,
      metadata: {
        app_count: result_data?.apps?.length,
        call_count: result_data?.call_logs?.length,
        chat_thread_count: result_data?.chat_threads?.length,
        file_count: result_data?.files?.length,
        summary: result_data?.summary || 'Explicit request data payload verified',
      },
    });

    res.json(request);
  });

  // Query Fetched Device Files (Protected by Consent & Explicit Request Fulfillment)
  router.get(['/device/files/:child_id', '/api/device/files/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const activeConsent = getActiveConsent(childId);
    if (!activeConsent || !activeConsent.capabilities.FILES) {
      return res.status(403).json({
        detail: 'Access Denied: File Access capability is disabled in child consent or consent has expired.',
      });
    }

    const files = db.deviceFiles[childId] || [];
    const latestFulfilledRequest = db.capabilityRequests.find(
      (r) => r.child_id === childId && r.capability === 'FILES' && r.status === 'fulfilled'
    );

    // Calculate Storage Breakdown by folder
    const totalBytes = files.reduce((acc, f) => acc + (f.size_bytes || 0), 0);
    const folderStats = files.reduce((acc: any, f) => {
      const folder = f.folder || 'Documents';
      if (!acc[folder]) acc[folder] = { count: 0, bytes: 0 };
      acc[folder].count += 1;
      acc[folder].bytes += f.size_bytes || 0;
      return acc;
    }, {});

    res.json({
      child_id: childId,
      files,
      total_files: files.length,
      total_bytes: totalBytes,
      folder_stats: folderStats,
      last_fetched_at: latestFulfilledRequest?.fulfilled_at || null,
      request_id: latestFulfilledRequest?.id || null,
      status: files.length > 0 ? 'FULFILLED' : 'NOT_FETCHED',
    });
  });

  // Download / Retrieve Device File Content (Audited)
  router.get(['/device/files/:child_id/download/:file_id', '/api/device/files/:child_id/download/:file_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const fileId = req.params.file_id;
    const activeConsent = getActiveConsent(childId);
    if (!activeConsent || !activeConsent.capabilities.FILES) {
      return res.status(403).json({
        detail: 'Access Denied: File Access capability is disabled or consent has expired.',
      });
    }

    const files = db.deviceFiles[childId] || [];
    const targetFile = files.find((f) => f.id === fileId);
    if (!targetFile) {
      return res.status(404).json({ detail: 'Requested device file not found or expired.' });
    }

    // Log explicit file download/access audit event
    logAudit(1, 'parent', childId, 'FILE_DOWNLOADED', 'SUCCESS', {
      file_id: targetFile.id,
      file_name: targetFile.name,
      folder: targetFile.folder,
      size_bytes: targetFile.size_bytes,
      mime_type: targetFile.mime_type,
    });

    res.json({
      file: targetFile,
      download_token: `gx_dl_${Date.now()}_${targetFile.id}`,
      accessed_at: new Date().toISOString(),
    });
  });

  // Query Fetched Installed App List (Protected by Consent & Explicit Request Fulfillment)
  router.get(['/device/apps/:child_id', '/api/device/apps/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const activeConsent = getActiveConsent(childId);
    if (!activeConsent || !activeConsent.capabilities.APP_LIST) {
      return res.status(403).json({
        detail: 'Access Denied: App Inventory capability is disabled or consent has expired.',
      });
    }

    const apps = db.installedApps[childId] || [];
    const latestFulfilledRequest = db.capabilityRequests.find(
      (r) => r.child_id === childId && r.capability === 'APP_LIST' && r.status === 'fulfilled'
    );

    res.json({
      child_id: childId,
      apps,
      last_fetched_at: latestFulfilledRequest?.fulfilled_at || null,
      request_id: latestFulfilledRequest?.id || null,
      status: apps.length > 0 ? 'FULFILLED' : 'NOT_FETCHED',
    });
  });

  // Query Fetched Call History Metadata (Protected by Consent & Explicit Request Fulfillment)
  router.get(['/device/calls/:child_id', '/api/device/calls/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const activeConsent = getActiveConsent(childId);
    if (!activeConsent || !activeConsent.capabilities.CALL_LOGS) {
      return res.status(403).json({
        detail: 'Access Denied: Call Logs capability is disabled or consent has expired.',
      });
    }

    const callLogs = db.callLogs[childId] || [];
    const latestFulfilledRequest = db.capabilityRequests.find(
      (r) => r.child_id === childId && r.capability === 'CALL_LOGS' && r.status === 'fulfilled'
    );

    res.json({
      child_id: childId,
      call_logs: callLogs,
      last_fetched_at: latestFulfilledRequest?.fulfilled_at || null,
      request_id: latestFulfilledRequest?.id || null,
      status: callLogs.length > 0 ? 'FULFILLED' : 'NOT_FETCHED',
    });
  });

  // Query Fetched Chat Metadata (Protected by Consent & Explicit Request Fulfillment)
  router.get(['/device/chats/:child_id', '/api/device/chats/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const activeConsent = getActiveConsent(childId);
    if (!activeConsent || !activeConsent.capabilities.CHAT_METADATA) {
      return res.status(403).json({
        detail: 'Access Denied: Chat Metadata capability is disabled or consent has expired.',
      });
    }

    const chatThreads = db.chatMetadata[childId] || [];
    const latestFulfilledRequest = db.capabilityRequests.find(
      (r) => r.child_id === childId && r.capability === 'CHAT_METADATA' && r.status === 'fulfilled'
    );

    res.json({
      child_id: childId,
      chat_threads: chatThreads,
      last_fetched_at: latestFulfilledRequest?.fulfilled_at || null,
      request_id: latestFulfilledRequest?.id || null,
      status: chatThreads.length > 0 ? 'FULFILLED' : 'NOT_FETCHED',
    });
  });

  // ------------------------------------------------------------
  // 5.1 LIVE STREAM & BACKGROUND SENSOR SESSIONS
  // ------------------------------------------------------------
  // Parent starts / stops live feed session
  router.post(['/stream/session', '/api/stream/session'], (req, res) => {
    const { child_id, is_active, mode } = req.body;
    const childId = Number(child_id || 1);

    if (is_active) {
      const activeConsent = getActiveConsent(childId);
      if (!activeConsent) {
        return res.status(403).json({ detail: 'Access Denied: No active consent grant from child.' });
      }
      const streamMode = mode || 'LIVE_VIEW';
      if (streamMode === 'CAMERA' && !activeConsent.capabilities.CAMERA) {
        return res.status(403).json({ detail: 'Camera capability is disabled in child consent.' });
      }
      if (streamMode === 'MICROPHONE' && !activeConsent.capabilities.MICROPHONE) {
        return res.status(403).json({ detail: 'Microphone capability is disabled in child consent.' });
      }
      if (streamMode === 'SCREEN' && !activeConsent.capabilities.SCREEN) {
        return res.status(403).json({ detail: 'Screen streaming capability is disabled in child consent.' });
      }

      db.liveStreams[childId] = {
        child_id: childId,
        is_active: true,
        mode: streamMode,
        started_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        device_locked: false,
      };

      logAudit(1, 'parent', childId, `LIVE_STREAM_STARTED`, 'SUCCESS', {
        metadata: { mode: streamMode },
      });
    } else {
      if (db.liveStreams[childId]) {
        db.liveStreams[childId].is_active = false;
        logAudit(1, 'parent', childId, `LIVE_STREAM_STOPPED`, 'SUCCESS');
      }
    }

    res.json(db.liveStreams[childId] || { child_id: childId, is_active: false });
  });

  // Query live stream status (Child polls or Parent polls)
  router.get(['/stream/session/:child_id', '/api/stream/session/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const session = db.liveStreams[childId];
    res.json(session || { child_id: childId, is_active: false });
  });

  // Child device posts real-time live feed frames / audio levels in background
  router.post(['/stream/feed', '/api/stream/feed'], (req, res) => {
    const { child_id, latest_frame, latest_screen_frame, active_app, audio_level, device_locked, latitude, longitude, is_sos } = req.body;
    const childId = Number(child_id || 1);

    const activeConsent = getActiveConsent(childId);
    if (!activeConsent) {
      return res.status(403).json({ detail: 'Consent inactive or revoked' });
    }

    if (!db.liveStreams[childId]) {
      db.liveStreams[childId] = {
        child_id: childId,
        is_active: true,
        mode: is_sos ? 'SOS_EMERGENCY' : 'LIVE_VIEW',
        started_at: new Date().toISOString(),
      };
    }

    if (latest_frame !== undefined) db.liveStreams[childId].latest_frame = latest_frame;
    if (latest_screen_frame !== undefined) db.liveStreams[childId].latest_screen_frame = latest_screen_frame;
    if (active_app !== undefined) db.liveStreams[childId].active_app = active_app;
    if (audio_level !== undefined) db.liveStreams[childId].audio_level = Number(audio_level);
    if (device_locked !== undefined) db.liveStreams[childId].device_locked = Boolean(device_locked);
    if (latitude !== undefined) db.liveStreams[childId].sos_latitude = Number(latitude);
    if (longitude !== undefined) db.liveStreams[childId].sos_longitude = Number(longitude);
    db.liveStreams[childId].last_updated = new Date().toISOString();

    // If SOS active, update SOS state with latest location breadcrumb, frame, and audio
    if (db.sosState[childId] && db.sosState[childId].is_active) {
      if (latest_frame) db.sosState[childId].latest_frame = latest_frame;
      if (audio_level !== undefined) db.sosState[childId].audio_level = Number(audio_level);
      if (latitude && longitude) {
        db.sosState[childId].latitude = Number(latitude);
        db.sosState[childId].longitude = Number(longitude);
        db.sosState[childId].route_points.push({
          lat: Number(latitude),
          lng: Number(longitude),
          timestamp: new Date().toISOString(),
        });
        // Keep latest 25 route trace points
        if (db.sosState[childId].route_points.length > 25) {
          db.sosState[childId].route_points.shift();
        }
      }
    }

    res.json({ status: 'ok', timestamp: db.liveStreams[childId].last_updated });
  });

  // Parent queries real-time live feed
  router.get(['/stream/feed/:child_id', '/api/stream/feed/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const stream = db.liveStreams[childId];
    res.json(stream || null);
  });

  // ------------------------------------------------------------
  // 5.2 REAL-TIME BATTERY & NETWORK TELEMETRY
  // ------------------------------------------------------------
  // Query Device Battery Telemetry
  router.get(['/device/battery/:child_id', '/api/device/battery/:child_id', '/api/battery/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const device = db.devices.find((d) => d.child_id === childId);
    if (!device) return res.status(404).json({ detail: 'Child device not found' });

    // Fallback/Ensure battery details exists
    const batteryDetails: DeviceBatteryDetails = device.battery_details || {
      battery_level: device.battery_level || 86,
      is_charging: false,
      charging_type: 'NONE',
      temperature_c: 28.4,
      voltage_v: 4.14,
      health: 'GOOD',
      estimated_time_remaining_minutes: 860,
      power_saving_mode: false,
      screen_on_time_minutes_today: 184,
      last_updated: new Date().toISOString(),
    };

    res.json({
      child_id: childId,
      device_id: device.id,
      device_name: device.device_name,
      battery: batteryDetails,
    });
  });

  // Sync / Update Battery Telemetry
  router.post(['/device/battery/sync', '/api/device/battery/sync'], (req, res) => {
    const { child_id, battery_level, is_charging, charging_type, temperature_c, power_saving_mode } = req.body;
    const childId = Number(child_id || 1);
    const device = db.devices.find((d) => d.child_id === childId);
    if (!device) return res.status(404).json({ detail: 'Child device not found' });

    const newLevel = battery_level !== undefined ? Number(battery_level) : (device.battery_details?.battery_level || 86);
    device.battery_level = newLevel;
    device.last_seen = new Date().toISOString();

    device.battery_details = {
      battery_level: newLevel,
      is_charging: is_charging !== undefined ? Boolean(is_charging) : (device.battery_details?.is_charging || false),
      charging_type: charging_type || device.battery_details?.charging_type || 'NONE',
      temperature_c: temperature_c !== undefined ? Number(temperature_c) : (device.battery_details?.temperature_c || 28.5),
      voltage_v: Number((3.6 + (newLevel / 100) * 0.6).toFixed(2)),
      health: (temperature_c && temperature_c > 45) ? 'OVERHEAT' : 'GOOD',
      estimated_time_remaining_minutes: Math.round(newLevel * 10.2),
      power_saving_mode: power_saving_mode !== undefined ? Boolean(power_saving_mode) : (device.battery_details?.power_saving_mode || false),
      screen_on_time_minutes_today: device.battery_details?.screen_on_time_minutes_today || 184,
      last_updated: new Date().toISOString(),
    };

    logAudit(1, 'device', childId, 'BATTERY_TELEMETRY_SYNC', 'SUCCESS', {
      device_id: device.id,
      metadata: device.battery_details,
    });

    res.json({ status: 'ok', battery: device.battery_details });
  });

  // Query Device Network Telemetry
  router.get(['/device/network/:child_id', '/api/device/network/:child_id', '/api/network/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const device = db.devices.find((d) => d.child_id === childId);
    if (!device) return res.status(404).json({ detail: 'Child device not found' });

    const networkDetails: DeviceNetworkDetails = device.network_details || {
      connection_type: 'WIFI',
      signal_strength_bars: 5,
      signal_dbm: -62,
      network_name: 'Home_5GHz_Mesh',
      ip_address: '192.168.1.142',
      latency_ms: 22,
      download_speed_mbps: 184.5,
      upload_speed_mbps: 42.0,
      is_roaming: false,
      wifi_frequency_ghz: 5.2,
    };

    res.json({
      child_id: childId,
      device_id: device.id,
      network: networkDetails,
    });
  });

  // ------------------------------------------------------------
  // 5.3 REMOTE SCREENSHOT REQUEST & GALLERY
  // ------------------------------------------------------------
  // Query Captured Screenshots Gallery
  router.get(['/device/screenshots/:child_id', '/api/device/screenshots/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const activeConsent = getActiveConsent(childId);
    if (!activeConsent || (!activeConsent.capabilities.SCREEN && !activeConsent.capabilities.LIVE_VIEW)) {
      return res.status(403).json({
        detail: 'Access Denied: Screen capture capability is disabled in child consent or consent has expired.',
      });
    }

    const screenshots = db.screenshots.filter((s) => s.child_id === childId);
    res.json({
      child_id: childId,
      total_count: screenshots.length,
      screenshots,
    });
  });

  // Request Remote Screenshot Capture
  router.post(['/device/screenshots/request', '/api/device/screenshots/request'], (req, res) => {
    const { child_id, custom_app, custom_image_url } = req.body;
    const childId = Number(child_id || 1);
    const activeConsent = getActiveConsent(childId);
    if (!activeConsent || (!activeConsent.capabilities.SCREEN && !activeConsent.capabilities.LIVE_VIEW)) {
      return res.status(403).json({
        detail: 'Access Denied: Screen capture capability is disabled in child consent.',
      });
    }

    const device = db.devices.find((d) => d.child_id === childId);
    const currentStream = db.liveStreams[childId];
    const foregroundApp = custom_app || currentStream?.active_app || 'Google Classroom';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const batteryPct = device?.battery_level || 86;

    // Use live stream canvas frame if available, otherwise generate authentic mock frame
    let imageUrl = custom_image_url || currentStream?.latest_screen_frame;
    if (!imageUrl) {
      const themes: { [key: string]: { color: string; desc: string } } = {
        'Google Classroom': { color: '#22C55E', desc: 'Linear Algebra Chapter 7 Assignment' },
        'Duolingo: Language Lessons': { color: '#3B82F6', desc: 'Spanish Vocabulary Quiz - Day 14' },
        'Khan Academy': { color: '#A855F7', desc: 'Cellular Respiration & Biology Lab' },
        'YouTube Kids': { color: '#EF4444', desc: 'Planetary Science Video Series' },
        'Minecraft Pocket Edition': { color: '#F59E0B', desc: 'Redstone Circuit Engineering Sandbox' },
        'Math Quiz': { color: '#06B6D4', desc: 'Algebra Speed Drill - Score: 120' },
      };
      const theme = themes[foregroundApp] || { color: '#10B981', desc: 'Active Application Workspace' };
      imageUrl = generateAppScreenshotSvg(foregroundApp, timeStr, batteryPct, theme.color, theme.desc);
    }

    const newScreenshot: RemoteScreenshot = {
      id: `shot-${Date.now()}`,
      child_id: childId,
      device_id: device?.id || 1,
      image_url: imageUrl,
      captured_at: now.toISOString(),
      foreground_app: foregroundApp,
      screen_resolution: '1080 x 2400 (FHD+)',
      battery_at_capture: batteryPct,
      trigger_source: 'parent_request',
      notes: `Remote screenshot requested by Parent at ${timeStr}`,
    };

    db.screenshots.unshift(newScreenshot);

    logAudit(1, 'parent', childId, 'REMOTE_SCREENSHOT_CAPTURED', 'SUCCESS', {
      device_id: device?.id || 1,
      capability: 'SCREEN',
      metadata: {
        screenshot_id: newScreenshot.id,
        foreground_app: newScreenshot.foreground_app,
        battery_pct: newScreenshot.battery_at_capture,
        resolution: newScreenshot.screen_resolution,
      },
    });

    res.status(201).json({
      status: 'captured',
      screenshot: newScreenshot,
    });
  });

  // Delete / Archive Screenshot
  router.delete(['/device/screenshots/:child_id/:screenshot_id', '/api/device/screenshots/:child_id/:screenshot_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const screenshotId = req.params.screenshot_id;

    const initialLen = db.screenshots.length;
    db.screenshots = db.screenshots.filter((s) => !(s.child_id === childId && s.id === screenshotId));

    if (db.screenshots.length === initialLen) {
      return res.status(404).json({ detail: 'Screenshot not found' });
    }

    logAudit(1, 'parent', childId, 'SCREENSHOT_DELETED', 'SUCCESS', {
      metadata: { screenshot_id: screenshotId },
    });

    res.json({ status: 'deleted', screenshot_id: screenshotId });
  });

  // ------------------------------------------------------------
  // 6. LOCATIONS & GEOFENCES
  // ------------------------------------------------------------
  router.post(['/locations/device', '/api/locations/device'], (req, res) => {
    const { device_uuid, latitude, longitude, accuracy, request_id } = req.body;
    const device = db.devices.find((d) => d.device_uuid === device_uuid);
    if (!device) return res.status(403).json({ detail: 'Invalid device' });

    const activeConsent = getActiveConsent(device.child_id);
    if (!activeConsent || !activeConsent.capabilities.LOCATION) {
      return res.status(403).json({ detail: 'Location sharing is not authorized' });
    }

    const loc: LocationRecord = {
      id: nextLocationId++,
      child_id: device.child_id,
      device_id: device.id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: Number(accuracy) || 8,
      request_id: request_id ? Number(request_id) : null,
      created_at: new Date().toISOString(),
    };

    db.locations.unshift(loc);

    if (request_id) {
      const r = db.capabilityRequests.find((cr) => cr.id === Number(request_id));
      if (r && r.status === 'pending') {
        r.status = 'fulfilled';
        r.fulfilled_at = new Date().toISOString();
      }
    }

    res.status(201).json(loc);
  });

  router.get(['/locations/latest/:child_id', '/api/locations/latest/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const loc = db.locations.find((l) => l.child_id === childId);
    if (!loc) return res.status(404).json({ detail: 'No location records found' });
    res.json(loc);
  });

  router.get(['/locations/history/:child_id', '/api/locations/history/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    res.json(db.locations.filter((l) => l.child_id === childId).slice(0, 30));
  });

  // Helper: Haversine Distance in meters
  function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  // Get Geofences (with optional child_id filter)
  router.get(['/geofences', '/api/geofences'], (req, res) => {
    const { child_id } = req.query;
    if (child_id) {
      return res.json(db.geofences.filter((g) => g.child_id === Number(child_id)));
    }
    res.json(db.geofences);
  });

  // Create New Geofence
  router.post(['/geofences', '/api/geofences'], (req, res) => {
    const { child_id, name, category, latitude, longitude, radius_meters, is_active, alert_trigger, color, description } = req.body;
    const childId = Number(child_id || 1);

    if (!name || latitude === undefined || longitude === undefined || !radius_meters) {
      return res.status(400).json({ detail: 'Missing required geofence fields (name, latitude, longitude, radius_meters).' });
    }

    const newGeofence: Geofence = {
      id: nextGeofenceId++,
      child_id: childId,
      name: String(name).trim(),
      category: category || 'safe_zone',
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius_meters: Math.max(25, Number(radius_meters)),
      is_active: is_active !== false,
      alert_trigger: alert_trigger || 'exit',
      color: color || (category === 'danger_zone' ? '#EF4444' : category === 'school' ? '#3B82F6' : '#10B981'),
      description: description || '',
      created_at: new Date().toISOString(),
    };

    db.geofences.unshift(newGeofence);

    logAudit(1, 'parent', childId, 'GEOFENCE_CREATED', 'SUCCESS', {
      metadata: {
        geofence_id: newGeofence.id,
        name: newGeofence.name,
        radius_meters: newGeofence.radius_meters,
        category: newGeofence.category,
      },
    });

    res.status(201).json(newGeofence);
  });

  // Update Geofence
  router.put(['/geofences/:id', '/api/geofences/:id'], (req, res) => {
    const geofenceId = Number(req.params.id);
    const geofence = db.geofences.find((g) => g.id === geofenceId);
    if (!geofence) {
      return res.status(404).json({ detail: 'Geofence zone not found.' });
    }

    const { name, category, latitude, longitude, radius_meters, is_active, alert_trigger, color, description } = req.body;

    if (name !== undefined) geofence.name = String(name).trim();
    if (category !== undefined) geofence.category = category;
    if (latitude !== undefined) geofence.latitude = Number(latitude);
    if (longitude !== undefined) geofence.longitude = Number(longitude);
    if (radius_meters !== undefined) geofence.radius_meters = Math.max(25, Number(radius_meters));
    if (is_active !== undefined) geofence.is_active = Boolean(is_active);
    if (alert_trigger !== undefined) geofence.alert_trigger = alert_trigger;
    if (color !== undefined) geofence.color = color;
    if (description !== undefined) geofence.description = description;

    logAudit(1, 'parent', geofence.child_id, 'GEOFENCE_UPDATED', 'SUCCESS', {
      metadata: {
        geofence_id: geofence.id,
        name: geofence.name,
        radius_meters: geofence.radius_meters,
        is_active: geofence.is_active,
      },
    });

    res.json(geofence);
  });

  // Toggle Geofence Active / Inactive
  router.post(['/geofences/:id/toggle', '/api/geofences/:id/toggle'], (req, res) => {
    const geofenceId = Number(req.params.id);
    const geofence = db.geofences.find((g) => g.id === geofenceId);
    if (!geofence) {
      return res.status(404).json({ detail: 'Geofence zone not found.' });
    }

    geofence.is_active = !geofence.is_active;

    logAudit(1, 'parent', geofence.child_id, 'GEOFENCE_STATUS_TOGGLED', 'SUCCESS', {
      metadata: {
        geofence_id: geofence.id,
        name: geofence.name,
        is_active: geofence.is_active,
      },
    });

    res.json(geofence);
  });

  // Delete Geofence
  router.delete(['/geofences/:id', '/api/geofences/:id'], (req, res) => {
    const geofenceId = Number(req.params.id);
    const index = db.geofences.findIndex((g) => g.id === geofenceId);
    if (index === -1) {
      return res.status(404).json({ detail: 'Geofence zone not found.' });
    }

    const removed = db.geofences.splice(index, 1)[0];

    logAudit(1, 'parent', removed.child_id, 'GEOFENCE_DELETED', 'SUCCESS', {
      metadata: {
        geofence_id: removed.id,
        name: removed.name,
      },
    });

    res.json({ status: 'deleted', id: geofenceId });
  });

  // Check / Evaluate Location Proximity & Breaches for Child
  router.post(['/geofences/evaluate/:child_id', '/api/geofences/evaluate/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const { latitude, longitude } = req.body;

    // Use provided coords or latest known location
    const childLoc = latitude !== undefined && longitude !== undefined
      ? { latitude: Number(latitude), longitude: Number(longitude) }
      : db.locations.find((l) => l.child_id === childId);

    if (!childLoc) {
      return res.status(404).json({ detail: 'No location available to evaluate geofences.' });
    }

    const activeGeofences = db.geofences.filter((g) => g.child_id === childId && g.is_active);
    const evaluations = activeGeofences.map((geo) => {
      const distance = calculateDistanceMeters(childLoc.latitude, childLoc.longitude, geo.latitude, geo.longitude);
      const isInside = distance <= geo.radius_meters;
      let breach = false;
      let breachReason = '';

      if (geo.category === 'danger_zone' && isInside) {
        breach = true;
        breachReason = `Child entered restricted area "${geo.name}" (${distance}m from center)`;
      } else if (geo.category !== 'danger_zone' && !isInside && (geo.alert_trigger === 'exit' || geo.alert_trigger === 'both')) {
        breach = true;
        breachReason = `Child exited safe perimeter "${geo.name}" (${distance}m away, radius is ${geo.radius_meters}m)`;
      }

      if (breach) {
        geo.last_breach_at = new Date().toISOString();

        // Add to notifications
        const notif: Notification = {
          id: nextNotificationId++,
          user_id: 1,
          child_id: childId,
          title: geo.category === 'danger_zone' ? '🚨 Restricted Zone Breach!' : '⚠️ Safezone Exit Alert',
          message: breachReason,
          type: 'geofence',
          is_read: false,
          created_at: new Date().toISOString(),
        };
        db.notifications.unshift(notif);

        logAudit(1, 'system', childId, 'GEOFENCE_BREACH_DETECTED', 'SUCCESS', {
          metadata: {
            geofence_id: geo.id,
            name: geo.name,
            distance,
            radius_meters: geo.radius_meters,
            category: geo.category,
          },
        });
      }

      return {
        geofence_id: geo.id,
        name: geo.name,
        category: geo.category,
        distance_meters: distance,
        radius_meters: geo.radius_meters,
        is_inside: isInside,
        is_breached: breach,
        breach_reason: breachReason,
      };
    });

    res.json({
      child_id: childId,
      evaluated_at: new Date().toISOString(),
      location: childLoc,
      total_active_geofences: activeGeofences.length,
      evaluations,
      has_breaches: evaluations.some((e) => e.is_breached),
    });
  });

  // ------------------------------------------------------------
  // 7. AUDIT LOGS & NOTIFICATIONS & SOS
  // ------------------------------------------------------------
  router.get(['/audit', '/api/audit', '/api/v1/audit'], (req, res) => {
    const { child_id, actor_type, capability, result, search, limit } = req.query;
    let events = [...db.auditEvents];

    if (child_id) {
      events = events.filter((e) => e.child_id === Number(child_id));
    }
    if (actor_type && actor_type !== 'ALL') {
      events = events.filter((e) => e.actor_type.toLowerCase() === String(actor_type).toLowerCase());
    }
    if (capability && capability !== 'ALL') {
      events = events.filter((e) => e.capability === capability);
    }
    if (result && result !== 'ALL') {
      events = events.filter((e) => e.result === result);
    }
    if (search) {
      const q = String(search).toLowerCase();
      events = events.filter(
        (e) =>
          e.event_type.toLowerCase().includes(q) ||
          e.actor_type.toLowerCase().includes(q) ||
          (e.capability && e.capability.toLowerCase().includes(q)) ||
          (e.metadata && JSON.stringify(e.metadata).toLowerCase().includes(q))
      );
    }

    const maxLimit = limit ? Number(limit) : 200;
    res.json(events.slice(0, maxLimit));
  });

  router.get(['/notifications/my', '/api/notifications/my'], (req, res) => {
    res.json(db.notifications.slice(0, 20));
  });

  router.post(['/notifications/:id/read', '/api/notifications/:id/read'], (req, res) => {
    const notif = db.notifications.find((n) => n.id === Number(req.params.id));
    if (notif) notif.is_read = true;
    res.json({ status: 'ok' });
  });

  // SOS Emergency Trigger (Child or Parent triggered)
  router.post(['/trigger', '/api/trigger', '/sos/trigger', '/api/sos/trigger'], (req, res) => {
    const { child_id, message, latitude, longitude, triggered_by } = req.body;
    const childId = Number(child_id || 1);
    const child = db.children.find((c) => c.id === childId);
    const currentLat = Number(latitude) || 37.7749;
    const currentLng = Number(longitude) || -122.4194;

    const notification: Notification = {
      id: nextNotificationId++,
      user_id: 1,
      child_id: childId,
      title: `🚨 EMERGENCY SOS - ${child?.name || 'Rahul'}`,
      message: message || 'Emergency SOS triggered! Live camera, microphone, and location broadcast active.',
      type: 'sos',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    db.notifications.unshift(notification);

    // Save SOS location
    db.locations.unshift({
      id: nextLocationId++,
      child_id: childId,
      latitude: currentLat,
      longitude: currentLng,
      accuracy: 3,
      created_at: new Date().toISOString(),
    });

    // Activate High-Priority Live Stream Mode
    db.liveStreams[childId] = {
      child_id: childId,
      is_active: true,
      mode: 'SOS_EMERGENCY',
      started_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      sos_active: true,
      sos_message: message || 'EMERGENCY SOS ACTIVE',
      sos_latitude: currentLat,
      sos_longitude: currentLng,
    };

    // Store SOS Record
    db.sosState[childId] = {
      is_active: true,
      child_id: childId,
      triggered_by: triggered_by || 'child',
      message: message || 'Emergency SOS activated! Live video, audio, and breadcrumb tracking active.',
      latitude: currentLat,
      longitude: currentLng,
      started_at: new Date().toISOString(),
      audio_level: 65,
      route_points: [
        { lat: currentLat, lng: currentLng, timestamp: new Date().toISOString() },
      ],
    };

    logAudit(childId, triggered_by === 'parent' ? 'parent' : 'child', childId, 'EMERGENCY_SOS_TRIGGERED', 'SUCCESS', {
      metadata: { message, latitude: currentLat, longitude: currentLng, triggered_by },
    });

    res.status(201).json({ status: 'sos_broadcasted', sos: db.sosState[childId], notification });
  });

  // Query Current SOS State
  router.get(['/sos/state/:child_id', '/api/sos/state/:child_id'], (req, res) => {
    const childId = Number(req.params.child_id);
    const sos = db.sosState[childId] || { is_active: false, child_id: childId };
    res.json(sos);
  });

  // Resolve / Dismiss SOS Emergency
  router.post(['/sos/resolve', '/api/sos/resolve'], (req, res) => {
    const { child_id, resolved_by } = req.body;
    const childId = Number(child_id || 1);

    if (db.sosState[childId]) {
      db.sosState[childId].is_active = false;
      db.sosState[childId].resolved_at = new Date().toISOString();
    }

    if (db.liveStreams[childId]) {
      db.liveStreams[childId].sos_active = false;
      db.liveStreams[childId].mode = 'LIVE_VIEW';
    }

    logAudit(1, 'parent', childId, 'EMERGENCY_SOS_RESOLVED', 'SUCCESS', {
      metadata: { resolved_by: resolved_by || 'parent' },
    });

    res.json({ status: 'resolved', child_id: childId });
  });

  // Device Full Diagnostic & Sensor Telemetry (For complete parental oversight)
  router.get(['/devices/:id/diagnostics', '/api/devices/:id/diagnostics'], (req, res) => {
    const deviceId = Number(req.params.id);
    const device = db.devices.find((d) => d.id === deviceId);
    if (!device) return res.status(404).json({ detail: 'Device not found' });

    res.json({
      device_id: device.id,
      device_name: device.device_name,
      battery_level: device.battery_level,
      is_charging: false,
      network_type: '5G NR (Ultra Wideband)',
      wifi_ssid: 'Home_Secure_5G',
      storage_used_gb: 42.6,
      storage_total_gb: 128,
      memory_used_mb: 3200,
      memory_total_mb: 6144,
      foreground_service: 'GuardianX Core Watchdog (PID: 18420)',
      os_version: 'Android 14 (API Level 34 - U)',
      security_patch: '2026-08-01',
      last_sync: new Date().toISOString(),
    });
  });

  app.use(router);

  // ------------------------------------------------------------
  // VITE DEV MIDDLEWARE / STATIC PROD SERVING
  // ------------------------------------------------------------
  // In production or when bundled, always use static files
  if (process.env.NODE_ENV === 'production' || process.env.BUNDLE_MODE === 'true') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Only create Vite dev server in dev mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GuardianX Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
