import React, { useCallback, useEffect, useState } from 'react';
import { BatteryCharging, Thermometer, Zap, Clock3, Activity, RefreshCw, Power } from 'lucide-react';

interface BatteryDetails {
  battery_level: number;
  is_charging: boolean;
  charging_type: string;
  temperature_c: number;
  voltage_v: number;
  health: string;
  estimated_time_remaining_minutes: number;
  power_saving_mode: boolean;
  screen_on_time_minutes_today: number;
  last_updated: string;
}

interface BatteryResponse {
  child_id: number;
  device_id: number;
  device_name: string;
  battery: BatteryDetails;
}

interface BatteryStatusWidgetProps {
  childId: number;
  onRefresh?: () => void | Promise<void>;
}

export const BatteryStatusWidget: React.FC<BatteryStatusWidgetProps> = ({ childId, onRefresh }) => {
  const [data, setData] = useState<BatteryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBattery = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/device/battery/${childId}`);
      if (!response.ok) throw new Error(`Battery request failed (${response.status})`);
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load battery telemetry');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => { void loadBattery(); }, [loadBattery]);

  const battery = data?.battery;
  const level = Math.max(0, Math.min(100, battery?.battery_level ?? 0));

  if (loading && !data) {
    return <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] text-[#7C9B8A]">Loading battery telemetry...</div>;
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-3xl bg-[#10201B] border border-red-900/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">Battery Telemetry</h3>
            <p className="text-xs text-red-300 mt-1">{error}</p>
          </div>
          <button type="button" onClick={() => void loadBattery()} className="px-3 py-2 rounded-xl bg-[#162B24] text-white text-xs font-bold">Retry</button>
        </div>
      </div>
    );
  }

  if (!battery) return null;

  const remaining = battery.estimated_time_remaining_minutes ?? 0;
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;

  return (
    <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">Battery & Power</h3>
          </div>
          <p className="text-xs text-[#7C9B8A] mt-1">{data.device_name || 'Child device'}</p>
        </div>

        <button
          type="button"
          onClick={async () => { await loadBattery(); await onRefresh?.(); }}
          className="p-2 rounded-xl bg-[#08110F] border border-[#214235] text-[#B8F36B]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div>
        <div className="flex items-end justify-between mb-2">
          <span className="text-3xl font-black text-white">{level}%</span>
          <span className="text-xs text-[#7C9B8A]">
            {battery.is_charging ? `Charging • ${battery.charging_type}` : 'Discharging'}
          </span>
        </div>
        <div className="h-3 rounded-full bg-[#08110F] overflow-hidden border border-[#214235]">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${level}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-[#08110F] border border-[#214235]">
          <div className="flex items-center gap-2 text-[#7C9B8A] text-[11px] font-bold"><Thermometer className="w-4 h-4" />Temperature</div>
          <div className="text-lg font-black text-white mt-2">{Number(battery.temperature_c).toFixed(1)}°C</div>
          <div className="text-[10px] text-[#7C9B8A] mt-1">{battery.health}</div>
        </div>

        <div className="p-3 rounded-2xl bg-[#08110F] border border-[#214235]">
          <div className="flex items-center gap-2 text-[#7C9B8A] text-[11px] font-bold"><Zap className="w-4 h-4" />Voltage</div>
          <div className="text-lg font-black text-white mt-2">{Number(battery.voltage_v).toFixed(2)} V</div>
        </div>

        <div className="p-3 rounded-2xl bg-[#08110F] border border-[#214235]">
          <div className="flex items-center gap-2 text-[#7C9B8A] text-[11px] font-bold"><Clock3 className="w-4 h-4" />Estimated</div>
          <div className="text-lg font-black text-white mt-2">{hours}h {minutes}m</div>
        </div>

        <div className="p-3 rounded-2xl bg-[#08110F] border border-[#214235]">
          <div className="flex items-center gap-2 text-[#7C9B8A] text-[11px] font-bold"><Activity className="w-4 h-4" />Screen today</div>
          <div className="text-lg font-black text-white mt-2">{battery.screen_on_time_minutes_today}m</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#7C9B8A]">
        <div className="flex items-center gap-2"><Power className="w-4 h-4" />Power saving: {battery.power_saving_mode ? 'ON' : 'OFF'}</div>
        <div>Updated {new Date(battery.last_updated).toLocaleTimeString()}</div>
      </div>
    </div>
  );
};
