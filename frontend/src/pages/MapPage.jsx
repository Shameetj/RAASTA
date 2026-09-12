import React, { useEffect, useState } from 'react';
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

// Fit the map to the current location and selected destination only when
// the destination/route changes. It intentionally does NOT depend on
// live GPS position, so the map does not jump every time the user moves.
function DestinationBoundsUpdater({
  currentCoords,
  destCoords,
  accessibleCoords,
  destinationKey,
}) {
  const map = useMap();

  useEffect(() => {
    if (!destinationKey || !destCoords?.lat || !destCoords?.lng) {
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

      // Keep both the current location and destination visible after
      // selecting a destination / receiving a new route.
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 17,
        animate: true,
      });
    } catch (e) {
      console.warn('[Map] Destination bounds warning:', e);
    }
  }, [destinationKey, destCoords, accessibleCoords, map]);

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
    requestRouteCalculation
  } = useNavigation();

  const [hasSelectedMapDestination, setHasSelectedMapDestination] = useState(false);
  const [routeReadyForDestination, setRouteReadyForDestination] = useState(false);

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

  useEffect(() => {
    if (!hasSelectedMapDestination || !destLat || !destLng) {
      setRouteReadyForDestination(false);
      return;
    }

    const coords = routes?.accessible?.coordinates;

    if (!Array.isArray(coords) || coords.length < 2) {
      setRouteReadyForDestination(false);
      return;
    }

    // Only accept the route when its final point is actually near the
    // newly selected destination. This prevents the previous destination's
    // route from briefly appearing after the user taps a new location.
    const normalized = normalizeCoordinatesList(coords);
    const lastPoint = normalized[normalized.length - 1];

    if (!Array.isArray(lastPoint) || lastPoint.length < 2) {
      setRouteReadyForDestination(false);
      return;
    }

    const latDifference = Math.abs(Number(lastPoint[0]) - Number(destLat));
    const lngDifference = Math.abs(Number(lastPoint[1]) - Number(destLng));

    setRouteReadyForDestination(
      latDifference <= 0.0005 && lngDifference <= 0.0005
    );
  }, [routes, hasSelectedMapDestination, destLat, destLng]);

  // Only show a route after the user has selected a destination on the map.
  // This prevents the old/default destination route from appearing on first load
  // and prevents stale route lines from remaining while choosing a new destination.
  const accessibleRouteCoords = hasSelectedMapDestination &&
    routeReadyForDestination &&
    routes?.accessible?.coordinates &&
    routes.accessible.coordinates.length >= 2
    ? normalizeCoordinatesList(routes.accessible.coordinates)
    : [];

  const directRouteCoords = hasSelectedMapDestination &&
    routeReadyForDestination &&
    routes?.fastest?.coordinates &&
    routes.fastest.coordinates.length >= 2
    ? normalizeCoordinatesList(routes.fastest.coordinates)
    : [];

  // Small fixed destination marker. It stays at the selected GPS point.
  // The live green marker below is the only marker that moves.
  const destIcon = createDivIcon(
    `<div style="
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #06b6d4;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: white;
      "></div>
    </div>`,
    [22, 22]
  );

  // Moving current-location marker. This follows userLocation while guidance is active.
  const userLiveIcon = createDivIcon(
    `<div style="
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #10b981;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    ">
      <div style="
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: white;
      "></div>
      <div style="
        position: absolute;
        inset: -5px;
        border-radius: 50%;
        border: 2px solid rgba(16,185,129,0.35);
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
    if (isNavSimulating) {
      triggerHaptic([80, 40]);
      showVisualToast({
        title: 'Destination Locked',
        subtitle: 'Stop guidance before choosing a new destination.',
        type: 'info'
      });
      console.log('[RAASTA] 🔒 Destination change blocked while guidance is active.');
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

    // Hide the old route immediately while the new destination is being calculated.
    setRouteReadyForDestination(false);
    setHasSelectedMapDestination(true);

    setDestination(selectedDestination);

    triggerHaptic([50, 30]);

    showVisualToast({
      title: 'Destination Selected',
      subtitle: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      type: 'success'
    });

    console.log(
      '[RAASTA] 📍 Destination pin selected:',
      latitude,
      longitude
    );

    // Calculate from the REAL browser/mobile GPS position whenever it is
    // available. Do not fall back to the old demo/origin coordinates just
    // because guidance has not been started yet.
    const realGpsStart =
      userLocation?.lat != null && userLocation?.lng != null
        ? {
          lat: Number(userLocation.lat),
          lng: Number(userLocation.lng)
        }
        : null;

    console.log(
      '[RAASTA] 🧭 Route start:',
      realGpsStart
        ? `REAL GPS ${realGpsStart.lat}, ${realGpsStart.lng}`
        : 'No GPS fix yet — using configured origin'
    );

    requestRouteCalculation(
      selectedDestination,
      selectedProfileId,
      realGpsStart
    ).catch((err) => {
      console.error('[RAASTA] Destination route calculation failed:', err);
    });
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto h-[calc(100dvh-6rem)] min-h-0 flex flex-col overflow-hidden bg-slate-950 font-sans px-2 pt-2 pb-24 gap-2">

      {/* Main map — tap anywhere to place a destination waypoint. */}
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

          {/* Dynamic Auto Bounds to fit start, destination, and calculated routes */}
          <MapBoundsUpdater
            originCoords={{ lat: startLat, lng: startLng }}
            destCoords={hasSelectedMapDestination && destLat && destLng
              ? { lat: destLat, lng: destLng }
              : null}
            accessibleCoords={accessibleRouteCoords}
            directCoords={directRouteCoords}
            barrierList={[]}
          />

          <DestinationBoundsUpdater
            currentCoords={
              userLocation?.lat != null && userLocation?.lng != null
                ? { lat: Number(userLocation.lat), lng: Number(userLocation.lng) }
                : { lat: startLat, lng: startLng }
            }
            destCoords={
              hasSelectedMapDestination && destLat != null && destLng != null
                ? { lat: destLat, lng: destLng }
                : null
            }
            accessibleCoords={accessibleRouteCoords}
            destinationKey={destination?.id}
          />

          {/* Blocked Direct Route (Red dashed when rerouted) */}
          {routeReadyForDestination && routes?.fastest?.isBlocked && (
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
          {routeReadyForDestination && accessibleRouteCoords.length >= 2 && (
            <Polyline
              positions={accessibleRouteCoords}
              pathOptions={{
                color: '#10b981',
                weight: 6,
                opacity: 0.95
              }}
            />
          )}

          {/* Live Current Location Marker */}
          {isNavSimulating && userLocation?.lat != null && userLocation?.lng != null && (
            <Marker
              position={[Number(userLocation.lat), Number(userLocation.lng)]}
              icon={userLiveIcon}
            >
              <Popup>
                <div className="text-xs font-bold text-slate-900">
                  <div>📍 Your Current Location</div>
                  {gpsAccuracy != null && (
                    <div className="text-[10px] text-slate-600 font-normal">
                      Accuracy: ±{Math.round(Number(gpsAccuracy))} m
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

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
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <span>♿</span>
              <span>{routes?.accessible?.rerouted ? 'Alternative Route' : 'Accessible Route'}</span>
            </div>
            <div className="text-sm font-extrabold text-white">
              {!hasSelectedMapDestination
                ? 'Select a destination'
                : isCalculatingRoute
                  ? 'Calculating...'
                  : routes?.accessible?.distanceMeters != null
                    ? `${routes.accessible.distanceMeters} m${routes?.accessible?.durationMinutes ? ` • ${routes.accessible.durationMinutes} min` : ''}`
                    : 'Route unavailable'}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center justify-center">
            {/* Start Walk Simulation */}
            <button
              onClick={() => {
                if (isNavSimulating) {
                  stopGpsGuidance();
                } else {
                  startGpsGuidance();
                }
              }}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 touch-active transition-all min-w-[138px] ${isNavSimulating
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
