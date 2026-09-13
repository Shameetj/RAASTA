import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigation } from '../context/NavigationContext';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { normalizeCoordinatesList } from '../utils/geoUtils';
import { fetchLiveIncidents } from '../api/apiClient';
import { calculateAccessibilityScore } from '../utils/accessibilityScore';
import { calculateReportFreshness } from '../utils/freshnessUtils';
import {
  Play,
  Square,
  AlertTriangle,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  Info,
  Layers,
  Activity,
  ArrowRight,
  Clock,
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronUp
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

// Automatically centers the map at the user's real GPS position on reload/acquisition, keeps still during guidance, and relocates to GPS when guidance stops
function UserLocationMapCenterer({ userLocation, hasCalculatedRoute, isNavSimulating }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);
  const wasGuidingRef = useRef(false);

  useEffect(() => {
    const isGuiding = hasCalculatedRoute || isNavSimulating;

    // Transition: user just stopped guidance -> relocate map to current GPS location
    if (wasGuidingRef.current && !isGuiding) {
      wasGuidingRef.current = false;
      if (userLocation?.lat != null && userLocation?.lng != null) {
        const lat = Number(userLocation.lat);
        const lng = Number(userLocation.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
          map.setView([lat, lng], 16, { animate: true });
        }
      }
      return;
    }

    wasGuidingRef.current = isGuiding;

    // While route guidance is active, NEVER auto-pan or re-center — map stays perfectly still for waypoint viewing
    if (isGuiding) return;

    if (userLocation?.lat != null && userLocation?.lng != null) {
      const lat = Number(userLocation.lat);
      const lng = Number(userLocation.lng);

      if (isNaN(lat) || isNaN(lng)) return;

      // First time real GPS is acquired on initial load: center immediately and zoom in once
      if (!hasCenteredRef.current) {
        hasCenteredRef.current = true;
        map.setView([lat, lng], 16, { animate: true });
      }
    }
  }, [userLocation?.lat, userLocation?.lng, hasCalculatedRoute, isNavSimulating, map]);

  return null;
}

// Floating button to re-center the map on user's current GPS location
function RecenterControl({ userLocation }) {
  const map = useMap();

  return (
    <div
      className="leaflet-bottom leaflet-right"
      style={{ marginBottom: '35px', marginRight: '12px', pointerEvents: 'auto' }}
    >
      <button
        type="button"
        title="Center on my location"
        onClick={(e) => {
          e.stopPropagation();
          if (userLocation?.lat != null && userLocation?.lng != null) {
            map.setView([Number(userLocation.lat), Number(userLocation.lng)], 16, {
              animate: true
            });
          }
        }}
        className="w-9 h-9 rounded-xl bg-slate-900/95 border border-slate-700 text-emerald-400 shadow-xl flex items-center justify-center hover:bg-slate-800 transition-all touch-active"
      >
        <Navigation className="w-4 h-4" />
      </button>
    </div>
  );
}

// Dynamically listens to map pan & zoom changes to load live incidents across visible viewport (30-60s refresh or pan)
function MapViewportWatcher({ onViewportChange }) {
  const map = useMap();
  const timeoutRef = useRef(null);

  useMapEvents({
    moveend() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        try {
          const center = map.getCenter();
          const bounds = map.getBounds();
          const northEast = bounds.getNorthEast();
          const radius = Math.round(center.distanceTo(northEast));
          const zoom = map.getZoom();
          onViewportChange({
            lat: center.lat,
            lng: center.lng,
            radius: Math.max(800, Math.min(radius, 35000)),
            zoom
          });
        } catch (e) {
          console.warn('[MapViewportWatcher] Viewport calculation notice:', e);
        }
      }, 500);
    }
  });

  return null;
}

