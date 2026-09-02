export type UserRole = 'parent' | 'child';

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

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Child {
  id: number;
  parent_id: number;
  name: string;
  age: number;
  created_at: string;
}

export interface Device {
  id: number;
  child_id: number;
  device_name: string;
  device_uuid: string;
  pairing_token: string;
  is_active: boolean;
  battery_level: number;
  last_seen: string;
  created_at: string;
}

export interface ConsentCapability {
  id: number;
  consent_id: number;
  capability: CapabilityType;
  enabled: boolean;
  created_at: string;
}

export interface Consent {
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

export interface CapabilityRequest {
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

export interface LocationRecord {
  id: number;
  child_id: number;
  device_id?: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  request_id?: number | null;
  created_at: string;
}

export interface AuditEvent {
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

export interface Notification {
  id: number;
  user_id: number;
  child_id?: number;
  title: string;
  message: string;
  type: 'sos' | 'geofence' | 'consent' | 'capability' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface Geofence {
  id: number;
  child_id: number;
  name: string;
  category?: 'home' | 'school' | 'safe_zone' | 'danger_zone' | 'activity' | 'custom';
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  alert_trigger?: 'exit' | 'enter' | 'both';
  color?: string;
  description?: string;
  created_at: string;
  last_breach_at?: string | null;
}

export interface LiveStreamSession {
  child_id: number;
  is_active: boolean;
  mode: 'CAMERA' | 'MICROPHONE' | 'LIVE_VIEW' | 'SCREEN' | 'SOS_EMERGENCY';
  started_at?: string;
  latest_frame?: string;
  latest_screen_frame?: string;
  active_app?: string;
  audio_level?: number;
  last_updated?: string;
  device_locked?: boolean;
  sos_active?: boolean;
  sos_message?: string;
  sos_latitude?: number;
  sos_longitude?: number;
}

export interface SOSState {
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
  route_points?: Array<{ lat: number; lng: number; timestamp: string }>;
}

