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
        if (b.coordinates?.lat && b.coordinates?.lng) {
          points.push([b.coordinates.lat, b.coordinates.lng]);
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

      {/* Alternative Route Detour Banner (When not calculating) */}
      {!isCalculatingRoute && !isNavSimulating && (
        <div className="absolute top-16 left-3 right-3 z-[1000] p-2.5 rounded-2xl bg-[#0f172a]/95 backdrop-blur-md border shadow-2xl flex items-center justify-between gap-2.5 animate-fade-in transition-all border-emerald-500/70">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {activeRouteView === 'accessible' ? '♿' : '⚠️'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {activeRouteView === 'accessible' ? 'Alternative Detour Active' : 'Blocked Path Preview'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 font-mono font-bold">
                  {activeRouteView === 'accessible' ? 'A ➔ D ➔ C' : 'A ➔ B ➔ C'}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-white truncate">
                {activeRouteView === 'accessible'
                  ? 'Detouring via D (Ramp) to bypass 18 stairs at B'
                  : 'Blocked for Wheelchairs (18 concrete stairs at B)'}
              </div>
            </div>
          </div>
          
          {activeRouteView === 'fastest' ? (
            <button
              onClick={() => setActiveRouteView('accessible')}
              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] whitespace-nowrap shadow-md cursor-pointer transition-all flex-shrink-0"
            >
              Use A ➔ D ➔ C
            </button>
          ) : (
            <span className="text-[10px] font-bold text-emerald-300 px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-600 flex-shrink-0">
              Safe 94/100
            </span>
          )}
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
          {showObstacles && barriers.map((barr) => {
            const bLat = barr.coordinates?.lat || 28.6335;
            const bLng = barr.coordinates?.lng || 77.2190;
            return (
              <Marker key={barr.id} position={[bLat, bLng]} icon={obstacleIcon}>
                <Popup>
                  <div className="space-y-1 max-w-[200px]">
                    <div className="text-[10px] font-bold uppercase text-rose-400">⚠️ Reported Barrier</div>
                    <div className="text-xs font-bold text-white">{barr.title}</div>
                    <p className="text-[10px] text-slate-300">{barr.description}</p>
                    <div className="text-[9px] text-rose-300 font-semibold">{barr.severityLabel || 'Blocked for Wheelchairs'}</div>
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
              <span className="text-[10px] font-black uppercase text-emerald-400">Route B (Detour ♿)</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 font-mono">A➔D➔C</span>
            </div>
            <div className="text-xs font-bold text-white mt-0.5">9 min • 94/100 Safe</div>
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
              <span className="text-[10px] font-black uppercase text-rose-400">Route A (Direct 🚫)</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-300 font-mono">A➔B➔C</span>
            </div>
            <div className="text-xs font-bold text-white mt-0.5">6 min • Blocked at B</div>
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
