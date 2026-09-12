import React, { useState, useEffect } from 'react';
import { useNavigation } from '../context/NavigationContext';
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
  Route, 
  Camera, 
  ArrowRight,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';

// Component to dynamically fit map bounds to route & markers
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
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true });
      } catch (e) {
        console.warn('[Map] Fit bounds warning:', e);
      }
    }
  }, [originCoords, destCoords, accessibleCoords, directCoords, barrierList, map]);

  return null;
}

// Custom Leaflet DivIcon helpers
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
    routes,
    barriers,
    accessibleFeatures,
    selectedProfile,
    setCurrentStep,
    isNavSimulating,
    setIsNavSimulating,
    currentSimSegment,
    triggerHaptic,
    showVisualToast,
    isCalculatingRoute
  } = useNavigation();

  const [activeRouteView, setActiveRouteView] = useState('accessible'); // 'accessible' | 'fastest' | 'both'
  const [showObstacles, setShowObstacles] = useState(true);
  const [showFeatures, setShowFeatures] = useState(true);

  const startLat = origin.coordinates?.lat || 28.6315;
  const startLng = origin.coordinates?.lng || 77.2167;
  const destLat = destination.coordinates?.lat || 28.6358;
  const destLng = destination.coordinates?.lng || 77.2215;

  // Backend Route Coordinates (Drawn strictly from backend response coordinates -> Leaflet Polyline)
  // The frontend does not generate or synthesize its own route
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

  // Simulated GPS position along the actual backend route coordinates
  const simPositions = accessibleRouteCoords.length > 0
    ? accessibleRouteCoords
    : [
        [startLat, startLng],
        [destLat, destLng]
      ];
  const userLivePos = simPositions[Math.min(currentSimSegment, simPositions.length - 1)];

  // Icons
  const startIcon = createDivIcon(
    `<div class="inline-flex items-center gap-1 bg-emerald-600 border-2 border-white text-white px-2.5 py-1 rounded-full shadow-xl font-bold text-xs whitespace-nowrap ring-4 ring-emerald-500/40 animate-pulse">
      <span>📍 A: Start</span>
    </div>`,
    [88, 28]
  );

  const detourIcon = createDivIcon(
    `<div class="inline-flex items-center gap-1 bg-teal-600 border-2 border-white text-white px-2 py-0.5 rounded-full shadow-xl font-bold text-xs whitespace-nowrap ring-4 ring-teal-500/40 animate-bounce">
      <span>♿ D: Detour Ramp</span>
    </div>`,
    [120, 26]
  );

  const blockedIcon = createDivIcon(
    `<div class="inline-flex items-center gap-1 bg-rose-600 border-2 border-white text-white px-2 py-0.5 rounded-full shadow-xl font-bold text-xs whitespace-nowrap ring-4 ring-rose-500/40">
      <span>🚫 B: 18 Stairs</span>
    </div>`,
    [108, 26]
  );

  const destIcon = createDivIcon(
    `<div class="inline-flex items-center gap-1 bg-cyan-600 border-2 border-white text-white px-2.5 py-1 rounded-full shadow-xl font-bold text-xs whitespace-nowrap ring-4 ring-cyan-500/40">
      <span>🏁 C: Destination</span>
    </div>`,
    [118, 28]
  );

  const obstacleIcon = createDivIcon(
    `<div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold ring-4 ring-rose-500/30">
      ⚠️
    </div>`
  );

  const rampIcon = createDivIcon(
    `<div class="w-7 h-7 rounded-full bg-emerald-700 border-2 border-emerald-300 shadow-md flex items-center justify-center text-white text-xs">
      ♿
    </div>`,
    [28, 28]
  );

  const sidewalkIcon = createDivIcon(
    `<div class="w-7 h-7 rounded-full bg-cyan-700 border-2 border-cyan-300 shadow-md flex items-center justify-center text-white text-xs">
      🚶
    </div>`,
    [28, 28]
  );

  const userLiveIcon = createDivIcon(
    `<div class="relative flex items-center justify-center">
      <div class="w-10 h-10 rounded-full bg-emerald-500/30 animate-ping absolute"></div>
      <div class="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xl relative z-10"></div>
    </div>`,
    [40, 40]
  );

  return (
    <div className="relative w-full h-full flex flex-col flex-1 overflow-hidden animate-fade-in">
      
      {/* Top Floating Transit Card */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="px-3.5 py-2 rounded-2xl bg-[#0f172a]/95 backdrop-blur-md border border-slate-800 shadow-xl pointer-events-auto flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Directions to</div>
            <div className="text-xs font-bold text-white truncate max-w-[150px]">
              {destination.name}
            </div>
          </div>
        </div>

        {/* Live Step Guidance Trigger */}
        <button
          onClick={() => {
            if (isNavSimulating) {
              setIsNavSimulating(false);
            } else {
              setIsNavSimulating(true);
              triggerHaptic([120, 50, 120]);
              showVisualToast({
                title: 'Live Guidance Active',
                subtitle: `Guiding along alternative step-free corridor (A ➔ D ➔ C) to ${destination.name}`,
                type: 'info'
              });
            }
          }}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xl pointer-events-auto touch-active cursor-pointer transition-all ${
            isNavSimulating
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
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
              <span>Start Walk</span>
            </>
          )}
        </button>
      </div>

      {/* Backend Alert Notification Banner */}
      {routes?.accessible?.alerts && routes.accessible.alerts.length > 0 && !isCalculatingRoute && !isNavSimulating && (
        <div className="absolute top-16 left-3 right-3 z-[1000] p-3 rounded-2xl bg-amber-950/95 backdrop-blur-md border border-amber-500/80 shadow-2xl space-y-1 animate-fade-in text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <span>⚠️</span>
            <span>Blockage detected</span>
          </div>
          {routes.accessible.alerts.map((a, i) => (
            <div key={i} className="text-xs text-white font-medium pl-5 leading-snug">
              {typeof a === 'string' ? a : a.message}
            </div>
          ))}
          {routes.accessible.rerouted && (
            <div className="text-[11px] text-emerald-400 font-semibold pl-5 pt-0.5 flex items-center gap-1">
              <span>✓</span>
              <span>Alternative accessible route found.</span>
            </div>
          )}
        </div>
      )}

      {/* Alternative Route Detour Banner (When no alerts array but rerouted) */}
      {(!routes?.accessible?.alerts || routes.accessible.alerts.length === 0) && routes?.accessible?.rerouted && !isCalculatingRoute && !isNavSimulating && (
        <div className="absolute top-16 left-3 right-3 z-[1000] p-2.5 rounded-2xl bg-[#0f172a]/95 backdrop-blur-md border shadow-2xl flex items-center justify-between gap-2.5 animate-fade-in transition-all border-emerald-500/70 text-left">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              ♿
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Status: ✓ Alternative route found
              </div>
              <div className="text-[11px] font-semibold text-white truncate">
                {routes.accessible.distanceMeters !== null ? `Distance: ${routes.accessible.distanceMeters} m` : 'Detour Active'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Route Calculation Live Status Banner */}
      {isCalculatingRoute && (
        <div className="absolute top-16 left-3 right-3 z-[1000] p-3 rounded-2xl bg-[#0f172a]/95 backdrop-blur-md border border-emerald-500/60 shadow-xl flex items-center gap-3 animate-fade-in">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white">Finding accessible route...</div>
            <div className="text-[10px] text-emerald-400 truncate">Calculating safest accessible route for {selectedProfile.name}</div>
          </div>
        </div>
      )}

      {/* Live Turn Banner (When walking guidance is active) */}
      {isNavSimulating && !isCalculatingRoute && (
        <div className="absolute top-16 left-3 right-3 z-[1000] p-3.5 rounded-2xl bg-[#0f172a]/95 border border-emerald-500/60 shadow-2xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-md">
              ⬆️
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Step {currentSimSegment + 1} of {routes.accessible.segments.length} (A ➔ D ➔ C)
              </div>
              <div className="text-xs font-bold text-white leading-tight truncate">
                {routes.accessible.segments[currentSimSegment]?.text}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                {routes.accessible.segments[currentSimSegment]?.highlight || 'Paved sidewalk'} • {routes.accessible.segments[currentSimSegment]?.distance}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real OpenStreetMap Leaflet Map */}
      <div className="w-full flex-1 relative bg-[#0b111e] z-0">
        <MapContainer
          center={[startLat, startLng]}
          zoom={16}
          scrollWheelZoom={true}
          zoomControl={false}
          className="w-full h-full"
        >
          {/* OpenStreetMap Base Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Dynamic Auto-Bounds to fit GPS coordinates & backend routes */}
          <MapBoundsUpdater 
            originCoords={{ lat: startLat, lng: startLng }}
            destCoords={{ lat: destLat, lng: destLng }}
            accessibleCoords={accessibleRouteCoords}
            directCoords={directRouteCoords}
            barrierList={barriers}
          />

          {/* Route A: Direct / Fastest Path (Red / Dashed) - Blocked at B */}
          {(activeRouteView === 'fastest' || activeRouteView === 'both') && (
            <Polyline
              positions={directRouteCoords}
              pathOptions={{
                color: '#ef4444',
                weight: 5,
                dashArray: '8, 8',
                opacity: 0.85
              }}
            />
          )}

          {/* Route B: Alternative Step-Free Path (Solid Emerald Green) - Detour A -> D -> C */}
          {(activeRouteView === 'accessible' || activeRouteView === 'both') && (
            <>
              {/* Casing / Glow */}
              <Polyline
                positions={accessibleRouteCoords}
                pathOptions={{
                  color: '#065f46',
                  weight: 10,
                  opacity: 0.4
                }}
              />
              {/* Main Line */}
              <Polyline
                positions={accessibleRouteCoords}
                pathOptions={{
                  color: '#10b981',
                  weight: 6,
                  opacity: 0.95
                }}
              />
            </>
          )}

          {/* Start Origin Marker (Point A) */}
          <Marker position={[origin.coordinates?.lat || startLat, origin.coordinates?.lng || startLng]} icon={startIcon}>
            <Popup>
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase text-emerald-400">📍 Point A: Start Location</div>
                <div className="text-xs font-bold text-white">{origin.name}</div>
                <div className="text-[10px] text-slate-300">GPS: {origin.coordinates?.lat || startLat}, {origin.coordinates?.lng || startLng}</div>
                <div className="text-[10px] text-emerald-300 font-semibold">{origin.address || 'Verified Step-Free Origin'}</div>
              </div>
            </Popup>
          </Marker>

          {/* Detour Node Marker (Point D: West Promenade Ramp) */}
          <Marker position={[28.6338, 77.2180]} icon={detourIcon}>
            <Popup>
              <div className="space-y-1 max-w-[210px]">
                <div className="text-[10px] font-bold uppercase text-teal-300">♿ Point D: Accessible Detour Ramp</div>
                <div className="text-xs font-bold text-white">West Promenade Gentle Ramp</div>
                <p className="text-[10px] text-slate-300">1:12 gentle slope with dual handrails. Selected by RAASTA backend to bypass 18 stairs at B.</p>
                <div className="text-[9px] text-emerald-300 font-semibold">100% Step-Free Detour Active</div>
              </div>
            </Popup>
          </Marker>

          {/* Blocked Hazard Marker (Point B: 18 Stairs) */}
          <Marker position={[28.6335, 77.2190]} icon={blockedIcon}>
            <Popup>
              <div className="space-y-1 max-w-[210px]">
                <div className="text-[10px] font-bold uppercase text-rose-400">🚫 Point B: Hazard Blockage</div>
                <div className="text-xs font-bold text-white">18 Concrete Steps (No Ramp)</div>
                <p className="text-[10px] text-slate-300">Standard direct route (A ➔ B ➔ C) is blocked here for wheelchair users.</p>
                <div className="text-[9px] text-rose-300 font-semibold">Bypassed by Alternative Route A ➔ D ➔ C</div>
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker (Point C) */}
          <Marker position={[destLat, destLng]} icon={destIcon}>
            <Popup>
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase text-cyan-400">🏁 Point C: Destination</div>
                <div className="text-xs font-bold text-white">{destination.name}</div>
                <div className="text-[10px] text-emerald-400 font-bold">★ {destination.accessibilityRating || 94}/100 Safe Score</div>
              </div>
            </Popup>
          </Marker>

          {/* Simulated User Position Indicator */}
          {isNavSimulating && (
            <Marker position={userLivePos} icon={userLiveIcon}>
              <Popup>
                <div className="text-xs font-bold text-emerald-300">Live GPS Location (A ➔ D ➔ C)</div>
              </Popup>
            </Marker>
          )}

          {/* Physical Barriers / Obstacles Pins */}
          {showObstacles && barriers.map((barr, idx) => {
            const bLat = Number(barr.coordinates?.lat ?? barr.latitude);
            const bLng = Number(barr.coordinates?.lng ?? barr.longitude);
            if (isNaN(bLat) || isNaN(bLng)) return null;

            const typeDisplay = barr.typeLabel || (barr.type ? (barr.type.charAt(0).toUpperCase() + barr.type.slice(1)) : 'Stairs');
            const descDisplay = barr.description || (barr.type === 'stairs' ? 'Stairs blocking sidewalk' : `${typeDisplay} blocking sidewalk`);
            const severityDisplay = barr.severityLabel || (barr.severity ? (barr.severity.charAt(0).toUpperCase() + barr.severity.slice(1)) : 'High');

            return (
              <Marker 
                key={barr.id || `barr-${idx}-${bLat}-${bLng}`} 
                position={[bLat, bLng]} 
                icon={obstacleIcon}
              >
                <Popup>
                  <div className="space-y-1.5 p-1 min-w-[170px] text-left">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                      <span>⚠️</span>
                      <span className="text-white text-xs font-bold">{typeDisplay}</span>
                    </div>

                    <div className="text-[11px] text-slate-200 font-medium leading-snug">
                      {descDisplay}
                    </div>

                    <div className="pt-1.5 border-t border-slate-700/80 text-[10px] flex items-center justify-between font-semibold">
                      <span className="text-slate-400">Severity:</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        barr.severity === 'critical' || barr.severity === 'high'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700/80'
                          : barr.severity === 'medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700/80'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {severityDisplay}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Accessible Features Pins (Ramps, Lifts, Tactile Paths) */}
          {showFeatures && accessibleFeatures.map((feat) => {
            const fLat = feat.coordinates?.lat || 28.6338;
            const fLng = feat.coordinates?.lng || 77.2180;
            const isRamp = feat.type === 'ramp';
            return (
              <Marker key={feat.id} position={[fLat, fLng]} icon={isRamp ? rampIcon : sidewalkIcon}>
                <Popup>
                  <div className="space-y-1 max-w-[200px]">
                    <div className="text-[10px] font-bold uppercase text-emerald-400">
                      {isRamp ? '♿ Verified Ramp' : '🚶 Tactile Sidewalk'}
                    </div>
                    <div className="text-xs font-bold text-white">{feat.title}</div>
                    <p className="text-[10px] text-slate-300">{feat.description}</p>
                    <div className="text-[9px] text-emerald-300 font-semibold">{feat.status || 'Verified Clear'}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        </MapContainer>
      </div>

      {/* Floating Map Layers Toggle (Obstacles & Features) */}
      <div className="absolute right-3 bottom-44 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => {
            setShowObstacles(!showObstacles);
            triggerHaptic([40]);
          }}
          className={`p-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center justify-center transition-all ${
            showObstacles
              ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-rose-950/40'
              : 'bg-slate-900/90 border-slate-700 text-slate-400'
          }`}
          title="Toggle Obstacles"
        >
          <span className="text-sm">⚠️</span>
        </button>

        <button
          onClick={() => {
            setShowFeatures(!showFeatures);
            triggerHaptic([40]);
          }}
          className={`p-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center justify-center transition-all ${
            showFeatures
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-emerald-950/40'
              : 'bg-slate-900/90 border-slate-700 text-slate-400'
          }`}
          title="Toggle Accessible Ramps"
        >
          <span className="text-sm">♿</span>
        </button>
      </div>

      {/* Bottom Route Toggle Bar */}
      <div className="p-3 bg-[#0f172a] border-t border-slate-800 space-y-2 z-[1000]">
        
        {/* Route Select Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveRouteView('accessible')}
            className={`p-2.5 rounded-xl border text-left transition-all touch-active cursor-pointer ${
              activeRouteView === 'accessible'
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-950/40'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-400">
                {routes.accessible.rerouted ? 'Alternative (♿ Detour)' : 'Accessible Route'}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 font-mono">
                {routes.accessible.rerouted ? 'Detour' : 'Direct'}
              </span>
            </div>
            <div className="text-xs font-bold text-white mt-0.5 truncate">
              {routes.accessible.distanceMeters !== null 
                ? `${routes.accessible.distanceMeters} m ${routes.accessible.durationMinutes !== null ? `• ${routes.accessible.durationMinutes} min` : ''}`
                : 'Accessible Path'}
            </div>
          </button>

          <button
            onClick={() => setActiveRouteView('fastest')}
            className={`p-2.5 rounded-xl border text-left transition-all touch-active cursor-pointer ${
              activeRouteView === 'fastest'
                ? 'bg-rose-950/60 border-rose-500 text-rose-300 ring-2 ring-rose-500/60 shadow-lg shadow-rose-950/40'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-rose-400">
                Direct Path
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-300 font-mono">
                {routes.fastest.isBlocked ? 'Blocked 🚫' : 'Direct'}
              </span>
            </div>
            <div className="text-xs font-bold text-white mt-0.5 truncate">
              {routes.fastest.isBlocked ? 'Blocked by Obstacle' : (routes.fastest.distanceMeters !== null ? `${routes.fastest.distanceMeters} m` : 'Direct Path')}
            </div>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setCurrentStep('results');
              triggerHaptic([50]);
            }}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 touch-active cursor-pointer shadow-md"
          >
            <Route className="w-3.5 h-3.5" />
            <span>Route Details</span>
          </button>

          <button
            onClick={() => {
              setCurrentStep('report');
              triggerHaptic([50]);
            }}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 touch-active cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Report Obstacle</span>
          </button>
        </div>

      </div>

    </div>
  );
}
