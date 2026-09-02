import React, { useState, useEffect } from 'react';
import {
  Shield,
  MapPin,
  AlertTriangle,
  Radio,
  Camera,
  Mic,
  Activity,
  History,
  Lock,
  Smartphone,
  BatteryCharging,
  Navigation,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Eye,
  Info,
  Video,
  Volume2,
  Play,
  Square,
  Wifi,
  Layers,
  Cpu,
  HardDrive,
  Check,
  Bell,
  PhoneCall,
  VolumeX,
  Sliders,
  Compass,
  Monitor,
  Folder,
  MessageSquare,
  Signal,
  TrendingUp
} from 'lucide-react';
import { InteractiveMap } from './InteractiveMap';
import { DeviceFilesExplorer } from './DeviceFilesExplorer';
import { CommunicationsManager } from './CommunicationsManager';
import { GeofenceManager } from './GeofenceManager';
import { AuditLogs } from './AuditLogs';
import { BatteryStatusWidget } from './BatteryStatusWidget';
import { AppUsageSummary } from './AppUsageSummary';
import { RemoteScreenshotGalleryModal } from './RemoteScreenshotGalleryModal';
import {
  User,
  Child,
  Device,
  Consent,
  CapabilityRequest,
  LocationRecord,
  Notification,
  Geofence,
  AuditEvent,
  CapabilityType,
  LiveStreamSession,
  SOSState
} from '../types';

