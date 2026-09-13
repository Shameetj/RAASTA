import React, { useEffect, useState, useRef } from 'react';
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
import {
  Play,
  Square,
  AlertTriangle,
  Navigation
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

// Automatically centers the map at the user's real GPS position on reload/acquisition
function UserLocationMapCenterer({ userLocation, hasCalculatedRoute }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    // If a route is already calculated, RouteBoundsFitter handles the framing.
    if (hasCalculatedRoute) return;

    if (userLocation?.lat != null && userLocation?.lng != null && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      map.setView([Number(userLocation.lat), Number(userLocation.lng)], 16, {
        animate: true
      });
    }
  }, [userLocation?.lat, userLocation?.lng, hasCalculatedRoute, map]);

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

function DestinationMapPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    }
  });

  return null;
}

// Fits map bounds smoothly only after the user starts guidance and a route is calculated
function RouteBoundsFitter({ currentCoords, destCoords, accessibleCoords, hasCalculatedRoute }) {
  const map = useMap();

  useEffect(() => {
    if (!hasCalculatedRoute || !destCoords?.lat || !destCoords?.lng) {
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
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 17,
        animate: true,
      });
    } catch (e) {
      console.warn('[Map] Route bounds warning:', e);
    }
  }, [hasCalculatedRoute, destCoords?.lat, destCoords?.lng, accessibleCoords, map]);

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
    triggerHaptic,
    showVisualToast,
    isCalculatingRoute,
    isHapticVibrating,
    requestRouteCalculation,
    removeBarrierReport
  } = useNavigation();

  const [hasSelectedMapDestination, setHasSelectedMapDestination] = useState(false);
  const [hasCalculatedRoute, setHasCalculatedRoute] = useState(false);

  // Prefer the latest real browser/mobile GPS position over the old
  // configured/demo origin. This keeps the map and route start aligned.
  const startLat =
    userLocation?.lat != null
      ? Number(userLocation.lat)
      : (origin?.coordinates?.lat || 15.4910);
  const startLng =
    userLocation?.lng != null
      ? Number(userLocation.lng)
      : (origin?.coordinates?.lng || 73.8260);
  const destLat = destination?.coordinates?.lat;
  const destLng = destination?.coordinates?.lng;

  // Only show a route AFTER user presses Start Guidance and calculation completes.
  const accessibleRouteCoords = hasSelectedMapDestination &&
    hasCalculatedRoute &&
    routes?.accessible?.coordinates &&
    routes.accessible.coordinates.length >= 2
    ? normalizeCoordinatesList(routes.accessible.coordinates)
    : [];

  const directRouteCoords = hasSelectedMapDestination &&
    hasCalculatedRoute &&
    routes?.fastest?.coordinates &&
    routes.fastest.coordinates.length >= 2
    ? normalizeCoordinatesList(routes.fastest.coordinates)
    : [];

  // Destination marker pinned on map — Cyan target matching original app design
  const destIcon = createDivIcon(
    `<div style="
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #06b6d4;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: white;
      "></div>
    </div>`,
    [26, 26]
  );

  // User Current Location marker — Emerald green target matching original app design
  const userLiveIcon = createDivIcon(
    `<div style="
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #10b981;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: white;
      "></div>
    </div>`,
    [26, 26]
  );

  const obstacleIcon = createDivIcon(
    `<div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
      ⚠️
    </div>`,
    [32, 32]
  );

  const handleMapDestinationSelect = ({ lat, lng }) => {
    // Lock the destination while guidance is active.
    if (isNavSimulating || hasCalculatedRoute) {
      triggerHaptic([80, 40]);
      showVisualToast({
        title: 'Destination Locked',
        subtitle: 'Stop guidance before choosing a new destination.',
        type: 'info'
      });
      return;
    }

    const latitude = Number(lat);
    const longitude = Number(lng);

    const selectedDestination = {
      id: `map-pin-${Date.now()}`,
      name: 'Selected Location',
      subtitle: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      category: 'Map Pin',
      coordinates: {
        lat: latitude,
        lng: longitude
      }
    };

    // Pin destination without calculating route yet
    setHasCalculatedRoute(false);
    setHasSelectedMapDestination(true);
    setDestination(selectedDestination);

    triggerHaptic([50, 30]);

    showVisualToast({
      title: 'Destination Pinned',
      subtitle: 'Tap Start Guidance to find the closest accessible route.',
      type: 'info'
    });
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto h-[calc(100dvh-5.5rem)] min-h-0 flex flex-col overflow-hidden bg-slate-950 font-sans px-2 pt-1 pb-20 gap-2">
      {/* 3. Real OpenStreetMap Leaflet Map (Centerpiece) */}
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

          <DestinationMapPicker
            onSelect={handleMapDestinationSelect}
          />

          {/* Map resizer to ensure tiles render immediately */}
          <MapResizer />

          {/* Automatically center map on user's live GPS location on reload */}
          <UserLocationMapCenterer
            userLocation={userLocation}
            hasCalculatedRoute={hasCalculatedRoute}
          />

          {/* Floating Re-center button */}
          <RecenterControl userLocation={userLocation} />

          {/* Fit map view only after route is calculated */}
          <RouteBoundsFitter
            currentCoords={{ lat: startLat, lng: startLng }}
            destCoords={hasSelectedMapDestination && destLat != null && destLng != null ? { lat: destLat, lng: destLng } : null}
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

          {/* User Current Location Marker — Always anchored at user's real position */}
          <Marker
            position={[startLat, startLng]}
            icon={userLiveIcon}
          >
            <Popup>
              <div className="text-xs font-bold text-slate-900">
                <div>📍 Your Location</div>
                <div className="text-[10px] text-slate-600 font-normal">
                  {userLocation ? 'Live GPS Connected' : 'Starting Position'}
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Destination Marker */}
          {hasSelectedMapDestination && destLat != null && destLng != null && (
            <Marker position={[destLat, destLng]} icon={destIcon}>
              <Popup>
                <div className="text-xs font-bold text-slate-900">
                  <div>🎯 {destination.name}</div>
                  <div className="text-[10px] text-slate-600 font-normal">{destination.address}</div>
                </div>
              </Popup>
            </Marker>
          )}

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
                      className="mt-3 w-full py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-rose-400 hover:bg-rose-950/40"
                    >
                      Remove Report
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

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
      <div className="w-full flex-shrink-0 p-3 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-lg space-y-3 z-[1000]">

        {/* Backend Alert / Reroute Notification */}
        {routes?.accessible?.rerouted && (
          <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/70 text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 leading-snug">
              <span className="font-bold text-amber-300">Blockage detected: </span>
              <span>{routes.accessible.alerts?.[0]?.message || 'Accessibility blockage detected. Finding an alternative route.'} </span>
              <span className="text-emerald-400 font-bold">✓ Alternative route active.</span>
            </div>
          </div>
        )}

        {/* Deaf Mode Visual Alert Pill */}
        {selectedProfileId === 'deaf' && (
          <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/70 text-cyan-200 text-xs flex items-center gap-2">
            <span className="text-base"></span>
            <div className="truncate">
              <span className="font-bold text-cyan-300">Crosswalk ahead: </span>
              <span>Walk signal active</span>
            </div>
          </div>
        )}

        {/* Route Stats & Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <span>♿</span>
              <span>
                {hasCalculatedRoute
                  ? (routes?.accessible?.rerouted ? 'Alternative Route' : 'Accessible Route')
                  : hasSelectedMapDestination
                    ? 'Destination Pinned'
                    : 'Accessible Route'}
              </span>
            </div>
            <div className="text-sm font-extrabold text-white">
              {!hasSelectedMapDestination
                ? 'Tap map to set destination'
                : isCalculatingRoute
                  ? 'Calculating safest path...'
                  : hasCalculatedRoute && routes?.accessible?.distanceMeters != null
                    ? `${routes.accessible.distanceMeters} m${routes?.accessible?.durationMinutes ? ` • ${routes.accessible.durationMinutes} min` : ''}`
                    : 'Tap Start Guidance to calculate'}
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
                } else {
                  if (!hasSelectedMapDestination || !destination?.coordinates) {
                    showVisualToast({
                      title: 'Select a Destination',
                      subtitle: 'Tap the map to choose where you want to go.',
                      type: 'info'
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
                      realGpsStart
                    );
                    setHasCalculatedRoute(true);
                    startGpsGuidance();
                  } catch (err) {
                    console.error(
                      '[RAASTA] Start Guidance route calculation failed:',
                      err
                    );
                    showVisualToast({
                      title: 'Route Calculation Failed',
                      subtitle: 'Please try again.',
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

      </div>

    </div>
  );
}
