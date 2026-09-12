import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { DEMO_DESTINATIONS, ACCESSIBILITY_PROFILES } from '../data/mockData';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { normalizeCoordinatesList } from '../utils/geoUtils';
import {
  Play,
  Square,
  Camera,
  AlertTriangle,
  ChevronDown,
  Navigation as NavIcon,
  Layers,
  Search
} from 'lucide-react';

// Leaflet Map Resizer to ensure tiles render immediately when tab switches
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
}

// Dynamically fit map bounds to route & markers
function MapBoundsUpdater({ originCoords, destCoords, accessibleCoords, directCoords, barrierList }) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    if (originCoords?.lat && originCoords?.lng) {
      points.push([originCoords.lat, originCoords.lng]);
    }
    if (destCoords?.lat && destCoords?.lng) {
      points.push([destCoords.lat, destCoords.lng]);
    }

    if (accessibleCoords && Array.isArray(accessibleCoords) && accessibleCoords.length > 0) {
      accessibleCoords.forEach(p => {
        if (Array.isArray(p) && p.length >= 2) {
          points.push(p);
        }
      });
    }

    if (directCoords && Array.isArray(directCoords) && directCoords.length > 0) {
      directCoords.forEach(p => {
        if (Array.isArray(p) && p.length >= 2) {
          points.push(p);
        }
      });
    }

    if (barrierList && barrierList.length > 0) {
      barrierList.forEach(b => {
        const bLat = Number(b.coordinates?.lat ?? b.latitude);
        const bLng = Number(b.coordinates?.lng ?? b.longitude);
        if (!isNaN(bLat) && !isNaN(bLng)) {
          points.push([bLat, bLng]);
        }
      });
    }

    if (points.length > 0) {
      try {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: true });
      } catch (e) {
        console.warn('[Map] Fit bounds warning:', e);
      }
    }
  }, [originCoords, destCoords, accessibleCoords, directCoords, barrierList, map]);

  return null;
}

// Leaflet DivIcon helper
const createDivIcon = (htmlContent, size = [36, 36]) => {
  return L.divIcon({
    html: htmlContent,
    className: 'custom-div-icon',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2]
  });
};

