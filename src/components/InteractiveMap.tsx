import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Geofence, LocationRecord } from '../types';

interface InteractiveMapProps {
  location: LocationRecord | null;
  geofences?: Geofence[];
  childName?: string;
  isSosMode?: boolean;
  routePoints?: Array<{ lat: number; lng: number; timestamp: string }>;
  onMapClick?: (lat: number, lng: number) => void;
  // Geofence Drafting & Editing Mode
  isEditingGeofence?: boolean;
  draftCenter?: { lat: number; lng: number } | null;
  draftRadius?: number;
  draftColor?: string;
  draftCategory?: string;
  onDraftCenterChange?: (lat: number, lng: number) => void;
  onSelectGeofence?: (geofence: Geofence) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  location,
  geofences = [],
  childName = 'Rahul',
  isSosMode = false,
  routePoints = [],
  onMapClick,
  isEditingGeofence = false,
  draftCenter = null,
  draftRadius = 300,
  draftColor = '#10B981',
  draftCategory = 'safe_zone',
  onDraftCenterChange,
  onSelectGeofence,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const geofenceLayersRef = useRef<L.LayerGroup | null>(null);
  const draftLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const draftMarkerRef = useRef<L.Marker | null>(null);
  const draftCircleRef = useRef<L.Circle | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = location?.latitude ?? 28.6139;
    const initialLng = location?.longitude ?? 77.2090;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: true,
    });

    // CartoDB Voyager / Clean High-Contrast Vector Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const geofenceGroup = L.layerGroup().addTo(map);
    geofenceLayersRef.current = geofenceGroup;

    const draftGroup = L.layerGroup().addTo(map);
    draftLayerRef.current = draftGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onDraftCenterChange) {
        onDraftCenterChange(e.latlng.lat, e.latlng.lng);
      }
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Child Location Marker, Accuracy Circle & Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !location) return;

    const latLng: [number, number] = [location.latitude, location.longitude];

    // Custom Child Marker with pulsing ring
    const customIcon = L.divIcon({
      className: 'custom-child-marker',
      html: isSosMode
        ? `
        <div class="relative flex items-center justify-center w-12 h-12 -ml-6 -mt-6">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80"></span>
          <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-red-600 border-2 border-white shadow-2xl text-white font-black text-sm">
            🚨
          </div>
        </div>
      `
        : `
        <div class="relative flex items-center justify-center w-10 h-10 -ml-5 -mt-5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
          <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500 border-2 border-white shadow-xl text-black font-extrabold text-xs">
            👦
          </div>
        </div>
      `,
      iconSize: isSosMode ? [48, 48] : [40, 40],
      iconAnchor: isSosMode ? [24, 24] : [20, 20],
    });

    if (!markerRef.current) {
      const marker = L.marker(latLng, { icon: customIcon, zIndexOffset: 1000 }).addTo(map);
      marker.bindPopup(`
        <div class="p-1 font-sans text-xs">
          <div class="font-bold ${isSosMode ? 'text-red-600' : 'text-gray-900'} text-sm">
            ${isSosMode ? '🚨 EMERGENCY SOS' : childName}
          </div>
          <div class="text-gray-600 mt-1">Lat: ${location.latitude.toFixed(6)}</div>
          <div class="text-gray-600">Lng: ${location.longitude.toFixed(6)}</div>
          <div class="text-emerald-600 font-semibold mt-1">Accuracy: ±${Math.round(location.accuracy)}m</div>
          <div class="text-gray-400 text-[10px] mt-1">${new Date(location.created_at).toLocaleTimeString()}</div>
        </div>
      `);
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(latLng);
      markerRef.current.setIcon(customIcon);
    }

    // Accuracy Circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(latLng);
      accuracyCircleRef.current.setRadius(location.accuracy || 15);
      accuracyCircleRef.current.setStyle({
        color: isSosMode ? '#EF4444' : '#10B981',
        fillColor: isSosMode ? '#EF4444' : '#10B981',
      });
    } else {
      accuracyCircleRef.current = L.circle(latLng, {
        radius: location.accuracy || 15,
        color: isSosMode ? '#EF4444' : '#10B981',
        fillColor: isSosMode ? '#EF4444' : '#10B981',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map);
    }

    // Route Polyline (Draw historical trace during SOS or tracking)
    if (routePoints.length > 1) {
      const latLngs: [number, number][] = routePoints.map((p) => [p.lat, p.lng]);
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(latLngs);
      } else {
        routePolylineRef.current = L.polyline(latLngs, {
          color: isSosMode ? '#EF4444' : '#3B82F6',
          weight: 4,
          opacity: 0.85,
          dashArray: isSosMode ? '6, 6' : undefined,
        }).addTo(map);
      }
    }

    if (!isEditingGeofence) {
      map.panTo(latLng, { animate: true });
    }
  }, [location, childName, isSosMode, routePoints, isEditingGeofence]);

  // Update Configured Geofence Layers
  useEffect(() => {
    const geofenceGroup = geofenceLayersRef.current;
    if (!geofenceGroup) return;

    geofenceGroup.clearLayers();

    geofences.forEach((geo) => {
      const zoneColor =
        geo.color ||
        (geo.category === 'danger_zone'
          ? '#EF4444'
          : geo.category === 'school'
          ? '#3B82F6'
          : geo.category === 'activity'
          ? '#8B5CF6'
          : '#10B981');

      const isDanger = geo.category === 'danger_zone';

      const circle = L.circle([geo.latitude, geo.longitude], {
        radius: geo.radius_meters,
        color: zoneColor,
        fillColor: zoneColor,
        fillOpacity: geo.is_active ? 0.15 : 0.04,
        weight: geo.is_active ? 2.5 : 1,
        dashArray: geo.is_active ? '5, 6' : '3, 6',
      });

      // Calculate distance to child if known
      let distanceText = '';
      if (location) {
        const R = 6371e3;
        const φ1 = (location.latitude * Math.PI) / 180;
        const φ2 = (geo.latitude * Math.PI) / 180;
        const Δφ = ((geo.latitude - location.latitude) * Math.PI) / 180;
        const Δλ = ((geo.longitude - location.longitude) * Math.PI) / 180;
        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = Math.round(R * c);
        const isInside = dist <= geo.radius_meters;
        distanceText = `
          <div class="mt-1.5 pt-1.5 border-t border-gray-200 text-[11px]">
            <span class="font-bold ${isInside ? 'text-emerald-700' : 'text-gray-700'}">
              ${isInside ? '📍 Child is INSIDE perimeter' : `📏 ${dist}m away from center`}
            </span>
          </div>
        `;
      }

      circle.bindPopup(`
        <div class="p-1 font-sans text-xs min-w-[180px]">
          <div class="flex items-center gap-1.5 font-bold ${isDanger ? 'text-red-700' : 'text-gray-900'} text-sm">
            <span>${isDanger ? '⛔' : '🛡️'}</span>
            <span>${geo.name}</span>
          </div>
          <div class="text-gray-600 mt-1 flex justify-between">
            <span>Radius:</span>
            <span class="font-mono font-bold">${geo.radius_meters} m</span>
          </div>
          <div class="text-gray-600 flex justify-between">
            <span>Trigger:</span>
            <span class="font-semibold capitalize">${geo.alert_trigger || 'exit'} alert</span>
          </div>
          <div class="text-gray-600 flex justify-between">
            <span>Status:</span>
            <span class="font-bold ${geo.is_active ? 'text-emerald-600' : 'text-gray-400'}">
              ${geo.is_active ? 'Active' : 'Paused'}
            </span>
          </div>
          ${distanceText}
        </div>
      `);

      circle.on('click', () => {
        if (onSelectGeofence) {
          onSelectGeofence(geo);
        }
      });

      circle.addTo(geofenceGroup);
    });
  }, [geofences, location, onSelectGeofence]);

  // Handle Draft / Live Editing Geofence
  useEffect(() => {
    const draftGroup = draftLayerRef.current;
    const map = mapInstanceRef.current;
    if (!draftGroup || !map) return;

    draftGroup.clearLayers();

    if (!isEditingGeofence || !draftCenter) {
      draftMarkerRef.current = null;
      draftCircleRef.current = null;
      return;
    }

    const centerLatLng: [number, number] = [draftCenter.lat, draftCenter.lng];

    // Draggable Pin Marker
    const editPinIcon = L.divIcon({
      className: 'custom-edit-pin',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10 -ml-5 -mt-5 cursor-grab">
          <div class="w-8 h-8 rounded-full bg-white border-2 shadow-2xl flex items-center justify-center text-sm font-bold animate-bounce" style="border-color: ${draftColor}; color: ${draftColor};">
            🎯
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const editMarker = L.marker(centerLatLng, {
      icon: editPinIcon,
      draggable: true,
      zIndexOffset: 2000,
    }).addTo(draftGroup);

    editMarker.on('dragend', (e) => {
      const target = e.target as L.Marker;
      const newPos = target.getLatLng();
      if (onDraftCenterChange) {
        onDraftCenterChange(newPos.lat, newPos.lng);
      }
    });

    draftMarkerRef.current = editMarker;

    // Interactive Preview Circle with active pulse stroke
    const editCircle = L.circle(centerLatLng, {
      radius: draftRadius,
      color: draftColor,
      fillColor: draftColor,
      fillOpacity: 0.22,
      weight: 3,
      dashArray: '8, 8',
    }).addTo(draftGroup);

    editCircle.bindTooltip(`Radius: ${draftRadius}m (Drag pin or click map to move)`, {
      permanent: true,
      direction: 'top',
      className: 'geofence-draft-tooltip',
    });

    draftCircleRef.current = editCircle;

    map.panTo(centerLatLng, { animate: true });
  }, [isEditingGeofence, draftCenter, draftRadius, draftColor, draftCategory, onDraftCenterChange]);

  const handleRecenterChild = () => {
    if (mapInstanceRef.current && location) {
      mapInstanceRef.current.setView([location.latitude, location.longitude], 16, { animate: true });
    }
  };

  const handleFitGeofences = () => {
    if (!mapInstanceRef.current || geofences.length === 0) return;
    const bounds = L.latLngBounds(geofences.map((g) => [g.latitude, g.longitude]));
    if (location) bounds.extend([location.latitude, location.longitude]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], animate: true });
  };

  return (
    <div className={`relative w-full h-full min-h-[360px] rounded-2xl overflow-hidden border ${
      isSosMode ? 'border-red-500/80 shadow-red-500/30' : isEditingGeofence ? 'border-amber-500/80 ring-2 ring-amber-500/30' : 'border-[#214235]'
    } bg-[#10201B]`}>
      <div ref={mapContainerRef} className="w-full h-full min-h-[360px]" />

      {/* Top Banner Status */}
      <div className={`absolute top-3 right-3 z-[1000] backdrop-blur-md px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 shadow-lg ${
        isSosMode
          ? 'bg-red-950/90 text-red-200 border-red-500/50'
          : isEditingGeofence
          ? 'bg-amber-950/90 text-amber-300 border-amber-500/50 animate-pulse'
          : 'bg-[#08110F]/90 text-[#B8F36B] border-[#214235]'
      }`}>
        <span className={`w-2 h-2 rounded-full ${
          isSosMode ? 'bg-red-500 animate-ping' : isEditingGeofence ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
        }`}></span>
        <span>
          {isSosMode
            ? '🚨 HIGH-FREQUENCY SOS GPS STREAM'
            : isEditingGeofence
            ? '✏️ Geofence Radius Drafting Mode'
            : 'Live GPS & Geofence Engine'}
        </span>
      </div>

      {/* Quick Map Controls Floating Panel */}
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-1.5 bg-[#08110F]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#214235] shadow-xl text-xs">
        <button
          onClick={handleRecenterChild}
          title="Recenter on Child Location"
          className="px-2.5 py-1.5 rounded-lg bg-[#162B24] hover:bg-[#214235] text-[#B8F36B] font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-[#2C5142]"
        >
          <span>🎯</span>
          <span>Center Child</span>
        </button>

        {geofences.length > 0 && (
          <button
            onClick={handleFitGeofences}
            title="Fit All Geofences in View"
            className="px-2.5 py-1.5 rounded-lg bg-[#162B24] hover:bg-[#214235] text-blue-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-[#2C5142]"
          >
            <span>🛡️</span>
            <span>View All Zones ({geofences.length})</span>
          </button>
        )}
      </div>
    </div>
  );
};

