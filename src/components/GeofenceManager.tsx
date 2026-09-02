import React, { useState, useEffect } from 'react';
import {
  Shield,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Bell,
  RefreshCw,
  Navigation,
  Compass,
  X,
  Save,
  Crosshair,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Geofence, LocationRecord, Consent } from '../types';
import { InteractiveMap } from './InteractiveMap';

interface GeofenceManagerProps {
  childId: number;
  childName: string;
  location: LocationRecord | null;
  consent: Consent | null;
  onGeofenceUpdated?: () => void;
}

interface EvaluationResult {
  child_id: number;
  evaluated_at: string;
  total_active_geofences: number;
  evaluations: Array<{
    geofence_id: number;
    name: string;
    category?: string;
    distance_meters: number;
    radius_meters: number;
    is_inside: boolean;
    is_breached: boolean;
    breach_reason: string;
  }>;
  has_breaches: boolean;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: string; defaultColor: string; defaultTrigger: 'exit' | 'enter' | 'both' }
> = {
  home: { label: 'Home Safezone', icon: '🏡', defaultColor: '#10B981', defaultTrigger: 'exit' },
  school: { label: 'School Campus', icon: '🏫', defaultColor: '#3B82F6', defaultTrigger: 'both' },
  safe_zone: { label: 'Safe Area', icon: '🛡️', defaultColor: '#10B981', defaultTrigger: 'exit' },
  danger_zone: { label: 'Restricted / Danger Zone', icon: '⛔', defaultColor: '#EF4444', defaultTrigger: 'enter' },
  activity: { label: 'Sports & Extracurricular', icon: '⚽', defaultColor: '#8B5CF6', defaultTrigger: 'both' },
  custom: { label: 'Custom Perimeter', icon: '📍', defaultColor: '#F59E0B', defaultTrigger: 'exit' },
};

const RADIUS_PRESETS = [100, 250, 500, 1000, 2000, 5000];