export default function MapPage() {
  const {
    origin,
    destination,
    setDestination,
    routes,
    barriers,
    selectedProfile,
    selectedProfileId,
    handleSelectProfile,
    setCurrentStep,
    isNavSimulating,
    userLocation,
    gpsAccuracy,
    locationError,
    startGpsGuidance,
    stopGpsGuidance,
    setIsNavSimulating,
    currentSimSegment,
    triggerHaptic,
    showVisualToast,
    isCalculatingRoute,
    isHapticVibrating
  } = useNavigation();

  const [activeRouteView, setActiveRouteView] = useState('accessible'); // 'accessible' | 'fastest'
  const [destPickerOpen, setDestPickerOpen] = useState(false);

  const startLat = origin.coordinates?.lat || 15.4910;
  const startLng = origin.coordinates?.lng || 73.8260;
  const destLat = destination.coordinates?.lat || 15.4950;
  const destLng = destination.coordinates?.lng || 73.8310;

  // Real backend route coordinates
  const accessibleRouteCoords = routes?.accessible?.coordinates && routes.accessible.coordinates.length >= 2
    ? normalizeCoordinatesList(routes.accessible.coordinates)
    : [
      [startLat, startLng],
      [destLat, destLng]
    ];

  const directRouteCoords = routes?.fastest?.coordinates && routes.fastest.coordinates.length >= 2
    ? normalizeCoordinatesList(routes.fastest.coordinates)
    : [
      [startLat, startLng],
      [destLat, destLng]
    ];

  // Live simulation position
  const simPositions = accessibleRouteCoords.length > 0 ? accessibleRouteCoords : [[startLat, startLng], [destLat, destLng]];
  const userLivePos = simPositions[Math.min(currentSimSegment, simPositions.length - 1)];

  // Clean Markers
  const startIcon = createDivIcon(
    `<div class="inline-flex items-center gap-1 bg-emerald-600 border-2 border-white text-white px-2.5 py-1 rounded-full shadow-lg font-bold text-xs whitespace-nowrap">
      <span>📍 Start</span>
    </div>`,
    [70, 26]
  );

  const destIcon = createDivIcon(
    `<div class="inline-flex items-center gap-1 bg-cyan-600 border-2 border-white text-white px-2.5 py-1 rounded-full shadow-lg font-bold text-xs whitespace-nowrap">
      <span>🎯 Destination</span>
    </div>`,
    [100, 26]
  );

  const obstacleIcon = createDivIcon(
    `<div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
      ⚠️
    </div>`,
    [32, 32]
  );

  const userLiveIcon = createDivIcon(
    `<div class="relative flex items-center justify-center">
      <div class="w-8 h-8 rounded-full bg-emerald-500/30 animate-ping absolute"></div>
      <div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xl relative z-10"></div>
    </div>`,
    [32, 32]
  );

  const handleDestinationChange = (d) => {
    setDestination(d);
    setDestPickerOpen(false);
    triggerHaptic([40]);
  };

  return (
    <div className="relative w-full h-[calc(100vh-130px)] min-h-[520px] flex flex-col overflow-hidden bg-slate-950 font-sans">

      {/* 1. Clean App Header with Profile Toggle (Wheelchair / Deaf) */}
      <header className="p-3 bg-slate-900/95 border-b border-slate-800 z-[1000] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-sm font-black">
            R
          </div>
          <h1 className="text-base font-extrabold text-white tracking-tight">RAASTA</h1>
        </div>

        {/* Profile Switcher (MVP: Wheelchair / Deaf) */}
        <div className="flex items-center gap-1.5">
          <div className="p-0.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => handleSelectProfile('wheelchair')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${selectedProfileId === 'wheelchair'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <span>♿</span>
              <span className="hidden sm:inline">Wheelchair</span>
            </button>
            <button
              onClick={() => handleSelectProfile('deaf')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${selectedProfileId === 'deaf'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              <span>🦻</span>
              <span className="hidden sm:inline">Deaf</span>
            </button>
          </div>

          {/* Quick Report Barrier Button */}
          <button
            onClick={() => {
              setCurrentStep('report');
              triggerHaptic([50]);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 text-xs font-bold flex items-center gap-1 touch-active"
            title="Report Obstacle"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[11px]">Report</span>
          </button>
        </div>
      </header>

      {/* 2. Destination Selector Bar */}
      <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 z-[999] relative flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setDestPickerOpen(!destPickerOpen)}
            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-slate-600 text-left flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="truncate">
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Destination</div>
                <div className="text-xs font-bold text-white truncate">{destination.name}</div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${destPickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Destination Dropdown */}
          {destPickerOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 p-1.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-[1001] space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Select Destination</div>
              {DEMO_DESTINATIONS.map(d => (
                <button
                  key={d.id}
                  onClick={() => handleDestinationChange(d)}
                  className={`w-full p-2 rounded-xl text-left flex items-center justify-between text-xs font-medium transition-all ${destination.id === d.id
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'hover:bg-slate-800 text-slate-300'
                    }`}
                >
                  <span className="truncate">{d.name}</span>
                  <span className="text-[10px] opacity-75">{d.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Real OpenStreetMap Leaflet Map (Centerpiece) */}
      <div className="w-full flex-1 relative bg-slate-900 z-0 min-h-[300px]">
        <MapContainer
          center={[startLat, startLng]}
          zoom={16}
          scrollWheelZoom={true}
          zoomControl={true}
          style={{ width: '100%', height: '100%', minHeight: '300px' }}
          className="w-full h-full"
        >
          {/* Real OpenStreetMap Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Map resizer to ensure tiles render immediately */}
          <MapResizer />

          {/* Dynamic Auto Bounds to fit start, destination, and calculated routes */}
          <MapBoundsUpdater
            originCoords={{ lat: startLat, lng: startLng }}
            destCoords={{ lat: destLat, lng: destLng }}
            accessibleCoords={accessibleRouteCoords}
            directCoords={directRouteCoords}
            barrierList={barriers}
          />

          {/* Blocked Direct Route (Red dashed when rerouted) */}
          {routes?.fastest?.isBlocked && (
            <Polyline
              positions={directRouteCoords}
              pathOptions={{
                color: '#ef4444',
                weight: 4,
                dashArray: '6, 6',
                opacity: 0.8
              }}
            />
          )}

          {/* Accessible Step-Free Route (Green) */}
          <Polyline
            positions={accessibleRouteCoords}
            pathOptions={{
              color: '#10b981',
              weight: 6,
              opacity: 0.95
            }}
          />

          {/* Origin Marker */}
          <Marker position={[startLat, startLng]} icon={startIcon}>
            <Popup>
              <div className="text-xs font-bold text-slate-900">
                <div>📍 Start: {origin.name}</div>
                <div className="text-[10px] text-slate-600 font-normal">Step-free departure point</div>
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker */}
          <Marker position={[destLat, destLng]} icon={destIcon}>
            <Popup>
              <div className="text-xs font-bold text-slate-900">
                <div>🎯 {destination.name}</div>
                <div className="text-[10px] text-slate-600 font-normal">{destination.address}</div>
              </div>
            </Popup>
          </Marker>

          {/* Real Blockage Markers from Backend */}
          {barriers.map((b, idx) => {
            const bLat = Number(b.coordinates?.lat ?? b.latitude);
            const bLng = Number(b.coordinates?.lng ?? b.longitude);
            if (isNaN(bLat) || isNaN(bLng)) return null;

            return (
              <Marker key={b.id || `barrier-${idx}`} position={[bLat, bLng]} icon={obstacleIcon}>
                <Popup>
                  <div className="p-1 text-slate-900">
                    <div className="text-xs font-bold flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{b.title || 'Reported Obstacle'}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 mt-0.5">{b.description || 'Stairs blocking sidewalk'}</div>
                    <div className="text-[10px] font-semibold text-rose-600 mt-1 uppercase">
                      Severity: {b.severity || 'High'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Live Walking Simulation Marker */}
          {isNavSimulating && (
            <Marker position={userLivePos} icon={userLiveIcon}>
              <Popup>
                <div className="text-xs font-bold text-slate-900">Your Current Position</div>
              </Popup>
            </Marker>
          )}

        </MapContainer>

        {/* Loading Overlay */}
        {isCalculatingRoute && (
          <div className="absolute top-3 left-3 right-3 z-[1000] p-3 rounded-xl bg-slate-900/95 border border-emerald-500/60 shadow-xl flex items-center gap-3 animate-fade-in">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="text-xs font-bold text-white">Calculating safest accessible route...</div>
          </div>
        )}
      </div>

      {/* 4. Bottom Route & Accessibility Status Panel */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800 space-y-2.5 z-[1000]">

        {/* Backend Alert / Reroute Notification */}
        {routes?.accessible?.rerouted && (
          <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/70 text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 leading-snug">
              <span className="font-bold text-amber-300">Blockage detected: </span>
              <span>{routes.accessible.alerts?.[0]?.message || 'Stairs blocking direct pathway.'} </span>
              <span className="text-emerald-400 font-bold">✓ Alternative route active.</span>
            </div>
          </div>
        )}

        {/* Deaf Mode Visual Alert Pill */}
        {selectedProfileId === 'deaf' && (
          <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/70 text-cyan-200 text-xs flex items-center gap-2">
            <span className="text-base">🦻</span>
            <div className="truncate">
              <span className="font-bold text-cyan-300">Crosswalk ahead: </span>
              <span>Walk signal active</span>
            </div>
          </div>
        )}

        {/* Route Stats & Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <span>♿</span>
              <span>{routes?.accessible?.rerouted ? 'Alternative Route' : 'Accessible Route'}</span>
            </div>
            <div className="text-sm font-extrabold text-white">
              {routes?.accessible?.distanceMeters ? `${routes.accessible.distanceMeters} m` : 'Calculating...'}
              {routes?.accessible?.durationMinutes ? ` • ${routes.accessible.durationMinutes} min` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Start Walk Simulation */}
            <button
              onClick={() => {
                if (isNavSimulating) {
                  stopGpsGuidance();
                } else {
                  startGpsGuidance();
                }
              }}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 touch-active transition-all ${isNavSimulating
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                }`}
            >
              {isNavSimulating ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Guidance</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
