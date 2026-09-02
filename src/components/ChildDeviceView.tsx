import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  MapPin,
  AlertTriangle,
  Radio,
  Camera,
  Mic,
  Lock,
  Unlock,
  Smartphone,
  Battery,
  BatteryCharging,
  Wifi,
  Signal,
  Zap,
  RefreshCw,
  Send,
  Navigation,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  PowerOff,
  Moon,
  Clock,
  Monitor,
  Calculator,
  PlaySquare,
  BookOpen,
  Globe,
  Settings as SettingsIcon,
  ChevronLeft,
  Circle,
  Square,
  CheckSquare,
  Plus
} from 'lucide-react';
import { Consent, Device, CapabilityRequest, CapabilityType, LiveStreamSession, SOSState } from '../types';

/* =========================================================================
   DEVELOPER MODULAR FEATURE: BACKGROUND LOCKED-SCREEN LIVE FEED ENGINE
   To remove this background streaming feature completely from the application,
   simply DELETE or comment out the single `<HeadlessBackgroundStreamModule />`
   JSX line in the render body below (or delete HeadlessBackgroundStreamModule.tsx).
   ========================================================================= */
import { HeadlessBackgroundStreamModule } from './HeadlessBackgroundStreamModule';

interface ChildDeviceViewProps {
  onSwitchToParent?: () => void;  // Optional when device is locked to child role
}

type SimulatedApp = 'launcher' | 'math' | 'youtube' | 'notes' | 'browser' | 'consent_settings';