export const GeofenceManager: React.FC<GeofenceManagerProps> = ({
  childId = 1,
  childName = 'Rahul',
  location,
  consent,
  onGeofenceUpdated,
}) => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Editor Modal / Drawer State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null); // null = creating new

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('safe_zone');
  const [formLat, setFormLat] = useState<number>(location?.latitude || 28.6139);
  const [formLng, setFormLng] = useState<number>(location?.longitude || 77.2090);
  const [formRadius, setFormRadius] = useState<number>(300);
  const [formTrigger, setFormTrigger] = useState<'exit' | 'enter' | 'both'>('exit');
  const [formColor, setFormColor] = useState<string>('#10B981');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Fetch Geofences
  const fetchGeofences = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/geofences?child_id=${childId}`);
      if (res.ok) {
        const data = await res.json();
        setGeofences(data);
      }
    } catch (err) {
      console.error('Failed to load geofences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGeofences();
  }, [childId]);

  // Proximity Evaluation Trigger
  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch(`/api/geofences/evaluate/${childId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location?.latitude,
          longitude: location?.longitude,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
        if (data.has_breaches) {
          setStatusMessage({
            text: `⚠️ Breach detected! Child is outside safe perimeter or inside restricted area.`,
            type: 'error',
          });
        } else {
          setStatusMessage({
            text: `✅ Geofence check completed. All safezones intact.`,
            type: 'success',
          });
        }
      }
    } catch (err) {
      console.error('Failed to evaluate geofences:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Open Create Mode
  const handleOpenCreate = () => {
    const lat = location?.latitude || 28.6139;
    const lng = location?.longitude || 77.2090;
    setEditingId(null);
    setFormName('');
    setFormCategory('safe_zone');
    setFormLat(lat);
    setFormLng(lng);
    setFormRadius(300);
    setFormTrigger('exit');
    setFormColor('#10B981');
    setFormDescription('Safe perimeter around authorized location.');
    setFormIsActive(true);
    setIsEditing(true);
  };

  // Open Edit Mode
  const handleOpenEdit = (geo: Geofence) => {
    setEditingId(geo.id);
    setFormName(geo.name);
    setFormCategory(geo.category || 'safe_zone');
    setFormLat(geo.latitude);
    setFormLng(geo.longitude);
    setFormRadius(geo.radius_meters);
    setFormTrigger(geo.alert_trigger || 'exit');
    setFormColor(geo.color || '#10B981');
    setFormDescription(geo.description || '');
    setFormIsActive(geo.is_active);
    setIsEditing(true);
  };

  // Category Change helper to update default colors & triggers
  const handleCategoryChange = (category: string) => {
    setFormCategory(category);
    const config = CATEGORY_CONFIG[category];
    if (config) {
      setFormColor(config.defaultColor);
      setFormTrigger(config.defaultTrigger);
      if (!formName || formName.startsWith('New')) {
        setFormName(config.label);
      }
    }
  };

  // Save Geofence (Create or Update)
  const handleSaveGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setStatusMessage({ text: 'Please enter a name for the geofence.', type: 'error' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const payload = {
      child_id: childId,
      name: formName.trim(),
      category: formCategory,
      latitude: formLat,
      longitude: formLng,
      radius_meters: Number(formRadius),
      alert_trigger: formTrigger,
      color: formColor,
      description: formDescription,
      is_active: formIsActive,
    };

    try {
      const url = editingId ? `/api/geofences/${editingId}` : '/api/geofences';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatusMessage({
          text: editingId ? `Geofence "${formName}" updated successfully.` : `New geofence "${formName}" established.`,
          type: 'success',
        });
        setIsEditing(false);
        await fetchGeofences();
        if (onGeofenceUpdated) onGeofenceUpdated();
      } else {
        const data = await res.json();
        setStatusMessage({ text: data.detail || 'Failed to save geofence.', type: 'error' });
      }
    } catch (err) {
      console.error('Error saving geofence:', err);
      setStatusMessage({ text: 'Network error saving geofence.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Active State
  const handleToggleActive = async (id: number) => {
    try {
      const res = await fetch(`/api/geofences/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        await fetchGeofences();
        if (onGeofenceUpdated) onGeofenceUpdated();
      }
    } catch (err) {
      console.error('Error toggling geofence:', err);
    }
  };

  // Delete Geofence
  const handleDeleteGeofence = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the geofence "${name}"?`)) return;

    try {
      const res = await fetch(`/api/geofences/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMessage({ text: `Geofence "${name}" deleted.`, type: 'info' });
        await fetchGeofences();
        if (onGeofenceUpdated) onGeofenceUpdated();
      }
    } catch (err) {
      console.error('Error deleting geofence:', err);
    }
  };

  // Helper: Haversine distance calculator for UI
  const getDistanceToChild = (lat: number, lng: number) => {
    if (!location) return null;
    const R = 6371e3;
    const φ1 = (location.latitude * Math.PI) / 180;
    const φ2 = (lat * Math.PI) / 180;
    const Δφ = ((lat - location.latitude) * Math.PI) / 180;
    const Δλ = ((lng - location.longitude) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const activeCount = geofences.filter((g) => g.is_active).length;
  const safeCount = geofences.filter((g) => g.category !== 'danger_zone').length;
  const dangerCount = geofences.filter((g) => g.category === 'danger_zone').length;

  return (
    <div className="space-y-6">
      {/* HEADER & QUICK ACTION TOOLBAR */}
      <div className="p-6 rounded-3xl bg-[#10201B] border border-[#214235] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#162B24] text-[#B8F36B] border border-[#2C5142]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Geofencing & Safe Zones Studio</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {activeCount} ACTIVE
                </span>
              </h2>
              <p className="text-xs text-[#7C9B8A]">
                Draw boundary perimeters, configure radius triggers, and receive instant alert notifications when {childName} crosses safe zones.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={runEvaluation}
            disabled={isEvaluating || !location}
            className="px-3.5 py-2.5 rounded-xl bg-[#162B24] hover:bg-[#214235] text-white text-xs font-bold border border-[#2C5142] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin text-[#B8F36B]' : 'text-[#7C9B8A]'}`} />
            <span>{isEvaluating ? 'Evaluating...' : 'Check Proximity'}</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-[#B8F36B] hover:bg-[#a5e054] text-[#08110F] text-xs font-extrabold shadow-lg shadow-[#B8F36B]/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Safe Zone / Geofence</span>
          </button>
        </div>
      </div>

      {/* STATUS NOTIFICATION BANNER */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between transition-all ${
            statusMessage.type === 'error'
              ? 'bg-red-950/40 text-red-200 border-red-500/50'
              : statusMessage.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-200 border-emerald-500/50'
              : 'bg-[#162B24] text-white border-[#2C5142]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] space-y-1">
          <div className="text-[11px] font-bold text-[#7C9B8A] uppercase tracking-wider">Total Geofences</div>
          <div className="text-2xl font-black text-white font-mono">{geofences.length}</div>
          <div className="text-[10px] text-gray-400">{activeCount} monitored perimeters</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] space-y-1">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Safe Zones</div>
          <div className="text-2xl font-black text-white font-mono">{safeCount}</div>
          <div className="text-[10px] text-[#7C9B8A]">Home, School, Sports</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] space-y-1">
          <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Restricted Areas</div>
          <div className="text-2xl font-black text-white font-mono">{dangerCount}</div>
          <div className="text-[10px] text-gray-400">Triggers on Entry</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#10201B] border border-[#214235] space-y-1">
          <div className="text-[11px] font-bold text-[#62D8C2] uppercase tracking-wider">Child Location Status</div>
          <div className="text-sm font-black text-white font-mono truncate">
            {location ? `±${Math.round(location.accuracy)}m Lock` : 'Awaiting GPS'}
          </div>
          <div className="text-[10px] text-emerald-400">
            {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Offline'}
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: MAP + GEOFENCE LIST OR DRAFTING STUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 7 COLS: Interactive OpenStreetMap Studio */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-[#10201B] border border-[#214235] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#B8F36B]" />
                <h3 className="text-sm font-bold text-white">
                  {isEditing ? 'Interactive Radius & Perimeter Editor' : 'Live Geofence Radar'}
                </h3>
              </div>
              {isEditing && (
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  Click map or drag pin to move center
                </span>
              )}
            </div>

            <div className="h-[440px] rounded-2xl overflow-hidden relative">
              <InteractiveMap
                location={location}
                geofences={geofences}
                childName={childName}
                isEditingGeofence={isEditing}
                draftCenter={isEditing ? { lat: formLat, lng: formLng } : null}
                draftRadius={formRadius}
                draftColor={formColor}
                draftCategory={formCategory}
                onDraftCenterChange={(lat, lng) => {
                  setFormLat(lat);
                  setFormLng(lng);
                }}
                onSelectGeofence={(geo) => handleOpenEdit(geo)}
              />
            </div>

            {/* Quick Map Hints */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-[#7C9B8A] gap-2 pt-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Safe Zone
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> School
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Restricted Zone
                </span>
              </div>
              <span>Click on any circle to view distance & details</span>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: Configuration Drawer Form or Configured Zones List */}
        <div className="lg:col-span-5 space-y-4">
          {isEditing ? (
            /* CONFIGURATION FORM FOR CREATE / EDIT */
            <form
              onSubmit={handleSaveGeofence}
              className="p-5 rounded-3xl bg-[#10201B] border-2 border-[#B8F36B]/40 space-y-4 shadow-2xl relative animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#214235]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#B8F36B]" />
                  <h3 className="text-sm font-black text-white">
                    {editingId ? 'Edit Geofence Boundary' : 'Configure New Safe Zone'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#162B24]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Zone Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#7C9B8A]">Zone Label / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home Safezone, St. Mary School, City Library"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#08110F] border border-[#214235] text-white text-xs focus:outline-none focus:border-[#B8F36B]"
                />
              </div>

              {/* Category Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#7C9B8A]">Zone Archetype</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => handleCategoryChange(key)}
                      className={`p-2 rounded-xl text-left text-[11px] font-bold border transition-all flex flex-col gap-1 cursor-pointer ${
                        formCategory === key
                          ? 'bg-[#162B24] border-[#B8F36B] text-white'
                          : 'bg-[#08110F] border-[#214235] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <span>{config.icon}</span>
                      <span className="truncate">{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Radius Configuration & Sliders */}
              <div className="p-3.5 rounded-2xl bg-[#08110F] border border-[#214235] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Radius Meter Size:</span>
                    <span className="font-mono text-[#B8F36B] font-black text-sm">{formRadius} m</span>
                    <span className="text-[10px] text-gray-400">({(formRadius / 1000).toFixed(2)} km)</span>
                  </label>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="25"
                  value={formRadius}
                  onChange={(e) => setFormRadius(Number(e.target.value))}
                  className="w-full h-2 bg-[#162B24] rounded-lg appearance-none cursor-pointer accent-[#B8F36B]"
                />

                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {RADIUS_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setFormRadius(preset)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        formRadius === preset
                          ? 'bg-[#B8F36B] text-[#08110F] border-[#B8F36B]'
                          : 'bg-[#10201B] border-[#214235] text-gray-400 hover:text-white'
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000}km` : `${preset}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coordinates & Center Pin Helpers */}
              <div className="p-3 rounded-2xl bg-[#08110F] border border-[#214235] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#7C9B8A]">Center Coordinate</span>
                  {location && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormLat(location.latitude);
                        setFormLng(location.longitude);
                      }}
                      className="text-[10px] text-[#B8F36B] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>Use {childName}'s Current GPS</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-gray-500">Lat</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formLat}
                      onChange={(e) => setFormLat(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#10201B] border border-[#214235] text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Lng</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={formLng}
                      onChange={(e) => setFormLng(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#10201B] border border-[#214235] text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Alert Trigger Policy */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#7C9B8A] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#B8F36B]" />
                  <span>Notification Trigger Condition</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFormTrigger('exit')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      formTrigger === 'exit'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-[#08110F] border-[#214235] text-gray-400'
                    }`}
                  >
                    ⚠️ On Exit
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTrigger('enter')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      formTrigger === 'enter'
                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                        : 'bg-[#08110F] border-[#214235] text-gray-400'
                    }`}
                  >
                    🚨 On Enter
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTrigger('both')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      formTrigger === 'both'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-[#08110F] border-[#214235] text-gray-400'
                    }`}
                  >
                    🔄 Both
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#7C9B8A]">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Home neighborhood boundaries"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#08110F] border border-[#214235] text-white text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#162B24] hover:bg-[#214235] text-gray-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#B8F36B] hover:bg-[#a5e054] text-[#08110F] text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : editingId ? 'Update Zone' : 'Save Safe Zone'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* CONFIGURED GEOFENCES LIST */
            <div className="p-5 rounded-3xl bg-[#10201B] border border-[#214235] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Configured Zones</span>
                  <span className="text-xs font-mono text-[#7C9B8A]">({geofences.length})</span>
                </h3>
                <button
                  onClick={handleOpenCreate}
                  className="text-xs font-bold text-[#B8F36B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Zone</span>
                </button>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#7C9B8A] animate-pulse">Loading geofence perimeters...</div>
              ) : geofences.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#08110F] border border-[#214235] text-center space-y-3">
                  <Shield className="w-10 h-10 text-[#7C9B8A] mx-auto opacity-50" />
                  <p className="text-xs text-gray-300 font-bold">No Geofences Configured</p>
                  <p className="text-[11px] text-[#7C9B8A]">
                    Establish a safezone around home, school, or dangerous areas to receive instant entry/exit alerts.
                  </p>
                  <button
                    onClick={handleOpenCreate}
                    className="px-4 py-2 rounded-xl bg-[#B8F36B] text-[#08110F] text-xs font-bold"
                  >
                    Create First Geofence
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {geofences.map((geo) => {
                    const dist = getDistanceToChild(geo.latitude, geo.longitude);
                    const isInside = dist !== null && dist <= geo.radius_meters;
                    const isDanger = geo.category === 'danger_zone';

                    return (
                      <div
                        key={geo.id}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                          !geo.is_active
                            ? 'bg-[#08110F]/60 border-[#214235]/60 opacity-60'
                            : isDanger
                            ? 'bg-[#180e0e] border-red-900/40 hover:border-red-500/50'
                            : 'bg-[#08110F] border-[#214235] hover:border-[#B8F36B]/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">
                                {CATEGORY_CONFIG[geo.category || 'safe_zone']?.icon || '🛡️'}
                              </span>
                              <span className="font-bold text-white text-xs">{geo.name}</span>
                            </div>
                            <p className="text-[11px] text-[#7C9B8A] line-clamp-1">{geo.description || 'Configured perimeter'}</p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleActive(geo.id)}
                              title={geo.is_active ? 'Pause monitoring' : 'Activate zone'}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                geo.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-gray-800 text-gray-400 border-gray-700'
                              }`}
                            >
                              {geo.is_active ? 'Active' : 'Paused'}
                            </button>
                            <button
                              onClick={() => handleOpenEdit(geo)}
                              title="Edit zone"
                              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#162B24] cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteGeofence(geo.id, geo.name)}
                              title="Delete zone"
                              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Metric bar */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#214235] font-mono">
                          <div className="text-gray-400">
                            <span>Radius: </span>
                            <span className="text-white font-bold">{geo.radius_meters}m</span>
                          </div>

                          {dist !== null && (
                            <div
                              className={`font-bold flex items-center gap-1 ${
                                isDanger
                                  ? isInside
                                    ? 'text-red-400 animate-pulse'
                                    : 'text-gray-400'
                                  : isInside
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              <span>{isInside ? '📍 INSIDE' : 'OUTSIDE'}</span>
                              <span className="text-[10px] text-gray-400">({dist}m from center)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
