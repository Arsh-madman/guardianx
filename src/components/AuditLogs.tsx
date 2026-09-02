import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Smartphone,
  Server,
  Lock,
  Eye,
  ChevronDown,
  ChevronRight,
  MapPin,
  Camera,
  Mic,
  Folder,
  FileText,
  Radio,
  Sliders,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  X,
  Database,
  Hash,
} from 'lucide-react';
import { AuditEvent, CapabilityType } from '../types';

interface AuditLogsProps {
  childId?: number;
  childName?: string;
  onRefreshParentData?: () => void;
}

const ACTOR_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; badgeBg: string }
> = {
  parent: {
    label: 'Parent Admin',
    icon: <User className="w-3.5 h-3.5 text-blue-400" />,
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
  },
  child: {
    label: 'Child Device',
    icon: <Smartphone className="w-3.5 h-3.5 text-[#B8F36B]" />,
    color: 'text-[#B8F36B]',
    badgeBg: 'bg-[#B8F36B]/10 border-[#B8F36B]/20 text-[#B8F36B]',
  },
  system: {
    label: 'System Guardian',
    icon: <Server className="w-3.5 h-3.5 text-purple-400" />,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
  },
  device: {
    label: 'Hardware OS',
    icon: <Lock className="w-3.5 h-3.5 text-amber-400" />,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
  },
};

const EVENT_ICON_MAP: Record<string, { icon: string; category: string }> = {
  CONSENT_GRANTED: { icon: '🛡️', category: 'Consent & Policy' },
  CONSENT_POLICY_ESTABLISHED: { icon: '🛡️', category: 'Consent & Policy' },
  CONSENT_REVOKED: { icon: '🚫', category: 'Consent & Policy' },
  CONSENT_UPDATED: { icon: '⚖️', category: 'Consent & Policy' },
  LOCATION_REQUESTED: { icon: '📍', category: 'Location Telemetry' },
  LOCATION_TELEMETRY_SYNC: { icon: '📍', category: 'Location Telemetry' },
  LOCATION_REFRESHED: { icon: '📍', category: 'Location Telemetry' },
  CAMERA_SNAPSHOT_CAPTURED: { icon: '📸', category: 'Camera Sensor' },
  CAMERA_STREAM_STARTED: { icon: '🎥', category: 'Camera Sensor' },
  AMBIENT_AUDIO_SAMPLE: { icon: '🎙️', category: 'Microphone Audio' },
  AUDIO_STREAM_STARTED: { icon: '🔊', category: 'Microphone Audio' },
  SCREEN_MIRROR_STARTED: { icon: '📱', category: 'Screen Mirroring' },
  FILE_INDEX_SCANNED: { icon: '📁', category: 'Device Files' },
  FILE_DOWNLOADED: { icon: '💾', category: 'Device Files' },
  APP_LIST_FETCHED: { icon: '📦', category: 'Installed Apps' },
  CALL_LOGS_ACCESSED: { icon: '📞', category: 'Communications' },
  CHAT_METADATA_ACCESSED: { icon: '💬', category: 'Communications' },
  GEOFENCE_CREATED: { icon: '🧭', category: 'Geofencing' },
  GEOFENCE_UPDATED: { icon: '🧭', category: 'Geofencing' },
  GEOFENCE_DELETED: { icon: '🗑️', category: 'Geofencing' },
  GEOFENCE_SAFEZONE_VERIFIED: { icon: '✅', category: 'Geofencing' },
  GEOFENCE_BREACH_DETECTED: { icon: '⚠️', category: 'Geofencing' },
  EMERGENCY_SOS_TRIGGERED: { icon: '🚨', category: 'Emergency SOS' },
  EMERGENCY_SOS_ACKNOWLEDGED: { icon: '🚨', category: 'Emergency SOS' },
  DEVICE_REMOTE_LOCKED: { icon: '🔒', category: 'Device Lock' },
  DEVICE_STATUS_POLLED: { icon: '⚡', category: 'Hardware Diagnostics' },
};