// Fits map bounds smoothly only ONCE when a route is first calculated, so the map stays still while user inspects waypoints
function RouteBoundsFitter({ currentCoords, destCoords, accessibleCoords, hasCalculatedRoute }) {
  const map = useMap();
  const framedRouteKeyRef = useRef(null);

  useEffect(() => {
    if (!hasCalculatedRoute || !destCoords?.lat || !destCoords?.lng) {
      framedRouteKeyRef.current = null;
      return;
    }

    const routeKey = `${destCoords.lat.toFixed(4)}_${destCoords.lng.toFixed(4)}_${accessibleCoords?.length || 0}`;
    if (framedRouteKeyRef.current === routeKey) {
      // Already framed once for this route; keep map still so user can freely pan and view waypoints
      return;
    }

    const points = [[destCoords.lat, destCoords.lng]];

    if (currentCoords?.lat != null && currentCoords?.lng != null) {
      points.push([currentCoords.lat, currentCoords.lng]);
    }

    if (Array.isArray(accessibleCoords) && accessibleCoords.length > 0) {
      accessibleCoords.forEach((p) => {
        if (Array.isArray(p) && p.length >= 2) {
          points.push(p);
        }
      });
    }

    try {
      const bounds = L.latLngBounds(points);
      framedRouteKeyRef.current = routeKey;
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 17,
        animate: true,
      });
    } catch (e) {
      console.warn('[Map] Route bounds warning:', e);
    }
  }, [hasCalculatedRoute, destCoords?.lat, destCoords?.lng, accessibleCoords?.length, map]);

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
    destinations,
    destination,
    setDestination,
    routes,
    barriers,
    selectedProfile,
    selectedProfileId,
    isNavSimulating,
    userLocation,
    gpsAccuracy,
    locationError,
    startGpsGuidance,
    stopGpsGuidance,
    triggerHaptic,
    showVisualToast,
    isCalculatingRoute,
    requestRouteCalculation,
    removeBarrierReport
  } = useNavigation();

  const [hasCalculatedRoute, setHasCalculatedRoute] = useState(false);
  const [liveIncidents, setLiveIncidents] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);

  // Only treat location as real if acquired from device GPS or stored real fix
  const hasRealGps = userLocation?.lat != null && userLocation?.lng != null;
  const startLat = hasRealGps
    ? Number(userLocation.lat)
    : (origin?.coordinates?.lat ?? 15.3990);
  const startLng = hasRealGps
    ? Number(userLocation.lng)
    : (origin?.coordinates?.lng ?? 73.8115);
  const destLat = destination?.coordinates?.lat;
  const destLng = destination?.coordinates?.lng;

  const currentViewportRef = useRef({
    lat: startLat,
    lon: startLng,
    radius: 5000,
    limit: 15
  });

  const loadIncidents = useCallback(async ({ lat, lon, radius, limit = 15 }) => {
    // Only query live incidents when real GPS coordinates exist
    if (lat == null || lon == null) return;
    try {
      const incidents = await fetchLiveIncidents({
        lat,
        lon,
        radius,
        limit
      });
      if (Array.isArray(incidents)) {
        setLiveIncidents(incidents);
      }
    } catch (err) {
      console.warn('[RAASTA] Live incidents fetch warning:', err);
    }
  }, []);

  // Update incidents dynamically whenever user pans or zooms the map
  const handleViewportChange = useCallback(({ lat, lng, radius, zoom }) => {
    const limit = zoom <= 13 ? 20 : (zoom <= 15 ? 15 : 10);
    currentViewportRef.current = { lat, lon: lng, radius, limit };
    loadIncidents({ lat, lon: lng, radius, limit });
  }, [loadIncidents]);

  // Periodic refresh (every 45s) while map screen is active
  useEffect(() => {
    if (hasRealGps) {
      loadIncidents(currentViewportRef.current);
      const interval = setInterval(() => {
        loadIncidents(currentViewportRef.current);
      }, 45000);
      return () => clearInterval(interval);
    }
  }, [loadIncidents, hasRealGps]);

  // Only show a route AFTER user presses Start Guidance and calculation completes.
  const accessibleRouteCoords = hasCalculatedRoute &&
    routes?.accessible?.coordinates &&
    routes.accessible.coordinates.length >= 2
    ? normalizeCoordinatesList(routes.accessible.coordinates)
    : [];

  const directRouteCoords = hasCalculatedRoute &&
    routes?.fastest?.coordinates &&
    routes.fastest.coordinates.length >= 2
    ? normalizeCoordinatesList(routes.fastest.coordinates)
    : [];

  // Evaluate real accessibility score based on actual detected blockages along this route
  const accessibilityAnalysis = useMemo(() => {
    if (!hasCalculatedRoute || !routes?.accessible) {
      return null;
    }
    const avoidedBlockages = routes.accessible.rerouted
      ? (barriers.filter(b => b.isOnRouteA) || [])
      : [];

    return calculateAccessibilityScore({
      route: routes.accessible,
      backendScore: routes.accessible.score ? { score: routes.accessible.score, grade: routes.accessible.scoreRating } : null,
      rerouted: routes.accessible.rerouted,
      activeBlockagesOnRoute: routes.accessible.rerouted ? [] : (barriers.filter(b => b.isOnRouteA) || []),
      avoidedBlockages,
      profile: selectedProfileId
    });
  }, [hasCalculatedRoute, routes?.accessible, barriers, selectedProfileId]);

  // Destination marker pinned on map — Cyan target matching original app design (No emoji)
  const destIcon = createDivIcon(
    `<div style="
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #06b6d4;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ffffff;
      "></div>
    </div>`,
    [26, 26]
  );

  // User Current Location marker — Emerald green target (No emoji)
  const userLiveIcon = createDivIcon(
    `<div style="
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #10b981;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ffffff;
      "></div>
    </div>`,
    [26, 26]
  );

  // Community Obstacle Marker — Clean SVG warning badge (No emoji)
  const obstacleIcon = createDivIcon(
    `<div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e11d48;
      border: 2.5px solid #ffffff;
      box-shadow: 0 3px 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    ">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>`,
    [32, 32]
  );

  // Live Incident Marker — Amber/Orange diamond with clean SVG icons (No emoji)
  const getLiveIncidentIcon = (type) => {
    let bgGradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
    let svgIcon = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    `;

    if (type === 'road_closure') {
      bgGradient = 'linear-gradient(135deg, #ef4444, #b91c1c)';
      svgIcon = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      `;
    } else if (type === 'accident') {
      bgGradient = 'linear-gradient(135deg, #ea580c, #c2410c)';
      svgIcon = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      `;
    } else if (type === 'road_work' || type === 'construction') {
      bgGradient = 'linear-gradient(135deg, #f59e0b, #b45309)';
      svgIcon = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="6" width="20" height="8" rx="1"/>
          <path d="M17 14v7"/>
          <path d="M7 14v7"/>
          <path d="M17 3v3"/>
          <path d="M7 3v3"/>
          <path d="M10 14 2.3 6.3"/>
          <path d="M14 6 6.3 13.7"/>
          <path d="M18 6l-7.7 7.7"/>
          <path d="M21.7 6.3 14 14"/>
        </svg>
      `;
    } else if (type === 'traffic') {
      bgGradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
      svgIcon = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      `;
    }

    return createDivIcon(
      `<div style="
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      ">
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: ${bgGradient};
          border: 2px solid #ffffff;
          box-shadow: 0 3px 10px rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(45deg);
          box-sizing: border-box;
        ">
          <div style="
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${svgIcon}
          </div>
        </div>
      </div>`,
      [36, 36]
    );
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto h-[calc(100dvh-5.5rem)] min-h-0 flex flex-col overflow-hidden bg-slate-950 font-sans px-2 pt-1 pb-20 gap-2">
      {/* 1. Real OpenStreetMap Leaflet Map (Centerpiece) */}
      <div
        className="w-full flex-1 relative bg-slate-900 z-0 min-h-0 rounded-2xl overflow-hidden border border-slate-800 shadow-lg"
        style={{ touchAction: 'none' }}
      >
        <MapContainer
          center={[startLat, startLng]}
          zoom={16}
          scrollWheelZoom={false}
          zoomControl={true}
          dragging={true}
          touchZoom={true}
          doubleClickZoom={true}
          style={{ width: '100%', height: '100%', minHeight: '300px' }}
          className="w-full h-full"
        >
          {/* Real OpenStreetMap Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Dynamic pan & zoom watcher to fetch live incidents */}
          <MapViewportWatcher
            onViewportChange={handleViewportChange}
          />

          {/* Map resizer to ensure tiles render immediately */}
          <MapResizer />

          {/* Automatically center map on user's live GPS location on reload and relocate on stop */}
          <UserLocationMapCenterer
            userLocation={userLocation}
            hasCalculatedRoute={hasCalculatedRoute}
            isNavSimulating={isNavSimulating}
          />

          {/* Floating Re-center button */}
          <RecenterControl userLocation={userLocation} />

          {/* Fit map view only after route is calculated */}
          <RouteBoundsFitter
            currentCoords={{ lat: startLat, lng: startLng }}
            destCoords={destLat != null && destLng != null ? { lat: destLat, lng: destLng } : null}
            accessibleCoords={accessibleRouteCoords}
            hasCalculatedRoute={hasCalculatedRoute}
          />

          {/* Blocked Direct Route (Red dashed when rerouted) */}
          {hasCalculatedRoute && routes?.fastest?.isBlocked && directRouteCoords.length >= 2 && (
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

          {/* Accessible Step-Free Route (Emerald Green) */}
          {hasCalculatedRoute && accessibleRouteCoords.length >= 2 && (
            <Polyline
              positions={accessibleRouteCoords}
              pathOptions={{
                color: '#10b981',
                weight: 6,
                opacity: 0.95
              }}
            />
          )}

          {/* User Current Location Marker — ONLY rendered when real GPS position is confirmed */}
          {hasRealGps && (
            <Marker
              position={[Number(userLocation.lat), Number(userLocation.lng)]}
              icon={userLiveIcon}
            >
              <Popup>
                <div className="text-xs font-bold text-white">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Your Current Location</span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-normal mt-0.5">
                    Live Mobile GPS Active
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Fixed Destination Marker */}
          {destLat != null && destLng != null && (
            <Marker position={[destLat, destLng]} icon={destIcon}>
              <Popup>
                <div className="text-xs font-bold text-white">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{destination?.name || 'Destination'}</span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-normal mt-0.5">{destination?.address || `${destLat.toFixed(4)}, ${destLng.toFixed(4)}`}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Real Blockage Markers from Backend (with Report Freshness) */}
          {barriers.map((b, idx) => {
            const bLat = Number(b.coordinates?.lat ?? b.latitude);
            const bLng = Number(b.coordinates?.lng ?? b.longitude);
            if (isNaN(bLat) || isNaN(bLng)) return null;

            const freshness = calculateReportFreshness(b.reportedAt || b.reported_at);

            return (
              <Marker key={b.id || `barrier-${idx}`} position={[bLat, bLng]} icon={obstacleIcon}>
                <Popup>
                  <div className="p-1 text-white min-w-[200px]">
                    <div className="text-xs font-bold flex items-center gap-1.5 text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{b.title || 'Reported Obstacle'}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 leading-snug">{b.description || 'Stairs blocking sidewalk'}</div>
                    
                    <div className="mt-2 pt-2 border-t border-slate-700/80 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-rose-400 uppercase tracking-wider">
                        Severity: {b.severity || 'High'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-medium">
                        {freshness.confidence} • {freshness.timeAgo}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();

                        if (!window.confirm('Remove this blockage report?')) {
                          return;
                        }

                        try {
                          await removeBarrierReport(b.id);
                        } catch (error) {
                          console.error('[RAASTA] Remove blockage failed:', error);
                        }
                      }}
                      className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition-colors"
                    >
                      Remove Report
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Live Road Incidents (TomTom Traffic Feed) */}
          {liveIncidents.map((inc, idx) => {
            const incLat = Number(inc.latitude);
            const incLng = Number(inc.longitude);
            if (isNaN(incLat) || isNaN(incLng)) return null;

            return (
              <Marker
                key={inc.id || `live-inc-${idx}`}
                position={[incLat, incLng]}
                icon={getLiveIncidentIcon(inc.type)}
              >
                <Popup>
                  <div className="p-1 min-w-[210px] text-white">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1.5 mb-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        Live Incident
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">TomTom Feed</span>
                    </div>

                    <div className="text-xs font-extrabold text-white mb-1">
                      {inc.title || 'Traffic Event'}
                    </div>

                    <div className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                      {inc.description || 'Live road condition reported in your area.'}
                    </div>

                    <div className="flex items-center justify-between text-[10px] bg-slate-800/80 rounded-lg p-1.5 border border-slate-700/80">
                      <span className="text-slate-400">Severity:</span>
                      <span className={`font-bold uppercase tracking-wider ${
                        inc.severity === 'high' ? 'text-rose-400' :
                        inc.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
                      }`}>
                        {inc.severity || 'Moderate'}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        </MapContainer>

        {/* Map Legend: Community Reports vs Live Traffic Incidents (Improvement 9) */}
        <div className="absolute top-3 right-3 z-[500] pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-2.5 text-[10px] font-medium text-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-white inline-block"></span>
            <span>Community</span>
          </div>
          <div className="w-px h-3 bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 rounded-[2px] bg-amber-500 border border-white inline-block"></span>
            <span>Live Incident</span>
          </div>
          {liveIncidents.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[9px]">
              {liveIncidents.length}
            </span>
          )}
        </div>

        {/* Loading Overlay */}
        {isCalculatingRoute && (
          <div className="absolute top-3 left-3 right-3 z-[1000] p-3 rounded-xl bg-slate-900/95 border border-emerald-500/60 shadow-xl flex items-center gap-3 animate-fade-in">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="text-xs font-bold text-white">Calculating safest accessible route...</div>
          </div>
        )}
      </div>

      {/* 2. Bottom Route & Accessibility Status Panel */}
      <div className="w-full flex-shrink-0 p-3 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-lg space-y-3 z-[1000] max-h-[46vh] overflow-y-auto">

        {/* Enhanced Rerouting Alert Banner (Improvement 5) */}
        {hasCalculatedRoute && routes?.accessible?.rerouted && (
          <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-500/80 text-amber-100 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>ACCESSIBILITY BARRIER AHEAD</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-snug">
              Direct path blocked by stairs / construction. RAASTA calculated a safe step-free alternative detour.
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-amber-800/50 text-[10px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>ROUTE UPDATED</span>
              </span>
              <span className="font-semibold text-slate-300">
                {routes?.accessible?.distanceMeters != null && routes?.fastest?.distanceMeters != null
                  ? `+${Math.max(0, Math.round(routes.accessible.distanceMeters - routes.fastest.distanceMeters))} m`
                  : '+0 m'} • {routes?.accessible?.durationMinutes != null && routes?.fastest?.durationMinutes != null
                  ? `+${Math.max(0, routes.accessible.durationMinutes - routes.fastest.durationMinutes)} min`
                  : '+0 min'} • Score: {accessibilityAnalysis?.score || 100}/100
              </span>
            </div>
          </div>
        )}

        {/* Deaf Mode High-Visibility Visual Cue Banner (Improvement 8) */}
        {selectedProfileId === 'deaf' && (
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/80 text-cyan-100 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 text-xs uppercase tracking-wider">
                Visual Navigation Active
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/60 border border-cyan-600 text-cyan-300 font-medium">
                Deaf Mode
              </span>
            </div>
            <div className="text-xs font-extrabold text-white">
              {routes?.accessible?.segments?.length > 0
                ? (routes.accessible.segments[0].text || routes.accessible.segments[0].instruction || 'Follow step-free route')
                : 'High-contrast visual guidance active.'}
            </div>
            <div className="text-[11px] text-slate-300">
              {routes?.accessible?.alerts?.length > 0
                ? (typeof routes.accessible.alerts[0] === 'string' ? routes.accessible.alerts[0] : routes.accessible.alerts[0].message || 'Visual alerts enabled')
                : 'Visual alert cues and directional guidance active on screen.'}
            </div>
          </div>
        )}

        {/* Destination Selector: Real backend locations from Dev1/Dev2 */}
        {Array.isArray(destinations) && (
          <div className="space-y-1.5 pb-2 border-b border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>Choose Destination:</span>
              <span className="text-cyan-400 font-normal">
                {destination?.category === 'Map Pin' ? 'Custom Destination' : 'Backend Verified'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {destinations.map((loc) => {
                const isSelected = destination?.id === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      if (isNavSimulating || hasCalculatedRoute) {
                        stopGpsGuidance();
                        setHasCalculatedRoute(false);
                        setShowExplanation(false);
                      }
                      setDestination(loc);
                      triggerHaptic([30]);
                      showVisualToast({
                        title: loc.name,
                        subtitle: `${loc.subtitle || loc.category || 'Backend Verified'} • Ready to guide`,
                        type: 'info'
                      });
                    }}
                    className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all touch-active ${
                      isSelected
                        ? 'bg-cyan-950/90 border border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50'
                        : 'bg-slate-950/70 border border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <MapPin className={`w-3 h-3 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{loc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Route Stats & Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {hasCalculatedRoute
                  ? (routes?.accessible?.rerouted ? 'Alternative Accessible Route' : 'RAASTA Accessible Route')
                  : 'Destination Ready'}
              </span>
            </div>
            <div className="text-sm font-extrabold text-white truncate">
              {destination?.name || 'Selected Destination'}
            </div>
            <div className="text-xs text-slate-400">
              {hasCalculatedRoute && routes?.accessible?.distanceMeters != null
                ? `${(routes.accessible.distanceMeters / 1000).toFixed(1)} km • ${routes.accessible.durationMinutes || 4} min`
                : 'Press Start Guidance to calculate safest route'}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center justify-center">
            {/* Start / Stop Guidance Button */}
            <button
              disabled={isCalculatingRoute}
              onClick={async () => {
                if (isNavSimulating || hasCalculatedRoute) {
                  stopGpsGuidance();
                  setHasCalculatedRoute(false);
                  setShowExplanation(false);
                } else {
                  if (!hasRealGps) {
                    showVisualToast({
                      title: 'Location Unavailable',
                      subtitle: 'Current location unavailable. Please enable location access.',
                      type: 'error'
                    });
                    return;
                  }

                  const realGpsStart = {
                    lat: startLat,
                    lng: startLng
                  };

                  try {
                    await requestRouteCalculation(
                      destination,
                      selectedProfileId,
                      realGpsStart,
                      liveIncidents
                    );
                    setHasCalculatedRoute(true);
                    startGpsGuidance();
                  } catch (err) {
                    console.error('[RAASTA] Start Guidance route calculation failed:', err);
                    showVisualToast({
                      title: 'Route Calculation Failed',
                      subtitle: err.message || 'Please try again.',
                      type: 'error'
                    });
                  }
                }
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 touch-active transition-all min-w-[138px] ${isNavSimulating || hasCalculatedRoute
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                } ${isCalculatingRoute ? 'opacity-80 cursor-wait' : ''}`}
            >
              {isCalculatingRoute ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Calculating...</span>
                </>
              ) : isNavSimulating || hasCalculatedRoute ? (
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

        {/* Improvement 1: Route Accessibility Score Card (Shown after Start Guidance) */}
        {hasCalculatedRoute && accessibilityAnalysis && (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-extrabold text-white">RAASTA Route Score</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-emerald-400">
                  {accessibilityAnalysis.score} / 100
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold">
                  {accessibilityAnalysis.rating}
                </span>
              </div>
            </div>

            {/* Score Breakdown Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-slate-800">
              {accessibilityAnalysis.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1 rounded bg-slate-950/60 px-1.5">
                  <span className="text-slate-400 truncate">{item.label}:</span>
                  <span className="font-bold text-slate-200 ml-1">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement 2: Fastest vs Accessible Route Comparison Card */}
        {hasCalculatedRoute && (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
              <span>Route Comparison</span>
              <span className="text-[10px] text-slate-400 font-normal">Accessibility-Aware</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Direct Route */}
              <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 space-y-0.5">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Fastest Route</div>
                <div className="text-xs font-bold text-slate-200">
                  {routes?.fastest?.distanceMeters != null ? `${(routes.fastest.distanceMeters / 1000).toFixed(1)} km` : '—'} • {routes?.fastest?.durationMinutes != null ? `${routes.fastest.durationMinutes} min` : '—'}
                </div>
                <div className="text-[9px] text-rose-400 font-medium">
                  {routes?.fastest?.isBlocked ? 'Blocked by stairs / hazard' : 'Direct step-free'}
                </div>
              </div>

              {/* RAASTA Accessible Route */}
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-700/50 space-y-0.5">
                <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">RAASTA Accessible</div>
                <div className="text-xs font-bold text-white">
                  {routes?.accessible?.distanceMeters != null ? `${(routes.accessible.distanceMeters / 1000).toFixed(1)} km` : '—'} • {routes?.accessible?.durationMinutes != null ? `${routes.accessible.durationMinutes} min` : '—'}
                </div>
                <div className="text-[9px] text-emerald-300 font-medium">
                  {accessibilityAnalysis?.score != null ? `${accessibilityAnalysis.score}/100 Accessibility` : 'Accessible Path'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Improvement 6: "Why RAASTA Chose This Route" Explanation Section */}
        {hasCalculatedRoute && accessibilityAnalysis?.reasons && (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Why RAASTA Chose This Route</span>
              </div>
              {showExplanation ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showExplanation && (
              <ul className="mt-2 space-y-1.5 text-[11px] text-slate-300 pl-4 list-disc border-t border-slate-800 pt-2">
                {accessibilityAnalysis.reasons.map((reason, idx) => (
                  <li key={idx} className="leading-snug">{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