interface ParentDashboardProps {
  user: User;
  onLogout: () => void;
  onSwitchToChild?: () => void;  // Optional when device is locked to parent role
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  user,
  onLogout,
  onSwitchToChild,
}) => {
  const [activeTab, setActiveTab] = useState<'surveillance' | 'geofences' | 'files' | 'communications' | 'diagnostics' | 'requests' | 'audit'>('surveillance');
  const [child, setChild] = useState<Child | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [location, setLocation] = useState<LocationRecord | null>(null);
  const [requests, setRequests] = useState<CapabilityRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);

  // Live Stream Feed & SOS State
  const [liveStream, setLiveStream] = useState<LiveStreamSession | null>(null);
  const [sosState, setSosState] = useState<SOSState | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamMode, setStreamMode] = useState<'LIVE_VIEW' | 'CAMERA' | 'MICROPHONE' | 'SCREEN'>('LIVE_VIEW');
  const [surveillanceTab, setSurveillanceTab] = useState<'MATRIX' | 'SCREEN' | 'CAMERA' | 'AUDIO'>('MATRIX');

  const [dispatchingCap, setDispatchingCap] = useState<CapabilityType | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [resolvingSos, setResolvingSos] = useState(false);
  const [isScreenshotGalleryOpen, setIsScreenshotGalleryOpen] = useState(false);
  const [requestingScreenshot, setRequestingScreenshot] = useState(false);

  // Historical Route Trail for Map
  const [routeHistory, setRouteHistory] = useState<Array<{ lat: number; lng: number; timestamp: string }>>([]);

  // Load parent state & synchronize live streams
  const loadData = async () => {
    try {
      const [
        childRes,
        devRes,
        consentRes,
        locRes,
        reqRes,
        auditRes,
        notifRes,
        geoRes,
        streamRes,
        sosRes,
      ] = await Promise.all([
        fetch('/api/children/1'),
        fetch('/api/devices'),
        fetch('/api/consent/child/1'),
        fetch('/api/locations/latest/1'),
        fetch('/api/requests?child_id=1'),
        fetch('/api/audit'),
        fetch('/api/notifications/my'),
        fetch('/api/geofences'),
        fetch('/api/stream/feed/1'),
        fetch('/api/sos/state/1'),
      ]);

      if (childRes.ok) setChild(await childRes.json());
      if (devRes.ok) {
        const devs = await devRes.json();
        if (devs.length > 0) setDevice(devs[0]);
      }
      if (consentRes.ok) setConsent(await consentRes.json());
      if (locRes.ok) {
        const loc: LocationRecord = await locRes.json();
        setLocation(loc);
        if (loc && loc.latitude && loc.longitude) {
          setRouteHistory((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.lat !== loc.latitude || last.lng !== loc.longitude) {
              return [...prev.slice(-19), { lat: loc.latitude, lng: loc.longitude, timestamp: loc.created_at }];
            }
            return prev;
          });
        }
      }
      if (reqRes.ok) setRequests(await reqRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (geoRes.ok) setGeofences(await geoRes.json());
      if (streamRes.ok) setLiveStream(await streamRes.json());
      if (sosRes.ok) {
        const s: SOSState = await sosRes.json();
        setSosState(s);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1800);
    return () => clearInterval(interval);
  }, []);

  // Start continuous Live Feed from child device
  const handleStartStream = async (mode: 'LIVE_VIEW' | 'CAMERA' | 'MICROPHONE') => {
    if (!isConsentActive) {
      setActionMessage('Cannot start live stream: Child has not granted active consent.');
      return;
    }
    try {
      setStreamLoading(true);
      const res = await fetch('/api/stream/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: 1,
          mode: mode,
          action: 'START',
        }),
      });
      if (res.ok) {
        const session: LiveStreamSession = await res.json();
        setLiveStream(session);
        setActionMessage(`📡 Continuous Live ${mode} stream initiated with child's background service.`);
      }
    } catch (err: any) {
      setActionMessage(`❌ Error starting stream: ${err.message}`);
    } finally {
      setStreamLoading(false);
    }
  };

  // Stop continuous Live Feed
  const handleStopStream = async () => {
    try {
      setStreamLoading(true);
      const res = await fetch('/api/stream/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: 1,
          mode: streamMode,
          action: 'STOP',
        }),
      });
      if (res.ok) {
        const session: LiveStreamSession = await res.json();
        setLiveStream(session);
        setActionMessage('Live streaming session paused.');
      }
    } catch (err: any) {
      setActionMessage(`❌ Error stopping stream: ${err.message}`);
    } finally {
      setStreamLoading(false);
    }
  };

  // Dispatch specific Capability Request (Location, Camera, Microphone)
  const handleRequestCapability = async (capability: CapabilityType) => {
    if (!isConsentActive) {
      setActionMessage('Cannot dispatch request: Child has not granted active consent.');
      return;
    }
    if (!consent?.capabilities[capability]) {
      setActionMessage(`Permission Denied: Child has disabled the '${capability}' capability.`);
      return;
    }

    try {
      setDispatchingCap(capability);
      setActionMessage(`Dispatched ${capability} request to ${child?.name || "Rahul"}'s device...`);

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: 1,
          capability,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to dispatch request');
      }

      const newReq: CapabilityRequest = await res.json();

      // Poll for fulfillment
      const startTime = Date.now();
      const pollTimer = setInterval(async () => {
        const reqCheck = await fetch(`/api/requests?child_id=1`);
        if (reqCheck.ok) {
          const reqs: CapabilityRequest[] = await reqCheck.json();
          const target = reqs.find((r) => r.id === newReq.id);
          if (target && target.status === 'fulfilled') {
            setDispatchingCap(null);
            setActionMessage(`✅ ${capability} request was successfully fulfilled by child's device!`);
            clearInterval(pollTimer);
            loadData();
            return;
          }
          if (target && (target.status === 'denied' || target.status === 'expired')) {
            setDispatchingCap(null);
            setActionMessage(`⚠️ ${capability} request ended with status: ${target.status}`);
            clearInterval(pollTimer);
            loadData();
            return;
          }
        }

        if (Date.now() - startTime > 30000) {
          setDispatchingCap(null);
          setActionMessage(`⏱️ ${capability} request waiting for device response.`);
          clearInterval(pollTimer);
        }
      }, 1200);
    } catch (err: any) {
      setDispatchingCap(null);
      setActionMessage(`❌ ${err.message}`);
    }
  };

  // Remote Screenshot on-demand request
  const handleTriggerRemoteScreenshot = async () => {
    if (!isConsentActive) {
      setActionMessage('Cannot capture screenshot: Child has not granted active consent.');
      return;
    }
    try {
      setRequestingScreenshot(true);
      setActionMessage("📸 Dispatched on-demand remote screen capture request to Rahul's phone...");
      const res = await fetch('/api/device/screenshots/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: 1 }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(`✅ Screen capture received successfully from Rahul's Phone (${data.screenshot?.foreground_app || 'Active App'})`);
        setIsScreenshotGalleryOpen(true);
        loadData();
      } else {
        const err = await res.json();
        setActionMessage(`❌ Screenshot capture failed: ${err.detail || 'Device unreachable'}`);
      }
    } catch (err: any) {
      setActionMessage(`❌ Screenshot request error: ${err.message}`);
    } finally {
      setRequestingScreenshot(false);
    }
  };

  // Trigger Emergency SOS Broadcast
  const handleTriggerSOS = async () => {
    if (!confirm('Broadcast an Emergency Safety SOS for Rahul? This initiates continuous high-frequency location, camera, and audio tracking.')) return;
    try {
      setSosLoading(true);
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: 1,
          message: '🚨 Emergency SOS broadcast initiated by Parent Portal.',
          latitude: location?.latitude || 28.6139,
          longitude: location?.longitude || 77.2090,
          triggered_by: 'parent',
        }),
      });
      if (res.ok) {
        setActionMessage('🚨 Emergency SOS alert active! Continuous telemetry broadcasting.');
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSosLoading(false);
    }
  };

  // Resolve Emergency SOS
  const handleResolveSOS = async () => {
    try {
      setResolvingSos(true);
      const res = await fetch('/api/sos/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: 1,
          resolved_by: user.email || 'parent@guardianx.internal',
        }),
      });
      if (res.ok) {
        setActionMessage('✅ Emergency SOS resolved and archived in audit log.');
        loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResolvingSos(false);
    }
  };

  const isConsentActive =
    consent && consent.is_active && new Date(consent.expires_at) > new Date();

  const isSosEmergency = Boolean(sosState?.is_active || liveStream?.sos_active);

  const daysRemaining = consent?.expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(consent.expires_at).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#214235]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1E3E34] to-[#10201B] border border-[#2C5142] flex items-center justify-center text-[#B8F36B] shadow-lg shadow-black/40">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              GuardianX Command Center
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#162B24] text-[#B8F36B] border border-[#2C5142]">
                Parent Portal
              </span>
            </h1>
            <p className="text-xs text-[#7C9B8A]">
              Monitoring child: <strong className="text-white">{child?.name || 'Rahul'}</strong> • Full Access Suite
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleTriggerRemoteScreenshot}
            disabled={requestingScreenshot || !isConsentActive}
            className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-sky-600/25 flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
            title="Trigger remote snapshot of child's active screen"
          >
            <Camera className={`w-4 h-4 ${requestingScreenshot ? 'animate-spin' : ''}`} />
            <span>{requestingScreenshot ? 'Capturing...' : 'Request Screenshot'}</span>
          </button>
          <button
            onClick={() => setIsScreenshotGalleryOpen(true)}
            className="px-3 py-2 bg-[#162B24] hover:bg-[#1E3A31] text-[#B8F36B] border border-[#2C5142] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Open screenshot gallery modal"
          >
            <Layers className="w-4 h-4" />
            <span>Gallery</span>
          </button>
          <button
            onClick={onSwitchToChild}
            className="px-3.5 py-2 bg-[#162B24] hover:bg-[#1E3A31] text-[#B8F36B] border border-[#2C5142] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Child Phone UI</span>
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-2 bg-[#10201B] hover:bg-[#162B24] text-gray-400 hover:text-white border border-[#214235] rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* EMERGENCY SOS LIVE BROADCAST BANNER (When Active) */}
      {isSosEmergency && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-red-950 via-red-900 to-red-950 border-2 border-red-500 shadow-2xl shadow-red-900/60 animate-pulse text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600 border border-white/40 flex items-center justify-center text-white shadow-xl shrink-0">
              <AlertTriangle className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-white text-red-700 text-[10px] font-black tracking-widest uppercase">
                  🚨 ACTIVE EMERGENCY SOS
                </span>
                <span className="text-xs font-mono text-red-200">
                  Triggered {sosState?.started_at ? new Date(sosState.started_at).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
              <h2 className="text-lg font-black tracking-tight mt-0.5">
                {sosState?.message || 'Emergency Safety Panic Alert Active for Rahul'}
              </h2>
              <p className="text-xs text-red-200/90 font-medium">
                Live high-frequency GPS breadcrumbs, camera frames, and microphone recording broadcasting continuously.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => alert('Dialing Emergency Responders: 911 / 112')}
              className="px-4 py-2.5 bg-white text-red-700 hover:bg-red-50 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>CALL 911</span>
            </button>
            <button
              onClick={handleResolveSOS}
              disabled={resolvingSos}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg border border-emerald-400 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{resolvingSos ? 'RESOLVING...' : 'RESOLVE SOS'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SYSTEM ACTION TOAST MESSAGE */}
      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-[#162B24] border border-[#2C5142] text-xs text-[#E8FFF4] flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#B8F36B] shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-[#7C9B8A] hover:text-white text-xs font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* QUICK STATUS METRICS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Child Profile Status */}
        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#162B24] border border-[#2C5142] flex items-center justify-center text-[#B8F36B] font-bold text-base">
            👦
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[#7C9B8A] uppercase font-bold tracking-wider">
              Monitored Child
            </div>
            <div className="text-sm font-black text-white truncate">
              {child?.name || 'Rahul'} (Age {child?.age || 14})
            </div>
            <div className="text-[11px] text-[#62D8C2] truncate font-medium">
              Android 14 • Pixel 8
            </div>
          </div>
        </div>

        {/* Consent Status */}
        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
            isConsentActive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[#7C9B8A] uppercase font-bold tracking-wider">
              Consent State
            </div>
            <div className={`text-sm font-black ${isConsentActive ? 'text-[#B8F36B]' : 'text-red-400'}`}>
              {isConsentActive ? `Active (${daysRemaining}d left)` : 'Consent Revoked'}
            </div>
            <div className="text-[11px] text-[#7C9B8A] truncate">
              {isConsentActive ? '30-Day Expiry Bound' : 'Awaiting Child Action'}
            </div>
          </div>
        </div>

        {/* Real-Time Battery Status Widget Integration */}
        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#162B24] border border-[#2C5142] flex items-center justify-center text-emerald-400">
            <BatteryCharging className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] text-[#7C9B8A] uppercase font-bold tracking-wider">
              <span>Battery & Power</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">LIVE</span>
            </div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              <span>{device?.battery_level || 86}%</span>
              <span className="text-[10px] font-normal text-[#7C9B8A] font-mono">
                (~{Math.floor(((device?.battery_level || 86) * 10.2) / 60)}h remaining)
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 truncate flex items-center gap-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Health: Good • 28.4°C</span>
            </div>
          </div>
        </div>

        {/* Signal Strength & Network Quality Indicator */}
        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#162B24] border border-[#2C5142] flex items-center justify-center text-blue-400">
            <Signal className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] text-[#7C9B8A] uppercase font-bold tracking-wider">
              <span>Network Signal</span>
              <span className="text-[10px] text-blue-400 font-mono font-bold">5G+</span>
            </div>
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span>-62 dBm</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                Excellent
              </span>
            </div>
            <div className="text-[11px] text-[#7C9B8A] truncate">
              Home_5GHz_Mesh • 22ms latency
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#08110F] border border-[#214235] max-w-4xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('surveillance')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'surveillance'
              ? 'bg-[#B8F36B] text-[#08110F] shadow-md shadow-[#B8F36B]/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Surveillance & Map</span>
        </button>

        <button
          onClick={() => setActiveTab('geofences')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'geofences'
              ? 'bg-[#B8F36B] text-[#08110F] shadow-md shadow-[#B8F36B]/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Geofences & Safe Zones</span>
          {geofences.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeTab === 'geofences' ? 'bg-[#08110F] text-[#B8F36B]' : 'bg-[#162B24] text-emerald-400'
            }`}>
              {geofences.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'files'
              ? 'bg-[#B8F36B] text-[#08110F] shadow-md shadow-[#B8F36B]/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>Device Files</span>
        </button>

        <button
          onClick={() => setActiveTab('communications')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'communications'
              ? 'bg-[#B8F36B] text-[#08110F] shadow-md shadow-[#B8F36B]/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Activity & Apps</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'diagnostics'
              ? 'bg-[#B8F36B] text-[#08110F] shadow-md shadow-[#B8F36B]/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Device Diagnostics</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'requests'
              ? 'bg-[#B8F36B] text-[#08110F] shadow-md shadow-[#B8F36B]/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Request Logs ({requests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-[#B8F36B] text-[#08110F] shadow-md shadow-[#B8F36B]/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: SURVEILLANCE, LIVE FEEDS & INTERACTIVE MAP */}
      {activeTab === 'surveillance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLS: Live Video/Audio Stream Console & Interactive Map */}
          <div className="lg:col-span-2 space-y-5">
            {/* CONTINUOUS LIVE VIDEO & AUDIO STREAMING ENGINE */}
            <div className={`p-5 rounded-3xl border space-y-4 ${
              isSosEmergency
                ? 'bg-red-950/30 border-red-500/50 shadow-xl'
                : 'bg-[#10201B] border-[#214235]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl border ${
                    liveStream?.is_active || isSosEmergency
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                      : 'bg-[#162B24] text-[#7C9B8A] border-[#2C5142]'
                  }`}>
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                      Live Sensor Surveillance Feed
                      {(liveStream?.is_active || isSosEmergency) && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] tracking-widest uppercase animate-pulse">
                          LIVE STREAMING
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-[#7C9B8A]">
                      Direct encrypted uplink from child's device • Operates even when device screen is locked
                    </p>
                  </div>
                </div>

                {/* STREAM ACTION CONTROLS */}
                <div className="flex items-center gap-2">
                  {liveStream?.is_active ? (
                    <button
                      onClick={handleStopStream}
                      disabled={streamLoading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>STOP FEED</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartStream('LIVE_VIEW')}
                      disabled={streamLoading || !isConsentActive}
                      className="px-4 py-2.5 bg-[#B8F36B] hover:bg-[#A3E550] text-[#08110F] font-black text-xs rounded-xl shadow-lg shadow-[#B8F36B]/20 flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>START LIVE SURVEILLANCE</span>
                    </button>
                  )}
                </div>
              </div>

              {/* LIVE STREAM DISPLAY PLAYER (Screen Mirror + Camera feed + Audio equalizer) */}
              {liveStream?.is_active || isSosEmergency ? (
                <div className="space-y-4 pt-1">
                  {/* VIEW MODE TABS */}
                  <div className="flex items-center gap-1 bg-[#08110F] p-1 rounded-2xl border border-[#214235] w-fit">
                    <button
                      onClick={() => setSurveillanceTab('MATRIX')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        surveillanceTab === 'MATRIX'
                          ? 'bg-[#B8F36B] text-[#08110F]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" /> Combined Matrix
                    </button>
                    <button
                      onClick={() => setSurveillanceTab('SCREEN')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        surveillanceTab === 'SCREEN'
                          ? 'bg-blue-500 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" /> Screen Mirror
                    </button>
                    <button
                      onClick={() => setSurveillanceTab('CAMERA')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        surveillanceTab === 'CAMERA'
                          ? 'bg-emerald-500 text-black'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" /> Front Camera
                    </button>
                    <button
                      onClick={() => setSurveillanceTab('AUDIO')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        surveillanceTab === 'AUDIO'
                          ? 'bg-purple-500 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Audio Spectrum
                    </button>
                  </div>

                  {/* 1. MATRIX VIEW: Screen Mirroring + Camera + Audio */}
                  {surveillanceTab === 'MATRIX' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* LIVE SCREEN MIRROR CARD */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                          <span className="flex items-center gap-1.5 text-blue-400">
                            <Monitor className="w-4 h-4" /> Live Screen Stream
                          </span>
                          <span className="text-[10px] text-blue-300 font-mono">
                            App: {liveStream?.active_app || 'Home Screen'}
                          </span>
                        </div>

                        <div className="aspect-[9/16] max-h-72 rounded-2xl overflow-hidden bg-black border-2 border-blue-500/40 relative flex items-center justify-center shadow-2xl mx-auto">
                          {liveStream?.latest_screen_frame ? (
                            <img
                              src={liveStream.latest_screen_frame}
                              alt="Live Child Screen Stream"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-[#7C9B8A] p-4 text-center">
                              <Monitor className="w-8 h-8 animate-pulse text-blue-400" />
                              <span className="text-xs">Buffering live screen mirror frames...</span>
                            </div>
                          )}

                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-black/70 text-blue-400 text-[10px] font-bold border border-blue-500/30 flex items-center gap-1 backdrop-blur-sm">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                              SCREEN
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CAMERA FEED PLAYER */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <Video className="w-4 h-4" /> Front Camera
                          </span>
                          <span className="text-[10px] text-[#7C9B8A] font-mono">
                            {liveStream?.device_locked ? '🔒 Locked' : '📱 Unlocked'}
                          </span>
                        </div>

                        <div className="aspect-video max-h-72 rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/40 relative flex items-center justify-center shadow-2xl">
                          {liveStream?.latest_frame ? (
                            <img
                              src={liveStream.latest_frame}
                              alt="Live Child Camera Stream"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-[#7C9B8A]">
                              <Camera className="w-8 h-8 animate-spin text-[#B8F36B]" />
                              <span className="text-xs">Encrypted video frames...</span>
                            </div>
                          )}

                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-black/70 text-red-400 text-[10px] font-bold border border-red-500/30 flex items-center gap-1 backdrop-blur-sm">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              REC
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* AUDIO EQUALIZER */}
                      <div className="space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold text-gray-300 mb-2">
                            <span className="flex items-center gap-1.5 text-purple-400">
                              <Volume2 className="w-4 h-4" /> Audio Check
                            </span>
                            <span className="text-[10px] text-purple-300 font-mono font-bold">
                              {liveStream?.audio_level ? `${liveStream.audio_level} dBFS` : '46 dBFS'}
                            </span>
                          </div>

                          <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] space-y-3">
                            <div className="flex items-end gap-1 h-14 bg-[#10201B] p-2 rounded-xl border border-[#214235]">
                              {[32, 48, 62, 85, 50, 72, 92, 68, 42, 54, 78, 88].map((val, idx) => {
                                const currentLvl = liveStream?.audio_level || 42;
                                const barHeight = Math.min(100, Math.max(16, (currentLvl / 100) * val + (idx % 3) * 6));
                                return (
                                  <div
                                    key={idx}
                                    className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-sm"
                                    style={{ height: `${barHeight}%` }}
                                  />
                                );
                              })}
                            </div>
                            <div className="p-2 rounded-xl bg-[#162B24] border border-[#2C5142] text-[11px] text-[#7C9B8A] space-y-1">
                              <div className="flex justify-between">
                                <span>Hardware Mic:</span>
                                <span className="text-emerald-400 font-bold">Encrypted PCM</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Status Indicator:</span>
                                <span className="text-emerald-400 font-bold">Silent</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. DEDICATED SCREEN MIRRORING TAB */}
                  {surveillanceTab === 'SCREEN' && (
                    <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                      <div className="md:col-span-2 aspect-video max-h-[420px] rounded-2xl overflow-hidden bg-black border-2 border-blue-500/40 relative flex items-center justify-center shadow-2xl">
                        {liveStream?.latest_screen_frame ? (
                          <img
                            src={liveStream.latest_screen_frame}
                            alt="Live Child Screen Mirroring"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-[#7C9B8A] text-center p-6">
                            <Monitor className="w-12 h-12 animate-pulse text-blue-400" />
                            <p className="text-sm font-bold text-white">Live Screen Broadcast Active</p>
                            <p className="text-xs text-gray-400">
                              Receiving real-time display buffer from Rahul's phone...
                            </p>
                          </div>
                        )}

                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-black/80 text-blue-300 text-xs font-bold border border-blue-500/40 flex items-center gap-1.5 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                            LIVE SCREEN STREAM
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-black/80 text-white text-xs font-mono border border-white/10 backdrop-blur-md">
                            1080p @ 30 FPS
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-[#10201B] border border-[#214235] space-y-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
                            Foreground Application
                          </div>
                          <div className="text-lg font-black text-white font-mono">
                            {liveStream?.active_app || 'Home Launcher'}
                          </div>
                          <div className="text-xs text-[#7C9B8A]">
                            Transmitted securely through authorized 30-day parental consent pipeline.
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[#10201B] border border-[#214235] space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#7C9B8A]">Stream Protocol:</span>
                            <span className="text-white font-mono font-bold">WebRTC / TLS 1.3</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#7C9B8A]">Latency:</span>
                            <span className="text-emerald-400 font-mono font-bold">~140 ms</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#7C9B8A]">Child Privacy Chip:</span>
                            <span className="text-emerald-400 font-bold">Silent Mode Active</span>
                          </div>
                        </div>

                        {/* Snapshot Quick Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={handleTriggerRemoteScreenshot}
                            disabled={requestingScreenshot || !isConsentActive}
                            className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-md shadow-sky-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{requestingScreenshot ? 'Snapping...' : 'Snap Snapshot'}</span>
                          </button>
                          <button
                            onClick={() => setIsScreenshotGalleryOpen(true)}
                            className="py-2 px-3 rounded-xl bg-[#162B24] hover:bg-[#1E3A31] text-[#B8F36B] border border-[#2C5142] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Gallery</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. DEDICATED CAMERA TAB */}
                  {surveillanceTab === 'CAMERA' && (
                    <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] max-w-2xl mx-auto">
                      <div className="aspect-video rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/40 relative flex items-center justify-center shadow-2xl">
                        {liveStream?.latest_frame ? (
                          <img
                            src={liveStream.latest_frame}
                            alt="Live Child Camera Stream"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-[#7C9B8A]">
                            <Camera className="w-10 h-10 animate-spin text-[#B8F36B]" />
                            <span className="text-xs">Buffering continuous encrypted video frames...</span>
                          </div>
                        )}

                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-black/80 text-red-400 text-xs font-bold border border-red-500/40 flex items-center gap-1.5 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            CAMERA SURVEILLANCE
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. DEDICATED AUDIO SPECTRUM TAB */}
                  {surveillanceTab === 'AUDIO' && (
                    <div className="p-5 rounded-2xl bg-[#08110F] border border-[#214235] max-w-2xl mx-auto space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-purple-400" /> High-Fidelity Audio Uplink
                        </span>
                        <span className="text-xs font-mono font-bold text-purple-300">
                          {liveStream?.audio_level ? `${liveStream.audio_level} dBFS` : '46 dBFS'}
                        </span>
                      </div>

                      <div className="flex items-end gap-2 h-28 bg-[#10201B] p-3 rounded-2xl border border-[#214235]">
                        {[32, 48, 62, 85, 50, 72, 92, 68, 42, 54, 78, 88, 64, 48, 70, 82, 58].map((val, idx) => {
                          const currentLvl = liveStream?.audio_level || 42;
                          const barHeight = Math.min(100, Math.max(16, (currentLvl / 100) * val + (idx % 3) * 6));
                          return (
                            <div
                              key={idx}
                              className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-sm transition-all duration-150"
                              style={{ height: `${barHeight}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Standby Info Banner */
                <div className="p-3.5 rounded-2xl bg-[#08110F] border border-[#214235] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#B8F36B] shrink-0" />
                    <span>
                      Background streaming engine standing by. Click <strong className="text-white">START LIVE SURVEILLANCE</strong> to stream live camera and audio feed.
                    </span>
                  </div>
                  <span className="text-[10px] text-[#7C9B8A] uppercase font-bold tracking-wider hidden sm:block">
                    Standby Ready
                  </span>
                </div>
              )}
            </div>

            {/* OPENSTREETMAP TELEMETRY VIEW */}
            <div className="p-5 rounded-3xl bg-[#10201B] border border-[#214235] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-5 h-5 text-[#B8F36B]" />
                  <div>
                    <h3 className="text-sm font-black text-white">Live OpenStreetMap GPS Tracking</h3>
                    <p className="text-xs text-[#7C9B8A]">
                      Fused real-time coordinate engine with breadcrumbs trail
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('geofences')}
                    className="px-2.5 py-1.5 rounded-xl bg-[#162B24] hover:bg-[#214235] text-[#B8F36B] border border-[#2C5142] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Configure Zones ({geofences.length})</span>
                  </button>
                  <span className="text-xs text-[#7C9B8A]">
                    {location ? `Updated ${new Date(location.created_at).toLocaleTimeString()}` : 'Awaiting GPS'}
                  </span>
                </div>
              </div>

              <div className="h-[380px]">
                <InteractiveMap
                  location={location}
                  geofences={geofences}
                  childName={child?.name || 'Rahul'}
                  isSosMode={isSosEmergency}
                  routePoints={routeHistory}
                />
              </div>

              {location && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#214235]">
                  <div className="p-2.5 rounded-xl bg-[#08110F] border border-[#214235]">
                    <div className="text-[10px] text-[#7C9B8A] uppercase font-bold">Latitude</div>
                    <div className="text-xs font-mono font-bold text-white">{location.latitude.toFixed(6)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#08110F] border border-[#214235]">
                    <div className="text-[10px] text-[#7C9B8A] uppercase font-bold">Longitude</div>
                    <div className="text-xs font-mono font-bold text-white">{location.longitude.toFixed(6)}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#08110F] border border-[#214235]">
                    <div className="text-[10px] text-[#7C9B8A] uppercase font-bold">GPS Accuracy</div>
                    <div className="text-xs font-mono font-bold text-[#B8F36B]">±{Math.round(location.accuracy)} m</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#08110F] border border-[#214235]">
                    <div className="text-[10px] text-[#7C9B8A] uppercase font-bold">Data Link</div>
                    <div className="text-xs font-bold text-[#62D8C2]">
                      {isSosEmergency ? '🚨 SOS Stream' : 'Live Sync'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 1 COL: On-Demand Capability Triggers, Geofences, Notifications */}
          <div className="space-y-5">
            {/* ON-DEMAND CAPABILITY ACTIONS */}
            <div className="p-5 rounded-3xl bg-[#10201B] border border-[#214235] space-y-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Direct Capability Actions
                </h3>
                <p className="text-xs text-[#7C9B8A]">
                  Trigger instantaneous sensor captures on Rahul's device
                </p>
              </div>

              <div className="space-y-2.5">
                {/* 1. Request Real Location */}
                <button
                  onClick={() => handleRequestCapability('LOCATION')}
                  disabled={dispatchingCap !== null || !consent?.capabilities?.LOCATION}
                  className="w-full p-3 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 disabled:opacity-40 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Navigation className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white">Ping Fused Location</span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-mono">
                    {dispatchingCap === 'LOCATION' ? 'Pinging...' : 'GPS Lock'}
                  </span>
                </button>

                {/* 2. Request Camera Snapshot */}
                <button
                  onClick={() => handleRequestCapability('CAMERA')}
                  disabled={dispatchingCap !== null || !consent?.capabilities?.CAMERA}
                  className="w-full p-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 disabled:opacity-40 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Capture Photo Snapshot</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono">
                    {dispatchingCap === 'CAMERA' ? 'Capturing...' : 'Front Camera'}
                  </span>
                </button>

                {/* 3. Request Mic Ambient Recording */}
                <button
                  onClick={() => handleRequestCapability('MICROPHONE')}
                  disabled={dispatchingCap !== null || !consent?.capabilities?.MICROPHONE}
                  className="w-full p-3 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 disabled:opacity-40 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Mic className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Capture 30s Audio Check</span>
                  </div>
                  <span className="text-[10px] text-purple-300 font-mono">
                    {dispatchingCap === 'MICROPHONE' ? 'Recording...' : 'Raw PCM'}
                  </span>
                </button>

                {/* 4. Request Remote Screenshot */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTriggerRemoteScreenshot}
                    disabled={requestingScreenshot || !isConsentActive || (!consent?.capabilities?.SCREEN && !consent?.capabilities?.LIVE_VIEW)}
                    className="flex-1 p-3 rounded-2xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 disabled:opacity-40 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Camera className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold text-white">Request Remote Screenshot</span>
                    </div>
                    <span className="text-[10px] text-sky-300 font-mono">
                      {requestingScreenshot ? 'Capturing...' : 'Capture Now'}
                    </span>
                  </button>
                  <button
                    onClick={() => setIsScreenshotGalleryOpen(true)}
                    className="p-3 rounded-2xl bg-[#162B24] hover:bg-[#1E3A31] text-[#B8F36B] border border-[#2C5142] text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                    title="View captured screenshots gallery"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* SAFE ZONES & GEOFENCES */}
            <div className="p-5 rounded-3xl bg-[#10201B] border border-[#214235] space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#7C9B8A] uppercase tracking-wider">
                  Configured Safe Zones & Radar
                </h4>
                <button
                  onClick={() => setActiveTab('geofences')}
                  className="text-xs font-bold text-[#B8F36B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Manage All ({geofences.length}) →</span>
                </button>
              </div>

              <div className="space-y-2">
                {geofences.map((geo) => (
                  <div
                    key={geo.id}
                    onClick={() => setActiveTab('geofences')}
                    className="p-3 rounded-2xl bg-[#08110F] border border-[#214235] hover:border-[#B8F36B]/40 transition-all flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{geo.category === 'danger_zone' ? '⛔' : geo.category === 'school' ? '🏫' : '🏡'}</span>
                        <span>{geo.name}</span>
                      </div>
                      <div className="text-[10px] text-[#7C9B8A]">Radius: {geo.radius_meters}m • Trigger: {geo.alert_trigger || 'exit'}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      geo.category === 'danger_zone'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {geo.category === 'danger_zone' ? 'Restricted' : 'Safe Zone'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* SAFETY NOTIFICATIONS */}
            <div className="p-5 rounded-3xl bg-[#10201B] border border-[#214235] space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#7C9B8A] uppercase tracking-wider">
                  Safety Notifications
                </h4>
                <span className="text-[10px] text-[#7C9B8A]">{notifications.length} logged</span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-2xl border text-xs space-y-1 ${
                      notif.type === 'sos'
                        ? 'bg-red-950/30 border-red-900/50 text-red-200'
                        : notif.type === 'consent'
                        ? 'bg-[#162B24] border-[#2C5142] text-[#E8FFF4]'
                        : 'bg-[#08110F] border-[#214235] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className={notif.type === 'sos' ? 'text-red-400 font-black' : 'text-[#B8F36B]'}>
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-[#7C9B8A] font-normal">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7C9B8A] leading-relaxed">{notif.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: GEOFENCING & SAFE ZONES STUDIO */}
      {activeTab === 'geofences' && (
        <GeofenceManager
          childId={1}
          childName={child?.name || 'Rahul'}
          location={location}
          consent={consent}
          onGeofenceUpdated={loadData}
        />
      )}

      {/* TAB: DEVICE FILES & STORAGE EXPLORER */}
      {activeTab === 'files' && (
        <DeviceFilesExplorer
          childId={1}
          childName={child?.name || 'Rahul'}
          consent={consent}
          onRequestFetch={() => handleRequestCapability('FILES')}
          isDispatching={dispatchingCap === 'FILES'}
        />
      )}

      {/* TAB: ACTIVITY & APPS (COMMUNICATIONS, APPS, CALLS) */}
      {activeTab === 'communications' && (
        <CommunicationsManager
          childId={1}
          childName={child?.name || 'Rahul'}
          consent={consent}
          onDispatchCapability={(cap) => handleRequestCapability(cap)}
          dispatchingCap={dispatchingCap}
        />
      )}

      {/* TAB 2: DEVICE DIAGNOSTICS & TELEMETRY */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          {/* REAL-TIME BATTERY TELEMETRY WIDGET */}
          <BatteryStatusWidget childId={1} onRefresh={loadData} />

          {/* APP USAGE SUMMARY (RECHARTS BAR CHART) */}
          <AppUsageSummary childId={1} />

          {/* HARDWARE DIAGNOSTICS & STATUS */}
          <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] space-y-6">
            <div>
              <h3 className="text-base font-black text-white">Full Child Device Telemetry & Health</h3>
              <p className="text-xs text-[#7C9B8A]">
                Real-time hardware statistics, Android 14 security metrics, and background service execution health.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Battery & Power */}
            <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <BatteryCharging className="w-4 h-4 text-emerald-400" /> Battery Status
                </span>
                <span className="text-xs font-bold text-emerald-400">{device?.battery_level || 86}%</span>
              </div>
              <div className="w-full bg-[#162B24] h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${device?.battery_level || 86}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#7C9B8A]">
                <span>Health: Good</span>
                <span>Discharging: Normal (22h left)</span>
              </div>
            </div>

            {/* Network & Connectivity */}
            <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-blue-400" /> Network Telemetry
                </span>
                <span className="text-xs font-bold text-blue-400">5G Ultra</span>
              </div>
              <div className="space-y-1 text-xs text-[#7C9B8A]">
                <div className="flex justify-between">
                  <span>SSID:</span> <span className="text-white font-mono">Home_5GHz_Mesh</span>
                </div>
                <div className="flex justify-between">
                  <span>Signal:</span> <span className="text-white font-mono">-62 dBm (Excellent)</span>
                </div>
              </div>
            </div>

            {/* Memory & Storage */}
            <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400" /> Storage & Memory
                </span>
                <span className="text-xs font-bold text-purple-400">64.2 / 256 GB</span>
              </div>
              <div className="w-full bg-[#162B24] h-2 rounded-full overflow-hidden">
                <div className="bg-purple-400 h-full rounded-full" style={{ width: '25%' }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#7C9B8A]">
                <span>RAM Usage: 3.8 / 8.0 GB</span>
                <span>Storage Free: 191.8 GB</span>
              </div>
            </div>

            {/* Background Watchdog Service */}
            <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#B8F36B]" /> Background Watchdog PID
                </span>
                <span className="text-xs font-bold text-[#B8F36B]">PID #14882</span>
              </div>
              <div className="space-y-1 text-xs text-[#7C9B8A]">
                <div className="flex justify-between">
                  <span>Service Type:</span> <span className="text-white font-bold">Foreground High-Priority</span>
                </div>
                <div className="flex justify-between">
                  <span>Lock Screen Bypass:</span> <span className="text-emerald-400 font-bold">Enabled</span>
                </div>
              </div>
            </div>

            {/* Android Security Status */}
            <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" /> OS Security Status
                </span>
                <span className="text-xs font-bold text-cyan-400">Android 14</span>
              </div>
              <div className="space-y-1 text-xs text-[#7C9B8A]">
                <div className="flex justify-between">
                  <span>Security Patch:</span> <span className="text-white font-mono">2026-08-01</span>
                </div>
                <div className="flex justify-between">
                  <span>Play Protect:</span> <span className="text-emerald-400 font-bold">Verified Clean</span>
                </div>
              </div>
            </div>

            {/* Heartbeat & Sync Status */}
            <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> Synchronization
                </span>
                <span className="text-xs font-bold text-amber-400">Realtime Polling</span>
              </div>
              <div className="space-y-1 text-xs text-[#7C9B8A]">
                <div className="flex justify-between">
                  <span>Last Ping:</span> <span className="text-white">{device?.last_seen ? new Date(device.last_seen).toLocaleTimeString() : 'Just now'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Latency:</span> <span className="text-white font-mono">18ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* TAB 3: CAPABILITY REQUESTS LIFECYCLE */}
      {activeTab === 'requests' && (
        <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">Capability Request State Machine</h3>
              <p className="text-xs text-[#7C9B8A]">
                Tracks ephemeral parent-initiated requests and their execution status on the child device.
              </p>
            </div>
            <button
              onClick={loadData}
              className="p-2 bg-[#162B24] hover:bg-[#1E3A31] border border-[#2C5142] rounded-lg text-[#B8F36B] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#214235] text-[#7C9B8A] uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-3">Req ID</th>
                  <th className="py-2.5 px-3">Capability</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Created At</th>
                  <th className="py-2.5 px-3">Expires At</th>
                  <th className="py-2.5 px-3">Fulfilled At</th>
                  <th className="py-2.5 px-3">Result / Telemetry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A332B] font-mono">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[#7C9B8A] font-sans">
                      No capability requests dispatched yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-[#162B24]/40">
                      <td className="py-3 px-3 font-bold text-white">#{r.id}</td>
                      <td className="py-3 px-3 font-bold text-[#62D8C2] font-sans">{r.capability}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'fulfilled'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : r.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#7C9B8A]">
                        {new Date(r.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 text-[#7C9B8A]">
                        {new Date(r.expires_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3 text-[#7C9B8A]">
                        {r.fulfilled_at ? new Date(r.fulfilled_at).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-3 px-3 text-[#E8FFF4] font-sans text-[11px]">
                        {r.result_data ? (
                          <span>
                            {r.capability === 'LOCATION'
                              ? `GPS: (${r.result_data.latitude?.toFixed(4)}, ${r.result_data.longitude?.toFixed(4)})`
                              : JSON.stringify(r.result_data)}
                          </span>
                        ) : r.failure_reason ? (
                          <span className="text-red-400">{r.failure_reason}</span>
                        ) : (
                          'Awaiting response'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY AUDIT LOG */}
      {activeTab === 'audit' && (
        <AuditLogs
          childId={1}
          childName={child?.name || 'Rahul'}
          onRefreshParentData={loadData}
        />
      )}

      {/* REMOTE SCREENSHOT GALLERY MODAL */}
      <RemoteScreenshotGalleryModal
        isOpen={isScreenshotGalleryOpen}
        onClose={() => setIsScreenshotGalleryOpen(false)}
        childId={1}
        childName={child?.name || 'Rahul'}
        onScreenshotCaptured={loadData}
      />
    </div>
  );
};

export default ParentDashboard;