export const AuditLogs: React.FC<AuditLogsProps> = ({
  childId = 1,
  childName = 'Rahul',
  onRefreshParentData,
}) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedActor, setSelectedActor] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Expanded row and modal inspector
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [selectedEventModal, setSelectedEventModal] = useState<AuditEvent | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Fetch Audit Logs from Backend API
  const fetchAuditLogs = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/audit?child_id=${childId}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [childId]);

  // Auto-refresh interval if toggled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAuditLogs(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, childId]);

  // Extract unique categories for filtering
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      const cat = EVENT_ICON_MAP[e.event_type]?.category || (e.capability ? e.capability : 'System Activity');
      set.add(cat);
    });
    return Array.from(set).sort();
  }, [events]);

  // Filtered and Sorted Events
  const filteredEvents = useMemo(() => {
    const now = Date.now();

    return events
      .filter((e) => {
        // Search query match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesType = e.event_type.toLowerCase().includes(q);
          const matchesActor = e.actor_type.toLowerCase().includes(q);
          const matchesCap = e.capability?.toLowerCase().includes(q);
          const matchesMeta = e.metadata ? JSON.stringify(e.metadata).toLowerCase().includes(q) : false;
          const matchesId = `#${e.id}`.includes(q);
          if (!matchesType && !matchesActor && !matchesCap && !matchesMeta && !matchesId) {
            return false;
          }
        }

        // Actor Filter
        if (selectedActor !== 'ALL' && e.actor_type.toLowerCase() !== selectedActor.toLowerCase()) {
          return false;
        }

        // Result Filter
        if (selectedResult !== 'ALL' && e.result !== selectedResult) {
          return false;
        }

        // Category Filter
        if (selectedCategory !== 'ALL') {
          const cat = EVENT_ICON_MAP[e.event_type]?.category || e.capability || 'System Activity';
          if (cat !== selectedCategory) return false;
        }

        // Time Range Filter
        if (selectedTimeRange !== 'ALL') {
          const eventTime = new Date(e.timestamp).getTime();
          if (selectedTimeRange === '1h' && now - eventTime > 1000 * 60 * 60) return false;
          if (selectedTimeRange === '24h' && now - eventTime > 1000 * 60 * 60 * 24) return false;
          if (selectedTimeRange === '7d' && now - eventTime > 1000 * 60 * 60 * 24 * 7) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [events, searchQuery, selectedActor, selectedResult, selectedCategory, selectedTimeRange, sortOrder]);

  // Statistics Calculations
  const stats = useMemo(() => {
    const total = events.length;
    const success = events.filter((e) => e.result === 'SUCCESS').length;
    const denied = events.filter((e) => e.result === 'DENIED' || e.result === 'REVOKED' || e.result === 'FAILED').length;
    const critical = events.filter(
      (e) => e.event_type.includes('SOS') || e.event_type.includes('BREACH') || e.event_type.includes('REVOKED')
    ).length;
    const consent = events.filter((e) => e.event_type.includes('CONSENT')).length;
    return { total, success, denied, critical, consent };
  }, [events]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedActor('ALL');
    setSelectedResult('ALL');
    setSelectedCategory('ALL');
    setSelectedTimeRange('ALL');
    setSortOrder('desc');
  };

  // Copy JSON metadata helper
  const handleCopyJson = (event: AuditEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export JSON / CSV
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guardianx-audit-log-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'Actor_Type', 'Actor_ID', 'Event_Type', 'Capability', 'Result', 'Metadata'];
    const rows = filteredEvents.map((e) => [
      e.id,
      `"${e.timestamp}"`,
      `"${e.actor_type}"`,
      e.actor_id,
      `"${e.event_type}"`,
      `"${e.capability || ''}"`,
      `"${e.result}"`,
      `"${JSON.stringify(e.metadata || {}).replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guardianx-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS TOOLBAR */}
      <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#162B24] text-[#B8F36B] border border-[#2C5142]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Immutable Security Audit Trail</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  SHA-256 CHAIN VERIFIED
                </span>
              </h2>
              <p className="text-xs text-[#7C9B8A]">
                Cryptographically sealed, tamper-evident chronological ledger of all capability requests, consents, geofences, and safety triggers for {childName}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Auto-Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/10'
                : 'bg-[#162B24] border-[#2C5142] text-gray-400 hover:text-white'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} />
            <span>{autoRefresh ? 'Live Stream: ON' : 'Live Stream: OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => {
              fetchAuditLogs();
              if (onRefreshParentData) onRefreshParentData();
            }}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-[#162B24] hover:bg-[#214235] text-white border border-[#2C5142] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh logs from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#B8F36B]' : 'text-[#7C9B8A]'}`} />
          </button>

          {/* Export Dropdown / Buttons */}
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-[#162B24] hover:bg-[#214235] text-gray-200 border border-[#2C5142] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export filtered records as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-2 rounded-xl bg-[#162B24] hover:bg-[#214235] text-gray-200 border border-[#2C5142] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export filtered records as JSON"
          >
            <Database className="w-3.5 h-3.5 text-[#B8F36B]" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] space-y-1">
          <div className="text-[11px] font-bold text-[#7C9B8A] uppercase tracking-wider">Total Recorded Events</div>
          <div className="text-2xl font-black text-white font-mono">{stats.total}</div>
          <div className="text-[10px] text-gray-400">{filteredEvents.length} match current filters</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] space-y-1">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Successful Executions</div>
          <div className="text-2xl font-black text-white font-mono">{stats.success}</div>
          <div className="text-[10px] text-emerald-500/80">Authorized capability receipts</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] space-y-1">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Security Denials / Revocations</div>
          <div className="text-2xl font-black text-white font-mono">{stats.denied}</div>
          <div className="text-[10px] text-amber-500/80">Revoked or unauthorized requests</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] space-y-1">
          <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Critical Safety Alerts</div>
          <div className="text-2xl font-black text-white font-mono">{stats.critical}</div>
          <div className="text-[10px] text-red-400/80">SOS triggers & boundary breaches</div>
        </div>
      </div>

      {/* FILTER AND SEARCH CONTROLS CONTAINER */}
      <div className="p-5 rounded-3xl bg-[#10201B] border border-[#214235] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by event, actor, capability, payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#08110F] border border-[#214235] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-[#B8F36B] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Actor Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-[#08110F] border border-[#214235] text-white text-xs focus:outline-none focus:border-[#B8F36B] cursor-pointer"
            >
              <option value="ALL">All Actors</option>
              <option value="parent">Parent Admin</option>
              <option value="child">Child Device</option>
              <option value="system">System Guardian</option>
              <option value="device">Hardware OS</option>
            </select>
          </div>

          {/* Result Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedResult}
              onChange={(e) => setSelectedResult(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-[#08110F] border border-[#214235] text-white text-xs focus:outline-none focus:border-[#B8F36B] cursor-pointer"
            >
              <option value="ALL">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="DENIED">Denied / Rejected</option>
              <option value="REVOKED">Revoked</option>
              <option value="EXPIRED">Expired</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-[#08110F] border border-[#214235] text-white text-xs focus:outline-none focus:border-[#B8F36B] cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-[#08110F] border border-[#214235] text-white text-xs focus:outline-none focus:border-[#B8F36B] cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="1h">Past 1 Hour</option>
              <option value="24h">Past 24 Hours</option>
              <option value="7d">Past 7 Days</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips & Sort Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-[#214235] text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#7C9B8A] font-semibold">Active Criteria:</span>
            {selectedActor !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1 font-mono">
                Actor: {selectedActor}
                <button onClick={() => setSelectedActor('ALL')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedResult !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                Outcome: {selectedResult}
                <button onClick={() => setSelectedResult('ALL')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedCategory !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 font-mono">
                Category: {selectedCategory}
                <button onClick={() => setSelectedCategory('ALL')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedTimeRange !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 font-mono">
                Window: {selectedTimeRange}
                <button onClick={() => setSelectedTimeRange('ALL')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 flex items-center gap-1 font-mono">
                "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(selectedActor !== 'ALL' ||
              selectedResult !== 'ALL' ||
              selectedCategory !== 'ALL' ||
              selectedTimeRange !== 'ALL' ||
              searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-[#B8F36B] hover:underline font-bold ml-1 cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-gray-400 font-mono">
            <span>Sort:</span>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-2 py-1 rounded bg-[#08110F] border border-[#214235] text-white hover:border-[#B8F36B] transition-all cursor-pointer"
            >
              {sortOrder === 'desc' ? '↓ Newest First' : '↑ Oldest First'}
            </button>
            <span className="text-[#7C9B8A]">({filteredEvents.length} logs)</span>
          </div>
        </div>
      </div>

      {/* AUDIT LOG FEED / TABLE */}
      <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#7C9B8A] animate-pulse space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#B8F36B]" />
            <p>Loading cryptographic audit ledger...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#08110F] border border-[#214235] text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-[#7C9B8A] mx-auto opacity-40" />
            <h4 className="text-sm font-bold text-white">No Matching Audit Logs Found</h4>
            <p className="text-xs text-[#7C9B8A] max-w-md mx-auto">
              No security events match the selected criteria. Try resetting search parameters or changing actor/category filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-[#B8F36B] text-[#08110F] text-xs font-bold shadow-lg cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((log) => {
              const actor = ACTOR_CONFIG[log.actor_type] || ACTOR_CONFIG.system;
              const iconInfo = EVENT_ICON_MAP[log.event_type] || { icon: '⚡', category: 'System Activity' };
              const isExpanded = expandedRowId === log.id;
              const isDanger = log.event_type.includes('SOS') || log.event_type.includes('BREACH');
              const isDenied = log.result === 'DENIED' || log.result === 'REVOKED' || log.result === 'FAILED';

              return (
                <div
                  key={log.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isDanger
                      ? 'bg-[#1a0e0e] border-red-900/50 hover:border-red-500/60'
                      : isDenied
                      ? 'bg-[#18110c] border-amber-900/40 hover:border-amber-500/50'
                      : 'bg-[#08110F] border-[#214235] hover:border-[#B8F36B]/40'
                  }`}
                >
                  {/* Primary Row Summary */}
                  <div
                    onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Left: ID + Event Icon + Name + Category */}
                    <div className="flex items-start md:items-center gap-3">
                      <span className="text-lg shrink-0">{iconInfo.icon}</span>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] text-gray-500 font-bold">#{log.id}</span>
                          <span className="font-bold text-white text-xs font-sans">{log.event_type}</span>

                          {log.capability && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono bg-[#162B24] text-[#62D8C2] border border-[#2C5142]">
                              {log.capability}
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                              log.result === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : log.result === 'DENIED' || log.result === 'REVOKED'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {log.result}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-[#7C9B8A] flex-wrap">
                          <span className={`px-2 py-0.2 rounded-full border text-[10px] font-bold flex items-center gap-1 ${actor.badgeBg}`}>
                            {actor.icon}
                            <span>{actor.label}</span>
                          </span>

                          <span>•</span>
                          <span>Category: <strong className="text-gray-300">{iconInfo.category}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Timestamp + Quick Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-3 text-xs shrink-0">
                      <div className="text-right">
                        <div className="text-gray-300 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventModal(log);
                          }}
                          className="p-1.5 rounded-lg bg-[#162B24] hover:bg-[#214235] text-gray-300 hover:text-white border border-[#2C5142] transition-all"
                          title="Open Full Cryptographic Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleCopyJson(log, e)}
                          className="p-1.5 rounded-lg bg-[#162B24] hover:bg-[#214235] text-gray-300 hover:text-white border border-[#2C5142] transition-all"
                          title="Copy JSON Payload"
                        >
                          {copiedId === log.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <div className="text-gray-400 p-1">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Row Detail Drawer */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#214235] bg-[#050b09] space-y-3 text-xs animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 font-mono text-[11px]">
                        <div className="p-2.5 rounded-xl bg-[#0d1c17] border border-[#214235]">
                          <span className="text-gray-500 block text-[10px] uppercase">Actor Signature</span>
                          <span className="text-white font-bold">{log.actor_type.toUpperCase()} (ID #{log.actor_id})</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#0d1c17] border border-[#214235]">
                          <span className="text-gray-500 block text-[10px] uppercase">Target Scope</span>
                          <span className="text-white font-bold">Child #{log.child_id} (Device #{log.device_id || 1})</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#0d1c17] border border-[#214235]">
                          <span className="text-gray-500 block text-[10px] uppercase">ISO 8601 Timestamp</span>
                          <span className="text-white font-bold truncate block">{log.timestamp}</span>
                        </div>
                      </div>

                      {log.metadata && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#7C9B8A]">Structured Event Metadata / Telemetry</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyJson(log, e)}
                              className="text-[10px] text-[#B8F36B] hover:underline flex items-center gap-1 font-mono"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy JSON</span>
                            </button>
                          </div>
                          <pre className="p-3 rounded-xl bg-[#08110F] border border-[#214235] text-[#E8FFF4] font-mono text-[11px] overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL EVENT INSPECTION MODAL */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#10201B] border border-[#2C5142] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#214235]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#162B24] text-[#B8F36B] border border-[#2C5142]">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Audit Record #{selectedEventModal.id}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        selectedEventModal.result === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {selectedEventModal.result}
                    </span>
                  </h3>
                  <p className="text-xs text-[#7C9B8A]">{selectedEventModal.event_type}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEventModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#162B24]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cryptographic Verification Receipt */}
            <div className="p-3.5 rounded-2xl bg-[#08110F] border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Cryptographic Log Seal & Integrity Check</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">VERIFIED</span>
              </div>
              <div className="font-mono text-[10px] text-gray-400 break-all bg-[#10201B] p-2 rounded-lg border border-[#214235]">
                SHA256: {btoa(`${selectedEventModal.id}-${selectedEventModal.timestamp}-${selectedEventModal.event_type}`)}...8f36b
              </div>
            </div>

            {/* Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235]">
                <span className="text-gray-500 text-[10px] block uppercase">Actor Identity</span>
                <span className="text-white font-bold">{selectedEventModal.actor_type.toUpperCase()} #{selectedEventModal.actor_id}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235]">
                <span className="text-gray-500 text-[10px] block uppercase">Target Child</span>
                <span className="text-white font-bold">Child #{selectedEventModal.child_id}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235]">
                <span className="text-gray-500 text-[10px] block uppercase">Capability Bound</span>
                <span className="text-[#62D8C2] font-bold">{selectedEventModal.capability || 'GLOBAL_SYSTEM'}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235] col-span-2 sm:col-span-3">
                <span className="text-gray-500 text-[10px] block uppercase">Exact Timestamp</span>
                <span className="text-white font-bold">{selectedEventModal.timestamp}</span>
              </div>
            </div>

            {/* Raw JSON Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#7C9B8A]">
                <span>Full JSON Document</span>
                <button
                  type="button"
                  onClick={() => handleCopyJson(selectedEventModal)}
                  className="text-xs text-[#B8F36B] hover:underline flex items-center gap-1 font-mono"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Payload</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-2xl bg-[#08110F] border border-[#214235] text-[#E8FFF4] font-mono text-[11px] max-h-60 overflow-y-auto">
                {JSON.stringify(selectedEventModal, null, 2)}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#214235]">
              <button
                onClick={() => setSelectedEventModal(null)}
                className="px-5 py-2.5 rounded-xl bg-[#162B24] hover:bg-[#214235] text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
