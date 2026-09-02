import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  PhoneCall,
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  ChevronRight,
  Send,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Layers,
  Sparkles
} from 'lucide-react';
import { InstalledApp, CallLogMetadata, ChatMetadata, Consent } from '../types';
import { AppUsageSummary } from './AppUsageSummary';

interface CommunicationsManagerProps {
  childId: number;
  childName: string;
  consent: Consent | null;
  onDispatchCapability: (cap: 'APP_LIST' | 'CALL_LOGS' | 'CHAT_METADATA') => void;
  dispatchingCap: string | null;
}

export const CommunicationsManager: React.FC<CommunicationsManagerProps> = ({
  childId,
  childName,
  consent,
  onDispatchCapability,
  dispatchingCap,
}) => {
  const [subTab, setSubTab] = useState<'apps' | 'calls' | 'chats'>('apps');

  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [callLogs, setCallLogs] = useState<CallLogMetadata[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const loadCommunicationsData = async () => {
    try {
      setLoading(true);
      const [appsRes, callsRes, chatsRes] = await Promise.all([
        fetch(`/api/device/apps/${childId}`),
        fetch(`/api/device/calls/${childId}`),
        fetch(`/api/device/chats/${childId}`),
      ]);

      if (appsRes.ok) {
        const data = await appsRes.json();
        setApps(data.apps || []);
      }
      if (callsRes.ok) {
        const data = await callsRes.json();
        setCallLogs(data.call_logs || []);
      }
      if (chatsRes.ok) {
        const data = await chatsRes.json();
        setChatThreads(data.chat_threads || []);
      }
    } catch (e) {
      console.error('Failed to load communications data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunicationsData();
  }, [childId]);

  // Capabilities active states
  const isAppConsent = consent?.is_active && consent.capabilities.APP_LIST;
  const isCallConsent = consent?.is_active && consent.capabilities.CALL_LOGS;
  const isChatConsent = consent?.is_active && consent.capabilities.CHAT_METADATA;

  // Filtered Apps
  const filteredApps = apps.filter((app) => {
    const matchCat = categoryFilter === 'ALL' || app.category === categoryFilter;
    const matchSearch =
      !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.package_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Filtered Calls
  const filteredCalls = callLogs.filter((c) => {
    return (
      !searchQuery ||
      c.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone_masked.includes(searchQuery)
    );
  });

  // Filtered Chats
  const filteredChats = chatThreads.filter((t) => {
    return (
      !searchQuery ||
      t.contact_or_group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.platform.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getCallTypeBadge = (type: CallLogMetadata['type']) => {
    switch (type) {
      case 'incoming':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <PhoneIncoming className="w-3 h-3" />
            <span>Incoming</span>
          </span>
        );
      case 'outgoing':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <PhoneOutgoing className="w-3 h-3" />
            <span>Outgoing</span>
          </span>
        );
      case 'missed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1">
            <PhoneMissed className="w-3 h-3" />
            <span>Missed</span>
          </span>
        );
    }
  };

  const getPlatformColor = (platform: ChatMetadata['platform']) => {
    switch (platform) {
      case 'WhatsApp':
        return 'bg-emerald-600 text-white';
      case 'Telegram':
        return 'bg-sky-500 text-white';
      case 'Discord':
        return 'bg-indigo-600 text-white';
      case 'SMS':
        return 'bg-amber-600 text-white';
      case 'Google Messages':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-700 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E3E34] to-[#10201B] border border-[#2C5142] flex items-center justify-center text-[#B8F36B] shadow-lg">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  App Inventory & Activity Logs
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#B8F36B]/10 text-[#B8F36B] border border-[#B8F36B]/20">
                  Consent-Protected
                </span>
              </div>
              <p className="text-xs text-[#7C9B8A] mt-0.5">
                Privacy-respecting metadata logs for installed applications, call history, and communication frequency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (subTab === 'apps') onDispatchCapability('APP_LIST');
                if (subTab === 'calls') onDispatchCapability('CALL_LOGS');
                if (subTab === 'chats') onDispatchCapability('CHAT_METADATA');
              }}
              disabled={Boolean(dispatchingCap)}
              className="px-4 py-2.5 bg-[#B8F36B] hover:bg-[#A3E550] text-[#08110F] font-black text-xs rounded-xl shadow-lg shadow-[#B8F36B]/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dispatchingCap ? 'animate-spin' : ''}`} />
              <span>
                {dispatchingCap
                  ? `REQUESTING ${dispatchingCap}...`
                  : subTab === 'apps'
                  ? 'FETCH APPS LIST'
                  : subTab === 'calls'
                  ? 'FETCH CALL LOGS'
                  : 'FETCH CHAT THREADS'}
              </span>
            </button>
          </div>
        </div>

        {/* SUB-TABS SWITCHER */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#182C24]">
          <button
            onClick={() => setSubTab('apps')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'apps'
                ? 'bg-[#B8F36B] text-[#08110F] shadow-sm'
                : 'bg-[#162B24] text-[#7C9B8A] hover:text-white border border-[#2C5142]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Installed Apps ({apps.length})</span>
          </button>

          <button
            onClick={() => setSubTab('calls')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'calls'
                ? 'bg-[#B8F36B] text-[#08110F] shadow-sm'
                : 'bg-[#162B24] text-[#7C9B8A] hover:text-white border border-[#2C5142]'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call History ({callLogs.length})</span>
          </button>

          <button
            onClick={() => setSubTab('chats')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'chats'
                ? 'bg-[#B8F36B] text-[#08110F] shadow-sm'
                : 'bg-[#162B24] text-[#7C9B8A] hover:text-white border border-[#2C5142]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Metadata ({chatThreads.length})</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#10201B] border border-[#214235]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7C9B8A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              subTab === 'apps'
                ? 'Search app name or package...'
                : subTab === 'calls'
                ? 'Search contact name or number...'
                : 'Search chat contact or group name...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#08110F] border border-[#214235] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#B8F36B]"
          />
        </div>

        {subTab === 'apps' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7C9B8A] font-bold">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#08110F] border border-[#214235] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#B8F36B]"
            >
              <option value="ALL">All Categories</option>
              <option value="Education">Education</option>
              <option value="Games">Games</option>
              <option value="Social">Social</option>
              <option value="Entertainment">Entertainment</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: INSTALLED APPS INVENTORY */}
      {subTab === 'apps' && (
        <div className="space-y-5">
          {/* Recharts App Usage Bar Chart Summary */}
          <AppUsageSummary childId={childId} onRefreshApps={loadCommunicationsData} />

          <div className="rounded-3xl bg-[#10201B] border border-[#214235] overflow-hidden shadow-xl">
          {filteredApps.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Smartphone className="w-8 h-8 text-[#7C9B8A] mx-auto" />
              <div className="text-sm font-bold text-white">No app data cached yet</div>
              <p className="text-xs text-[#7C9B8A]">
                Click "Fetch Apps List" above to request the device's installed package inventory.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#08110F] text-[#7C9B8A] font-bold uppercase text-[10px] tracking-wider border-b border-[#214235]">
                  <tr>
                    <th className="py-3.5 px-4">Application</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Screen Time Today</th>
                    <th className="py-3.5 px-4">Storage</th>
                    <th className="py-3.5 px-4">Permissions</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182C24]">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-[#162B24]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-black text-white text-sm">{app.name}</div>
                          <div className="text-[10px] text-[#7C9B8A] font-mono mt-0.5">{app.package_name} • v{app.version}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#162B24] text-[#62D8C2] border border-[#2C5142]">
                          {app.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white">{app.usage_today_minutes} mins</span>
                          <div className="w-16 h-1.5 rounded-full bg-[#08110F] overflow-hidden">
                            <div
                              className="h-full bg-[#B8F36B] rounded-full"
                              style={{ width: `${Math.min(100, (app.usage_today_minutes / 60) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">{app.size_mb} MB</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {app.permissions.slice(0, 3).map((perm, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#08110F] text-[#7C9B8A]">
                              {perm}
                            </span>
                          ))}
                          {app.permissions.length > 3 && (
                            <span className="text-[9px] text-[#7C9B8A]">+{app.permissions.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          app.status === 'allowed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : app.status === 'monitored'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      )}

      {/* TAB 2: CALL HISTORY */}
      {subTab === 'calls' && (
        <div className="rounded-3xl bg-[#10201B] border border-[#214235] overflow-hidden shadow-xl">
          {filteredCalls.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <PhoneCall className="w-8 h-8 text-[#7C9B8A] mx-auto" />
              <div className="text-sm font-bold text-white">No call logs recorded yet</div>
              <p className="text-xs text-[#7C9B8A]">
                Click "Fetch Call Logs" above to request call log metadata.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#08110F] text-[#7C9B8A] font-bold uppercase text-[10px] tracking-wider border-b border-[#214235]">
                  <tr>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Phone Number (Masked)</th>
                    <th className="py-3.5 px-4">Call Type</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4 text-right">SIM Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182C24]">
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-[#162B24]/40 transition-colors">
                      <td className="py-3.5 px-4 font-black text-white">{call.contact_name}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-300">{call.phone_masked}</td>
                      <td className="py-3.5 px-4">{getCallTypeBadge(call.type)}</td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {call.duration_seconds > 0
                          ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                          : '0s (No Answer)'}
                      </td>
                      <td className="py-3.5 px-4 text-[#7C9B8A]">
                        {new Date(call.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#162B24] text-[#7C9B8A] border border-[#2C5142]">
                          {call.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHAT METADATA THREADS */}
      {subTab === 'chats' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChats.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-3xl bg-[#10201B] border border-[#214235] space-y-3">
              <MessageSquare className="w-8 h-8 text-[#7C9B8A] mx-auto" />
              <div className="text-sm font-bold text-white">No chat metadata loaded yet</div>
              <p className="text-xs text-[#7C9B8A]">
                Click "Fetch Chat Threads" above to poll conversation frequency and platform statistics.
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] hover:border-[#2C5142] transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${getPlatformColor(chat.platform)}`}>
                      {chat.platform}
                    </span>
                    <span className="text-[10px] text-[#7C9B8A] font-bold uppercase">
                      {chat.thread_type === 'group' ? '👥 Group Chat' : '👤 Direct Chat'}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-white truncate" title={chat.contact_or_group_name}>
                    {chat.contact_or_group_name}
                  </h3>
                </div>

                <div className="p-3 rounded-xl bg-[#08110F] border border-[#214235] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7C9B8A]">24h Volume:</span>
                    <span className="font-black text-[#B8F36B]">{chat.message_count_24h} messages</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7C9B8A]">Activity:</span>
                    <span className="text-gray-300 font-medium">
                      {new Date(chat.last_active_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-[#7C9B8A]">
                  <span className="capitalize">{chat.direction} stream</span>
                  {chat.unread_count > 0 && (
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {chat.unread_count} Unread
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
