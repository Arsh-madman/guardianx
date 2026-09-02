import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, RefreshCw, Smartphone } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { InstalledApp } from '../types';

interface AppsResponse {
  child_id: number;
  apps: InstalledApp[];
  last_fetched_at: string | null;
  request_id: number | null;
  status: string;
}

interface AppUsageSummaryProps {
  childId: number;
  onRefreshApps?: () => void | Promise<void>;
}

export const AppUsageSummary: React.FC<AppUsageSummaryProps> = ({ childId, onRefreshApps }) => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [status, setStatus] = useState('LOADING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/device/apps/${childId}`);
      if (!response.ok) throw new Error(`App usage request failed (${response.status})`);
      const payload: AppsResponse = await response.json();
      setApps(Array.isArray(payload.apps) ? payload.apps : []);
      setLastFetchedAt(payload.last_fetched_at);
      setStatus(payload.status || 'UNKNOWN');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load app usage');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => { void loadApps(); }, [loadApps]);

  const chartData = useMemo(
    () => [...apps]
      .sort((a, b) => b.usage_today_minutes - a.usage_today_minutes)
      .slice(0, 8)
      .map(app => ({
        name: app.name.length > 16 ? `${app.name.slice(0, 16)}…` : app.name,
        minutes: app.usage_today_minutes,
      })),
    [apps]
  );

  const totalMinutes = useMemo(
    () => apps.reduce((sum, app) => sum + app.usage_today_minutes, 0),
    [apps]
  );

  return (
    <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] shadow-xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">App Usage Summary</h3>
          </div>
          <p className="text-xs text-[#7C9B8A] mt-1">Today's usage from the child device.</p>
        </div>

        <button
          type="button"
          onClick={async () => { await loadApps(); await onRefreshApps?.(); }}
          className="p-2 rounded-xl bg-[#08110F] border border-[#214235] text-[#B8F36B]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/30 border border-red-900/50">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235]">
          <div className="flex items-center gap-2 text-[#7C9B8A] text-[11px] font-bold"><Smartphone className="w-4 h-4" />Apps tracked</div>
          <div className="text-2xl font-black text-white mt-2">{apps.length}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235]">
          <div className="flex items-center gap-2 text-[#7C9B8A] text-[11px] font-bold"><Clock3 className="w-4 h-4" />Total today</div>
          <div className="text-2xl font-black text-white mt-2">{totalMinutes}m</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#08110F] border border-[#214235]">
          <div className="text-[#7C9B8A] text-[11px] font-bold">Status</div>
          <div className="text-sm font-black text-emerald-400 mt-2">{status}</div>
          {lastFetchedAt && <div className="text-[10px] text-[#7C9B8A] mt-1">{new Date(lastFetchedAt).toLocaleString()}</div>}
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#214235" />
              <XAxis dataKey="name" tick={{ fill: '#7C9B8A', fontSize: 10 }} axisLine={{ stroke: '#214235' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#7C9B8A', fontSize: 10 }} axisLine={{ stroke: '#214235' }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#08110F', border: '1px solid #214235', borderRadius: 12, color: '#fff' }}
                formatter={(value: number) => [`${value} min`, 'Usage']}
              />
              <Bar dataKey="minutes" fill="#34D399" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="p-10 rounded-2xl bg-[#08110F] border border-[#214235] text-center">
          <Smartphone className="w-8 h-8 text-[#7C9B8A] mx-auto mb-3" />
          <p className="text-sm font-bold text-white">{loading ? 'Loading app usage…' : 'No app usage data available'}</p>
          <p className="text-xs text-[#7C9B8A] mt-1">
            {status === 'NOT_FETCHED'
              ? 'Fetch the installed-app inventory from the device first.'
              : 'The device has not returned usage data yet.'}
          </p>
        </div>
      )}
    </div>
  );
};