export const ChildDeviceView: React.FC<ChildDeviceViewProps> = ({ onSwitchToParent }) => {
  const deviceUuid = 'd3f9a721-6c2e-4e89-9a1b-3c7d2e4f5a6b';
  const pairingToken = 'gx_pair_8f4a2c9e1b7d3a5f';

  const [consent, setConsent] = useState<Consent | null>(null);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [statusText, setStatusText] = useState('Background Services Active');

  // Device Lock State Simulation (Unlocked, Locked / Screen Off, Background)
  const [deviceLockState, setDeviceLockState] = useState<'UNLOCKED' | 'LOCKED' | 'BACKGROUND'>('UNLOCKED');

  // Active foreground app on child's simulated phone
  const [activeApp, setActiveApp] = useState<SimulatedApp>('launcher');
  const [mathScore, setMathScore] = useState(120);
  const [mathQuestionIdx, setMathQuestionIdx] = useState(0);
  const [notesList, setNotesList] = useState([
    { id: 1, text: 'Complete Physics Chapter 4 exercises', done: true },
    { id: 2, text: 'Prepare presentation on Solar System', done: false },
    { id: 3, text: 'Return library books by Friday', done: false },
  ]);
  const [newNoteText, setNewNoteText] = useState('');

  // Generated Screen Canvas Data URL for Live Screen Mirroring
  const [screenFrameDataUrl, setScreenFrameDataUrl] = useState<string>('');

  // Capability Configuration toggles (Child decides which capabilities to grant)
  const [capToggles, setCapToggles] = useState<{ [key in CapabilityType]: boolean }>({
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
  });

  // Active hardware indicator states
  const [hardwareIndicators, setHardwareIndicators] = useState<{ camera: boolean; mic: boolean }>({
    camera: false,
    mic: false,
  });

  const [activeSession, setActiveSession] = useState<{
    type: CapabilityType | null;
    startedAt: string | null;
  }>({ type: null, startedAt: null });

  const [simulatedLat, setSimulatedLat] = useState(28.6139);
  const [simulatedLng, setSimulatedLng] = useState(77.2090);
  const [locationLog, setLocationLog] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showNetworkDetails, setShowNetworkDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const sosIntervalRef = useRef<any>(null);
  const screenCaptureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll device status, incoming capability requests, live stream sessions, and SOS state
  const fetchStatus = async () => {
    try {
      // 1. Consent Status
      const consentRes = await fetch(
        `/api/consent/device/status?device_uuid=${deviceUuid}&pairing_token=${pairingToken}`
      );
      if (consentRes.ok) {
        const data: Consent | null = await consentRes.json();
        setConsent(data);
        if (data && data.capabilities) {
          setCapToggles({
            LOCATION: Boolean(data.capabilities.LOCATION),
            CAMERA: Boolean(data.capabilities.CAMERA),
            MICROPHONE: Boolean(data.capabilities.MICROPHONE),
            LIVE_VIEW: Boolean(data.capabilities.LIVE_VIEW),
            SCREEN: data.capabilities.SCREEN !== false,
            DEVICE_STATUS: Boolean(data.capabilities.DEVICE_STATUS),
            APP_LIST: data.capabilities.APP_LIST !== false,
            CALL_LOGS: data.capabilities.CALL_LOGS !== false,
            CHAT_METADATA: data.capabilities.CHAT_METADATA !== false,
            FILES: data.capabilities.FILES !== false,
          });
        }
      }

      // 2. Poll for SOS emergency state
      const sosRes = await fetch('/api/sos/state/1');
      if (sosRes.ok) {
        const sosState: SOSState = await sosRes.json();
        if (sosState && sosState.is_active) {
          setSosActive(true);
        } else if (!sosState || !sosState.is_active) {
          setSosActive(false);
        }
      }

      // 3. Poll for live stream session from Parent
      const streamRes = await fetch('/api/stream/session/1');
      if (streamRes.ok) {
        const streamData: LiveStreamSession = await streamRes.json();
        if (streamData && streamData.is_active) {
          setActiveSession({
            type: streamData.mode || 'LIVE_VIEW',
            startedAt: streamData.started_at || new Date().toISOString(),
          });
          if (streamData.mode === 'CAMERA' || streamData.mode === 'LIVE_VIEW') {
            setHardwareIndicators({ camera: true, mic: true });
          }
        } else if (!sosActive) {
          setActiveSession({ type: null, startedAt: null });
        }
      }

      // 4. Poll for pending on-demand requests from Parent
      const reqRes = await fetch(`/api/requests/pending/${deviceUuid}`);
      if (reqRes.ok) {
        const pendingReq: CapabilityRequest | null = await reqRes.json();
        if (pendingReq && pendingReq.status === 'pending') {
          handleIncomingRequest(pendingReq);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [simulatedLat, simulatedLng, consent, sosActive]);

  // Generate dynamic screen frame snapshot for live screen mirroring
  useEffect(() => {
    const renderScreenFrame = () => {
      try {
        const canvas = screenCaptureCanvasRef.current || document.createElement('canvas');
        canvas.width = 360;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Background wallpaper
        if (deviceLockState === 'LOCKED') {
          ctx.fillStyle = '#080808';
          ctx.fillRect(0, 0, 360, 640);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 180, 220);
          ctx.font = '14px sans-serif';
          ctx.fillStyle = '#9CA3AF';
          ctx.fillText(currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }), 180, 260);
          ctx.fillStyle = '#10B981';
          ctx.fillText('🔒 Device Screen Locked', 180, 340);
        } else if (activeApp === 'launcher') {
          ctx.fillStyle = '#0a1914';
          ctx.fillRect(0, 0, 360, 640);
          // Header
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 28px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 180, 100);
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#B8F36B';
          ctx.fillText('☀️ 28°C New Delhi • Clear Sky', 180, 130);

          // App Grid
          const apps = [
            { name: 'Math Quiz', color: '#3B82F6', icon: '📐' },
            { name: 'YouTube Learn', color: '#EF4444', icon: '▶️' },
            { name: 'Notes Pad', color: '#10B981', icon: '📝' },
            { name: 'Web Browser', color: '#F59E0B', icon: '🌐' },
          ];
          apps.forEach((a, i) => {
            const x = 70 + (i % 2) * 140;
            const y = 200 + Math.floor(i / 2) * 110;
            ctx.fillStyle = a.color;
            ctx.beginPath();
            ctx.roundRect(x - 30, y - 30, 60, 60, 14);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(a.icon, x, y + 8);
            ctx.font = '11px sans-serif';
            ctx.fillStyle = '#E5E7EB';
            ctx.fillText(a.name, x, y + 48);
          });
        } else if (activeApp === 'math') {
          ctx.fillStyle = '#0D1B2A';
          ctx.fillRect(0, 0, 360, 640);
          ctx.fillStyle = '#3B82F6';
          ctx.fillRect(0, 0, 360, 60);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('📐 Classroom Math Quest', 20, 38);
          ctx.textAlign = 'right';
          ctx.fillText(`Score: ${mathScore}`, 340, 38);

          ctx.textAlign = 'center';
          ctx.fillStyle = '#E2E8F0';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText('Solve: 14 × 8 + 24 = ?', 180, 160);

          ctx.fillStyle = '#1E293B';
          ctx.fillRect(40, 220, 280, 48);
          ctx.fillStyle = '#10B981';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('A) 136  (Correct)', 180, 250);

          ctx.fillStyle = '#1E293B';
          ctx.fillRect(40, 280, 280, 48);
          ctx.fillStyle = '#94A3B8';
          ctx.fillText('B) 142', 180, 310);
        } else if (activeApp === 'youtube') {
          ctx.fillStyle = '#18181B';
          ctx.fillRect(0, 0, 360, 640);
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(0, 0, 360, 50);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('▶️ YouTube Learning', 20, 32);

          // Video frame
          ctx.fillStyle = '#000000';
          ctx.fillRect(20, 70, 320, 180);
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(180, 160, 25, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText('▶', 183, 166);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('Solar System 3D Documentary (HD)', 20, 280);
          ctx.fillStyle = '#9CA3AF';
          ctx.font = '12px sans-serif';
          ctx.fillText('NASA Kids Space • 1.4M views', 20, 305);
        } else if (activeApp === 'notes') {
          ctx.fillStyle = '#064E3B';
          ctx.fillRect(0, 0, 360, 640);
          ctx.fillStyle = '#047857';
          ctx.fillRect(0, 0, 360, 50);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('📝 Homework Notes', 20, 32);

          notesList.forEach((n, idx) => {
            const y = 80 + idx * 55;
            ctx.fillStyle = '#065F46';
            ctx.fillRect(15, y, 330, 45);
            ctx.fillStyle = n.done ? '#34D399' : '#FFFFFF';
            ctx.font = '12px sans-serif';
            ctx.fillText(`${n.done ? '☑️' : '◻️'} ${n.text}`, 25, y + 27);
          });
        } else if (activeApp === 'browser') {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, 360, 640);
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(0, 0, 360, 50);
          ctx.fillStyle = '#38BDF8';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('🔒 https://kids.nationalgeographic.com', 20, 32);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('Deep Sea Exploration', 20, 90);
          ctx.fillStyle = '#94A3B8';
          ctx.font = '12px sans-serif';
          ctx.fillText('How deep sea creatures survive in the abyss...', 20, 120);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setScreenFrameDataUrl(dataUrl);
      } catch (err) {
        console.warn('Screen frame generator notice:', err);
      }
    };

    renderScreenFrame();
    const frameTimer = setInterval(renderScreenFrame, 1200);
    return () => clearInterval(frameTimer);
  }, [activeApp, deviceLockState, mathScore, mathQuestionIdx, notesList, currentTime]);

  // Execute on-demand capability requests from parent
  const handleIncomingRequest = async (req: CapabilityRequest) => {
    if (!consent || !consent.is_active || !consent.capabilities[req.capability]) {
      return;
    }

    setActiveSession({ type: req.capability, startedAt: new Date().toISOString() });
    if (req.capability === 'CAMERA') setHardwareIndicators((prev) => ({ ...prev, camera: true }));
    if (req.capability === 'MICROPHONE') setHardwareIndicators((prev) => ({ ...prev, mic: true }));

    setTimeout(async () => {
      let resultData: any = {};

      if (req.capability === 'LOCATION') {
        resultData = await new Promise((resolve, reject) => {
          if (typeof navigator === 'undefined' || !navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser.'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const {
                latitude,
                longitude,
                accuracy,
                altitude,
                heading,
                speed,
              } = position.coords;

              // Keep the child-device telemetry display synchronized
              // with the actual Android/browser location.
              setSimulatedLat(latitude);
              setSimulatedLng(longitude);

              resolve({
                latitude,
                longitude,
                accuracy,
                altitude,
                heading,
                speed,
                provider: 'browser_geolocation',
                lock_state: deviceLockState,
                captured_at: new Date().toISOString(),
              });
            },
            (error) => {
              const reasonByCode: Record<number, string> = {
                1: 'Location permission was denied.',
                2: 'Location is currently unavailable.',
                3: 'Location request timed out.',
              };

              reject(
                new Error(
                  `${reasonByCode[error.code] || error.message} (Geolocation code ${error.code})`
                )
              );
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 5000,
            }
          );
        });
      } else if (req.capability === 'CAMERA') {
        resultData = {
          sensor: 'CameraX_Front_Sensor',
          resolution: '1920x1080',
          captured_at: new Date().toISOString(),
          lock_state: deviceLockState,
          privacy_chip_active: true,
        };
      } else if (req.capability === 'MICROPHONE') {
        resultData = {
          audio_level_db: 48,
          sample_rate: '44100Hz',
          lock_state: deviceLockState,
          privacy_chip_active: true,
        };
      } else if (req.capability === 'SCREEN') {
        resultData = {
          screen_frame: screenFrameDataUrl,
          active_app: activeApp,
          captured_at: new Date().toISOString(),
          lock_state: deviceLockState,
          resolution: '360x640',
        };
      } else if (req.capability === 'APP_LIST') {
        resultData = {
          captured_at: new Date().toISOString(),
          lock_state: deviceLockState,
          apps: [
            {
              id: 'app-1',
              name: 'Google Classroom',
              package_name: 'com.google.android.apps.classroom',
              category: 'Education',
              version: '8.4.102',
              installed_at: '2026-01-15T09:30:00.000Z',
              last_used_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
              usage_today_minutes: 42,
              size_mb: 48.6,
              permissions: ['STORAGE', 'NOTIFICATIONS', 'CAMERA'],
              status: 'allowed',
            },
            {
              id: 'app-2',
              name: 'Duolingo: Language Lessons',
              package_name: 'com.duolingo',
              category: 'Education',
              version: '5.142.3',
              installed_at: '2026-02-10T14:20:00.000Z',
              last_used_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
              usage_today_minutes: 25,
              size_mb: 62.4,
              permissions: ['MICROPHONE', 'NOTIFICATIONS'],
              status: 'allowed',
            },
            {
              id: 'app-3',
              name: 'Khan Academy',
              package_name: 'org.khanacademy.android',
              category: 'Education',
              version: '7.3.0',
              installed_at: '2026-01-20T11:00:00.000Z',
              last_used_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
              usage_today_minutes: 35,
              size_mb: 34.2,
              permissions: ['STORAGE'],
              status: 'allowed',
            },
            {
              id: 'app-4',
              name: 'WhatsApp Messenger',
              package_name: 'com.whatsapp',
              category: 'Social',
              version: '2.26.4.12',
              installed_at: '2026-01-10T16:00:00.000Z',
              last_used_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              usage_today_minutes: 18,
              size_mb: 95.8,
              permissions: ['CONTACTS', 'CAMERA', 'MICROPHONE', 'NOTIFICATIONS', 'STORAGE'],
              status: 'monitored',
            },
            {
              id: 'app-5',
              name: 'Minecraft Pocket Edition',
              package_name: 'com.mojang.minecraftpe',
              category: 'Games',
              version: '1.21.10',
              installed_at: '2026-03-01T18:45:00.000Z',
              last_used_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
              usage_today_minutes: 50,
              size_mb: 580.0,
              permissions: ['STORAGE', 'NETWORK'],
              status: 'monitored',
            },
            {
              id: 'app-6',
              name: 'YouTube Kids',
              package_name: 'com.google.android.apps.youtube.kids',
              category: 'Entertainment',
              version: '9.08.2',
              installed_at: '2026-01-12T10:15:00.000Z',
              last_used_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
              usage_today_minutes: 30,
              size_mb: 72.1,
              permissions: ['NOTIFICATIONS', 'NETWORK'],
              status: 'allowed',
            },
            {
              id: 'app-7',
              name: 'Discord',
              package_name: 'com.discord',
              category: 'Social',
              version: '215.14',
              installed_at: '2026-02-18T19:00:00.000Z',
              last_used_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
              usage_today_minutes: 12,
              size_mb: 110.5,
              permissions: ['MICROPHONE', 'NOTIFICATIONS', 'CAMERA'],
              status: 'monitored',
            },
            {
              id: 'app-8',
              name: 'Roblox',
              package_name: 'com.roblox.client',
              category: 'Games',
              version: '2.620.518',
              installed_at: '2026-03-05T12:30:00.000Z',
              last_used_at: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
              usage_today_minutes: 0,
              size_mb: 195.0,
              permissions: ['STORAGE', 'NETWORK'],
              status: 'restricted',
            },
            {
              id: 'app-9',
              name: 'Spotify Kids',
              package_name: 'com.spotify.kids',
              category: 'Entertainment',
              version: '2.14.0',
              installed_at: '2026-01-25T14:10:00.000Z',
              last_used_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
              usage_today_minutes: 45,
              size_mb: 88.0,
              permissions: ['STORAGE', 'NOTIFICATIONS'],
              status: 'allowed',
            },
          ],
        };
      } else if (req.capability === 'CALL_LOGS') {
        resultData = {
          captured_at: new Date().toISOString(),
          lock_state: deviceLockState,
          call_logs: [
            {
              id: 'call-1',
              contact_name: 'Mom (Sarah)',
              phone_masked: '+1 (555) •••-4821',
              type: 'incoming',
              duration_seconds: 245,
              timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
              source: 'SIM_1',
            },
            {
              id: 'call-2',
              contact_name: 'Dad (David)',
              phone_masked: '+1 (555) •••-9104',
              type: 'outgoing',
              duration_seconds: 118,
              timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
              source: 'SIM_1',
            },
            {
              id: 'call-3',
              contact_name: 'St. Mary School Admin',
              phone_masked: '+1 (555) •••-0199',
              type: 'missed',
              duration_seconds: 0,
              timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
              source: 'SIM_1',
            },
            {
              id: 'call-4',
              contact_name: 'Grandma Elena',
              phone_masked: '+1 (555) •••-3372',
              type: 'incoming',
              duration_seconds: 480,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
              source: 'SIM_1',
            },
            {
              id: 'call-5',
              contact_name: 'Study Partner (Aryan)',
              phone_masked: '+1 (555) •••-8829',
              type: 'outgoing',
              duration_seconds: 94,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
              source: 'VoIP',
            },
          ],
        };
      } else if (req.capability === 'CHAT_METADATA') {
        resultData = {
          captured_at: new Date().toISOString(),
          lock_state: deviceLockState,
          chat_threads: [
            {
              id: 'chat-1',
              platform: 'WhatsApp',
              thread_type: 'group',
              contact_or_group_name: 'Grade 7 Science Project',
              message_count_24h: 38,
              last_active_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
              direction: 'bidirectional',
              unread_count: 0,
            },
            {
              id: 'chat-2',
              platform: 'WhatsApp',
              thread_type: 'direct',
              contact_or_group_name: 'Mom (Sarah)',
              message_count_24h: 14,
              last_active_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
              direction: 'bidirectional',
              unread_count: 0,
            },
            {
              id: 'chat-3',
              platform: 'SMS',
              thread_type: 'direct',
              contact_or_group_name: 'Dad (David)',
              message_count_24h: 6,
              last_active_at: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
              direction: 'bidirectional',
              unread_count: 0,
            },
            {
              id: 'chat-4',
              platform: 'Discord',
              thread_type: 'group',
              contact_or_group_name: 'Junior Robotics Club #general',
              message_count_24h: 22,
              last_active_at: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
              direction: 'incoming',
              unread_count: 3,
            },
            {
              id: 'chat-5',
              platform: 'Telegram',
              thread_type: 'direct',
              contact_or_group_name: 'Math Tutor Mr. Sharma',
              message_count_24h: 4,
              last_active_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
              direction: 'bidirectional',
              unread_count: 0,
            },
            {
              id: 'chat-6',
              platform: 'Google Messages',
              thread_type: 'direct',
              contact_or_group_name: 'Grandma Elena',
              message_count_24h: 2,
              last_active_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
              direction: 'incoming',
              unread_count: 0,
            },
          ],
        };
      } else if (req.capability === 'FILES') {
        resultData = {
          captured_at: new Date().toISOString(),
          lock_state: deviceLockState,
          files: [
            {
              id: 'file-doc-1',
              name: 'Science_Project_SolarSystem_Final.pdf',
              path: '/storage/emulated/0/Documents/School/Science_Project_SolarSystem_Final.pdf',
              folder: 'School',
              size_bytes: 3450000,
              size_formatted: '3.45 MB',
              mime_type: 'application/pdf',
              last_modified: '2026-03-22T15:30:00.000Z',
              content_preview: 'Comprehensive study of celestial gravitational dynamics and planetary orbits for Grade 7 Science Exhibition.',
              is_flagged_sensitive: false,
            },
            {
              id: 'file-doc-2',
              name: 'Math_Homework_Algebra_Ch4.docx',
              path: '/storage/emulated/0/Documents/Homework/Math_Homework_Algebra_Ch4.docx',
              folder: 'Documents',
              size_bytes: 842000,
              size_formatted: '842 KB',
              mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              last_modified: '2026-03-24T18:15:00.000Z',
              content_preview: 'Quadratic equations and algebraic factorization exercise sets 4.1 to 4.5. All steps verified.',
              is_flagged_sensitive: false,
            },
            {
              id: 'file-doc-3',
              name: 'Physics_Formula_Cheatsheet.txt',
              path: '/storage/emulated/0/Documents/Physics_Formula_Cheatsheet.txt',
              folder: 'Documents',
              size_bytes: 14200,
              size_formatted: '14.2 KB',
              mime_type: 'text/plain',
              last_modified: '2026-03-23T11:20:00.000Z',
              content_preview: 'Kinematics: v = u + at | s = ut + 0.5at^2 | v^2 = u^2 + 2as. Force: F = ma. Work: W = Fd.',
              is_flagged_sensitive: false,
            },
            {
              id: 'file-dl-1',
              name: 'scratch_coding_blocks_starter.zip',
              path: '/storage/emulated/0/Download/scratch_coding_blocks_starter.zip',
              folder: 'Downloads',
              size_bytes: 12400000,
              size_formatted: '12.4 MB',
              mime_type: 'application/zip',
              last_modified: '2026-03-20T16:40:00.000Z',
              content_preview: 'MIT Scratch block project template for robotics obstacle avoidance simulation.',
              is_flagged_sensitive: false,
            },
            {
              id: 'file-dl-2',
              name: 'School_Timetable_Term2_2026.pdf',
              path: '/storage/emulated/0/Download/School_Timetable_Term2_2026.pdf',
              folder: 'Downloads',
              size_bytes: 1150000,
              size_formatted: '1.15 MB',
              mime_type: 'application/pdf',
              last_modified: '2026-03-18T08:00:00.000Z',
              content_preview: 'Official Spring/Summer academic schedule: Period 1 Math (8:30am), Period 2 Science (9:30am).',
              is_flagged_sensitive: false,
            },
            {
              id: 'file-img-1',
              name: 'Whiteboard_Physics_Formulas_Class.jpg',
              path: '/storage/emulated/0/DCIM/Camera/Whiteboard_Physics_Formulas_Class.jpg',
              folder: 'Images',
              size_bytes: 4200000,
              size_formatted: '4.20 MB',
              mime_type: 'image/jpeg',
              last_modified: '2026-03-24T14:10:00.000Z',
              content_preview: 'Photo of classroom whiteboard containing physics electromagnetism notes and circuit diagrams.',
              is_flagged_sensitive: false,
            },
            {
              id: 'file-img-2',
              name: 'Robotics_Robot_Chassis_Build.png',
              path: '/storage/emulated/0/Pictures/Robotics_Robot_Chassis_Build.png',
              folder: 'Images',
              size_bytes: 2800000,
              size_formatted: '2.80 MB',
              mime_type: 'image/png',
              last_modified: '2026-03-21T17:45:00.000Z',
              content_preview: 'CAD wireframe and physical prototype photo of Arduino line-following chassis.',
              is_flagged_sensitive: false,
            },
            {
              id: 'file-aud-1',
              name: 'Spanish_Oral_Practice_Recording.m4a',
              path: '/storage/emulated/0/Recordings/Spanish_Oral_Practice_Recording.m4a',
              folder: 'Audio',
              size_bytes: 5600000,
              size_formatted: '5.60 MB',
              mime_type: 'audio/mp4',
              last_modified: '2026-03-23T19:30:00.000Z',
              content_preview: 'Audio recording: 4 min 12 sec Spanish conversational pronunciation test practice.',
              is_flagged_sensitive: false,
            },
            {
              id: 'file-aud-2',
              name: 'Piano_Practice_Sonata_Take3.mp3',
              path: '/storage/emulated/0/Music/Piano_Practice_Sonata_Take3.mp3',
              folder: 'Audio',
              size_bytes: 7800000,
              size_formatted: '7.80 MB',
              mime_type: 'audio/mpeg',
              last_modified: '2026-03-22T20:10:00.000Z',
              content_preview: 'Audio recording: Beethoven Sonata in C Minor piano rehearsal practice.',
              is_flagged_sensitive: false,
            },
            {
              id: 'file-vid-1',
              name: 'Robotics_Club_Robot_Test_Run.mp4',
              path: '/storage/emulated/0/Movies/Robotics_Club_Robot_Test_Run.mp4',
              folder: 'Videos',
              size_bytes: 24500000,
              size_formatted: '24.5 MB',
              mime_type: 'video/mp4',
              last_modified: '2026-03-21T18:30:00.000Z',
              content_preview: 'Video clip: 45-second high speed maze run by the junior robotics competition buggy.',
              is_flagged_sensitive: false,
            },
          ],
        };
      }

      try {
        await fetch(`/api/requests/${req.id}/fulfill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result_data: resultData }),
        });

        const timeStr = new Date().toLocaleTimeString();
        setLocationLog((prev) => [
          `[${timeStr}] Background ${req.capability} served (${deviceLockState})`,
          ...prev.slice(0, 5),
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setTimeout(() => {
          if (!sosActive) {
            setActiveSession({ type: null, startedAt: null });
            setHardwareIndicators({ camera: false, mic: false });
          }
        }, 3000);
      }
    }, 1000);
  };

  // Child Grants / Renews 30-Day Consent
  const handleGrantConsent = async () => {
    try {
      setGranting(true);
      const res = await fetch('/api/consent/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_uuid: deviceUuid,
          capabilities: capToggles,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConsent(data);
        setStatusText('30-Day Consent Active');
        setShowConfig(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGranting(false);
    }
  };

  // Child Revokes Consent (Immediate Master Shutdown)
  const handleRevokeConsent = async () => {
    if (!confirm('Are you sure you want to REVOKE parental consent? All location, camera, and microphone sharing will stop immediately.')) return;

    try {
      setRevoking(true);
      const res = await fetch('/api/consent/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_uuid: deviceUuid }),
      });

      if (res.ok) {
        setConsent(null);
        setActiveSession({ type: null, startedAt: null });
        setHardwareIndicators({ camera: false, mic: false });
        setStatusText('Consent Revoked');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRevoking(false);
    }
  };

  // Child SOS Panic Button Trigger
  const handleChildSOS = async () => {
    try {
      setSosActive(true);
      await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: 1,
          message: '🚨 Emergency SOS panic triggered! Continuous live location, camera, and audio broadcasting.',
          latitude: simulatedLat,
          longitude: simulatedLng,
          triggered_by: 'child',
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const isConsentActive =
    consent && consent.is_active && new Date(consent.expires_at) > new Date();

  const isCameraActive =
    hardwareIndicators.camera || activeSession.type === 'CAMERA' || activeSession.type === 'LIVE_VIEW' || sosActive;
  const isMicActive =
    hardwareIndicators.mic || activeSession.type === 'MICROPHONE' || activeSession.type === 'LIVE_VIEW' || sosActive;

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* PHONE CASING HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-[#214235]">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-[#62D8C2]" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Rahul's Android Phone
          </span>
        </div>
        <button
          onClick={onSwitchToParent}
          className="text-xs text-[#B8F36B] hover:underline font-semibold cursor-pointer"
        >
          Parent Portal →
        </button>
      </div>

      {/* DEVICE STATE SIMULATOR BAR (Test lock / screen off state) */}
      <div className="p-2.5 rounded-2xl bg-[#08110F] border border-[#214235] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[#7C9B8A] font-semibold text-[11px]">
          <span>Device State:</span>
        </div>
        <div className="flex items-center gap-1 bg-[#10201B] p-0.5 rounded-xl border border-[#214235]">
          <button
            onClick={() => setDeviceLockState('UNLOCKED')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              deviceLockState === 'UNLOCKED'
                ? 'bg-[#B8F36B] text-[#08110F]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Unlock className="w-3 h-3" /> Unlocked
          </button>
          <button
            onClick={() => setDeviceLockState('BACKGROUND')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              deviceLockState === 'BACKGROUND'
                ? 'bg-amber-400 text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Moon className="w-3 h-3" /> Other App
          </button>
          <button
            onClick={() => setDeviceLockState('LOCKED')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              deviceLockState === 'LOCKED'
                ? 'bg-red-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-3 h-3" /> Locked
          </button>
        </div>
      </div>

      {/* ANDROID DEVICE HARDWARE SHELL */}
      <div className="rounded-3xl bg-[#10201B] border-2 border-[#214235] overflow-hidden shadow-2xl relative">
        {/* =========================================================================
            DEVELOPER MODULAR FEATURE: BACKGROUND LOCKED-SCREEN LIVE FEED ENGINE
            To remove this background streaming feature completely, simply DELETE
            or comment out the single <HeadlessBackgroundStreamModule /> line below.
            ========================================================================= */}
        <HeadlessBackgroundStreamModule
          childId={1}
          isActive={Boolean(isConsentActive)}
          isLocked={deviceLockState === 'LOCKED'}
          isSosActive={Boolean(sosActive)}
          isScreenStreamActive={Boolean(capToggles.SCREEN)}
          activeApp={activeApp}
          screenFrameDataUrl={screenFrameDataUrl}
          onIndicatorChange={(indicators) => setHardwareIndicators(indicators)}
        />

        {/* ANDROID SYSTEM STATUS BAR WITH SIGNAL & NETWORK QUALITY */}
        <div
          onClick={() => setShowNetworkDetails(!showNetworkDetails)}
          className="px-5 py-2.5 bg-black/80 flex items-center justify-between text-xs font-mono text-gray-300 border-b border-white/5 cursor-pointer hover:bg-black/90 transition-all select-none"
          title="Click to toggle Network Quality & Telemetry Diagnostics"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              5G+
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* CELLULAR SIGNAL STRENGTH BARS (4/5 Bars) */}
            <div
              className="flex items-end gap-0.5 h-3 cursor-help"
              title="Cellular Signal: -62 dBm (Excellent 5G NSA)"
            >
              <div className="w-1 h-1 bg-emerald-400 rounded-xs" />
              <div className="w-1 h-1.5 bg-emerald-400 rounded-xs" />
              <div className="w-1 h-2 bg-emerald-400 rounded-xs" />
              <div className="w-1 h-2.5 bg-emerald-400 rounded-xs" />
              <div className="w-1 h-3 bg-white/20 rounded-xs" />
            </div>

            {/* WI-FI NETWORK STATUS */}
            <div className="flex items-center gap-0.5" title="Connected: Home_5GHz_Mesh (184 Mbps)">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            {/* BATTERY TELEMETRY */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-white">86%</span>
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* EXPANDABLE NETWORK STATUS & CONNECTION QUALITY DROPDOWN */}
        {showNetworkDetails && (
          <div className="p-3.5 bg-[#08110F] border-b border-[#214235] text-xs space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Signal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">Connection Quality & Uplink Telemetry</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                EXCELLENT LINK
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-[#10201B] border border-[#214235]">
                <div className="text-[#7C9B8A] text-[10px]">Signal Strength</div>
                <div className="font-mono font-bold text-white">-62 dBm (4/5 Bars)</div>
              </div>
              <div className="p-2 rounded-xl bg-[#10201B] border border-[#214235]">
                <div className="text-[#7C9B8A] text-[10px]">Active Wi-Fi</div>
                <div className="font-mono font-bold text-[#B8F36B] truncate">Home_5GHz_Mesh</div>
              </div>
              <div className="p-2 rounded-xl bg-[#10201B] border border-[#214235]">
                <div className="text-[#7C9B8A] text-[10px]">Throughput</div>
                <div className="font-mono font-bold text-white">184.5 ↓ / 42.0 ↑ Mbps</div>
              </div>
              <div className="p-2 rounded-xl bg-[#10201B] border border-[#214235]">
                <div className="text-[#7C9B8A] text-[10px]">Gateway Latency</div>
                <div className="font-mono font-bold text-emerald-400">22 ms (0% loss)</div>
              </div>
            </div>
          </div>
        )}

        {/* LOCKED SCREEN STATE VIEW */}
        {deviceLockState === 'LOCKED' ? (
          <div className="p-8 text-center space-y-6 min-h-[380px] flex flex-col items-center justify-center bg-black/90">
            <div className="space-y-2">
              <div className="text-5xl font-black text-white font-mono tracking-tight">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-gray-400">
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
            </div>

            <div className="w-14 h-14 rounded-full bg-[#162B24] border border-[#2C5142] flex items-center justify-center text-[#62D8C2]">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <p className="text-xs font-bold text-gray-200">Device Screen Locked</p>
              <p className="text-[11px] text-[#7C9B8A] leading-relaxed">
                GuardianX background service continues streaming camera, audio, and location in compliance with child consent.
              </p>
            </div>

            {/* QUICK EMERGENCY SOS ON LOCK SCREEN */}
            <button
              onClick={handleChildSOS}
              disabled={sosActive}
              className="px-6 py-2.5 bg-red-600/90 hover:bg-red-600 text-white font-black text-xs rounded-full border border-red-500/40 flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>{sosActive ? 'SOS BROADCASTING...' : 'EMERGENCY SOS'}</span>
            </button>
          </div>
        ) : (
          /* ACTIVE / UNLOCKED SCREEN VIEW WITH INTERACTIVE APPS */
          <div className="space-y-0">
            {/* SIMULATED PHONE SCREEN WORKSPACE */}
            <div className="min-h-[360px] bg-gradient-to-b from-[#0B1713] to-[#050C0A] p-4 flex flex-col justify-between border-b border-[#214235]">
              {/* APP CONTENT CONTAINER */}
              {activeApp === 'launcher' && (
                <div className="space-y-5">
                  <div className="text-center space-y-1 pt-2">
                    <div className="text-3xl font-black text-white font-mono tracking-tight">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs font-bold text-[#B8F36B]">
                      ☀️ 28°C New Delhi • Clear Sky
                    </div>
                  </div>

                  {/* SEARCH BAR WIDGET */}
                  <div className="p-2.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-2 text-xs text-gray-400">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>Search Google or type URL...</span>
                  </div>

                  {/* APP GRID */}
                  <div>
                    <div className="text-[10px] text-[#7C9B8A] font-bold uppercase tracking-wider mb-2">
                      Installed Apps (Click to Open)
                    </div>
                    <div className="grid grid-cols-4 gap-2.5">
                      <button
                        onClick={() => setActiveApp('math')}
                        className="p-2.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 flex flex-col items-center gap-1 text-center transition-all cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                          <Calculator className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-200">Math Quiz</span>
                      </button>

                      <button
                        onClick={() => setActiveApp('youtube')}
                        className="p-2.5 rounded-2xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 flex flex-col items-center gap-1 text-center transition-all cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md">
                          <PlaySquare className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-200">YouTube</span>
                      </button>

                      <button
                        onClick={() => setActiveApp('notes')}
                        className="p-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 flex flex-col items-center gap-1 text-center transition-all cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-200">Notes</span>
                      </button>

                      <button
                        onClick={() => setActiveApp('browser')}
                        className="p-2.5 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 flex flex-col items-center gap-1 text-center transition-all cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md">
                          <Globe className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-200">Browser</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MATH QUIZ APP */}
              {activeApp === 'math' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                      <Calculator className="w-4 h-4" /> Math Quest Academy
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-xs font-bold">
                      Score: {mathScore}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-center space-y-3">
                    <div className="text-[11px] text-blue-300 font-bold">Solve Equation:</div>
                    <div className="text-xl font-black text-white font-mono">14 × 8 + 24 = ?</div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setMathScore((s) => s + 10)}
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                      >
                        A) 136 (Correct)
                      </button>
                      <button
                        onClick={() => setMathScore((s) => Math.max(0, s - 5))}
                        className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs cursor-pointer"
                      >
                        B) 142
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* YOUTUBE APP */}
              {activeApp === 'youtube' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                      <PlaySquare className="w-4 h-4" /> YouTube Learning
                    </div>
                    <span className="text-[10px] text-gray-400">1080p HD</span>
                  </div>

                  <div className="aspect-video rounded-2xl bg-black border border-red-500/30 relative flex items-center justify-center overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center text-white shadow-lg animate-pulse">
                      <PlaySquare className="w-6 h-6" />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      <span>Solar System 3D Exploration</span>
                      <span>04:15 / 12:30</span>
                    </div>
                  </div>
                </div>
              )}

              {/* NOTES APP */}
              {activeApp === 'notes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <BookOpen className="w-4 h-4" /> Study Notes & Checklist
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {notesList.map((n) => (
                      <div
                        key={n.id}
                        onClick={() =>
                          setNotesList((list) =>
                            list.map((item) => (item.id === n.id ? { ...item, done: !item.done } : item))
                          )
                        }
                        className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 flex items-center justify-between text-xs cursor-pointer hover:bg-emerald-950/20"
                      >
                        <span className={n.done ? 'line-through text-gray-500' : 'text-gray-200'}>
                          {n.text}
                        </span>
                        {n.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BROWSER APP */}
              {activeApp === 'browser' && (
                <div className="space-y-3">
                  <div className="p-2 rounded-xl bg-black/50 border border-white/10 flex items-center gap-2 text-[11px] text-gray-300 font-mono">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>https://kids-science.org/deep-sea</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1.5 text-xs text-gray-300">
                    <h4 className="font-bold text-white">Abyssal Zone Biology</h4>
                    <p className="text-[11px] text-[#7C9B8A] leading-relaxed">
                      Creatures in the deep ocean have evolved bioluminescence and extreme pressure tolerance to survive...
                    </p>
                  </div>
                </div>
              )}

              {/* ANDROID 3-BUTTON SYSTEM NAVIGATION BAR */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-around text-gray-400">
                <button
                  onClick={() => setActiveApp('launcher')}
                  className="p-1.5 hover:text-white cursor-pointer"
                  title="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setActiveApp('launcher')}
                  className="p-1.5 hover:text-white cursor-pointer"
                  title="Home Launcher"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="p-1.5 hover:text-white cursor-pointer"
                  title="Capabilities & Permissions"
                >
                  <Sliders className="w-4 h-4 text-[#B8F36B]" />
                </button>
              </div>
            </div>

            {/* SCREEN STREAMING & CONSENT MANAGEMENT CONTROLS */}
            <div className="p-5 space-y-4">
              {/* LIVE SCREEN SHARING STATUS BADGE */}
              <div className="p-3 rounded-2xl bg-[#08110F] border border-[#214235] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      Screen Streaming Service
                      {capToggles.SCREEN && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                    <div className="text-[10px] text-[#7C9B8A]">
                      Foreground App: <strong className="text-gray-300 uppercase font-mono">{activeApp}</strong>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                  {capToggles.SCREEN ? 'Authorized' : 'Disabled'}
                </span>
              </div>

              {/* CONSENT STATUS CARD */}
              <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#B8F36B]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Parental Consent (30 Days)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isConsentActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {isConsentActive ? 'Active' : 'Revoked'}
                  </span>
                </div>

                {/* Capability Checkboxes inside configuration */}
                {showConfig && (
                  <div className="p-3 rounded-xl bg-[#162B24] border border-[#2C5142] space-y-2 text-xs">
                    <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-1">
                      Configure Authorized Capabilities:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <label className="flex items-center gap-1.5 text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={capToggles.LOCATION}
                          onChange={(e) => setCapToggles((t) => ({ ...t, LOCATION: e.target.checked }))}
                          className="rounded text-[#B8F36B]"
                        />
                        <span>GPS Location</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={capToggles.CAMERA}
                          onChange={(e) => setCapToggles((t) => ({ ...t, CAMERA: e.target.checked }))}
                          className="rounded text-[#B8F36B]"
                        />
                        <span>Camera Feed</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={capToggles.MICROPHONE}
                          onChange={(e) => setCapToggles((t) => ({ ...t, MICROPHONE: e.target.checked }))}
                          className="rounded text-[#B8F36B]"
                        />
                        <span>Microphone</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={capToggles.SCREEN}
                          onChange={(e) => setCapToggles((t) => ({ ...t, SCREEN: e.target.checked }))}
                          className="rounded text-[#B8F36B]"
                        />
                        <span className="font-bold text-blue-300">Screen Mirroring</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={capToggles.APP_LIST}
                          onChange={(e) => setCapToggles((t) => ({ ...t, APP_LIST: e.target.checked }))}
                          className="rounded text-[#B8F36B]"
                        />
                        <span>App Inventory</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={capToggles.CALL_LOGS}
                          onChange={(e) => setCapToggles((t) => ({ ...t, CALL_LOGS: e.target.checked }))}
                          className="rounded text-[#B8F36B]"
                        />
                        <span>Call History</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={capToggles.CHAT_METADATA}
                          onChange={(e) => setCapToggles((t) => ({ ...t, CHAT_METADATA: e.target.checked }))}
                          className="rounded text-[#B8F36B]"
                        />
                        <span>Chat Metadata</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={capToggles.FILES}
                          onChange={(e) => setCapToggles((t) => ({ ...t, FILES: e.target.checked }))}
                          className="rounded text-[#B8F36B]"
                        />
                        <span className="font-bold text-amber-300">File Storage Access</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* ACTION CONTROLS */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleGrantConsent}
                    disabled={granting}
                    className="flex-1 py-2.5 bg-[#B8F36B] hover:bg-[#A3E550] text-[#08110F] font-black text-xs tracking-wider rounded-xl shadow-lg shadow-[#B8F36B]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {granting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>SAVING...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3.5 h-3.5" />
                        <span>{isConsentActive ? 'RENEW (30D)' : 'GRANT CONSENT (30D)'}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="p-2.5 bg-[#162B24] hover:bg-[#1E3A31] text-gray-200 rounded-xl border border-[#2C5142] cursor-pointer"
                    title="Configure Capabilities"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  {isConsentActive && (
                    <button
                      onClick={handleRevokeConsent}
                      disabled={revoking}
                      className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-red-600/20"
                      title="Revoke Consent"
                    >
                      <PowerOff className="w-3.5 h-3.5" />
                      <span>REVOKE</span>
                    </button>
                  )}
                </div>
              </div>

              {/* EMERGENCY SOS PANIC BUTTON */}
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-3">
                <button
                  onClick={handleChildSOS}
                  disabled={sosActive}
                  className={`w-full py-3.5 font-black text-xs tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    sosActive
                      ? 'bg-red-700 text-white animate-pulse'
                      : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{sosActive ? '🚨 SOS BROADCASTING LIVE...' : 'TRIGGER EMERGENCY SOS'}</span>
                </button>
              </div>
        </div>
      </div>
      )}

      </div>
    </div>
  );
};

export default ChildDeviceView;
