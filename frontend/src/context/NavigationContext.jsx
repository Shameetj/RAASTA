import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  ACCESSIBILITY_PROFILES,
  DEMO_DESTINATIONS,
  INITIAL_ORIGIN,
  INITIAL_BARRIERS,
  INITIAL_ACCESSIBLE_FEATURES,
  DEAF_MODE_ALERTS
} from '../data/mockData';
import {
  fetchLocations,
  fetchBlockages,
  calculateRoute,
  reportBlockage,
  deleteBlockage
} from '../api/apiClient';
import { extractBackendRouteCoordinates } from '../utils/geoUtils';

const NavigationContext = createContext(null);

const INITIAL_ROUTES_STATE = {
  accessible: {
    id: 'route-accessible',
    name: 'Accessible Route',
    coordinates: [],
    distanceMeters: null,
    durationMinutes: null,
    durationSeconds: null,
    rerouted: false,
    status: 'Ready to calculate',
    score: null,
    scoreRating: null,
    alerts: [],
    message: '',
    summary: 'Accessible route calculated from real-time coordinates.',
    segments: []
  },
  fastest: {
    id: 'route-fastest',
    name: 'Direct Route',
    coordinates: [],
    distanceMeters: null,
    durationMinutes: null,
    durationSeconds: null,
    isBlocked: false,
    blockedReason: null,
    score: null,
    barriers: [],
    segments: []
  }
};

const SAVED_GPS_KEY = 'raasta_last_known_gps';

export function NavigationProvider({ children }) {
  const [currentStep, setCurrentStep] = useState('map'); // 'map' | 'destination' | 'report' | 'results' | 'profile'
  const [selectedProfileId, setSelectedProfileId] = useState('wheelchair');
  const [preferences, setPreferences] = useState(ACCESSIBILITY_PROFILES[0].defaultPreferences);

  const [origin, setOrigin] = useState(() => ({
    id: 'origin-current',
    name: 'Current Location',
    subtitle: 'Acquiring GPS...',
    coordinates: null
  }));
  const [destinations, setDestinations] = useState(DEMO_DESTINATIONS);
  const [destination, setDestination] = useState(null);

  const [barriers, setBarriers] = useState(INITIAL_BARRIERS);
  const [accessibleFeatures, setAccessibleFeatures] = useState(INITIAL_ACCESSIBLE_FEATURES);
  const [routes, setRoutes] = useState(INITIAL_ROUTES_STATE);

  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isMobileFrameView, setIsMobileFrameView] = useState(true);
  const [isNavSimulating, setIsNavSimulating] = useState(false);
  const [currentSimSegment, setCurrentSimSegment] = useState(0);

  // Real browser/device GPS state - strictly null initially so no fake marker ever flashes
  const [userLocation, setUserLocation] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Automatically and immediately acquire real mobile/browser GPS location on app load
  useEffect(() => {
    // Clear any legacy mock or stale cached location so it never flashes a fake spot
    try {
      localStorage.removeItem(SAVED_GPS_KEY);
    } catch (e) {}

    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation
    ) {
      console.warn('[RAASTA] Geolocation not supported by this browser.');
      return;
    }

    console.log('[RAASTA] 🛰️ Initializing live device GPS on app load...');

    const applyLivePosition = (position, source = 'network') => {
      const {
        latitude,
        longitude,
        accuracy,
        heading,
        speed
      } = position.coords;

      const livePosition = {
        lat: latitude,
        lng: longitude,
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        timestamp: position.timestamp,
        isRealGps: true
      };

      console.log(`[RAASTA] 📍 Live device GPS fix (${source}):`, livePosition);

      try {
        localStorage.setItem(SAVED_GPS_KEY, JSON.stringify(livePosition));
      } catch (e) {}

      setUserLocation(livePosition);
      setGpsAccuracy(accuracy ?? null);
      setLocationError(null);

      setOrigin((prev) => ({
        ...prev,
        name: 'Current Location',
        subtitle: 'Live GPS Location',
        coordinates: {
          lat: latitude,
          lng: longitude
        }
      }));
    };

    const onLocationError = (error) => {
      console.warn('[RAASTA] Live GPS watch warning:', error);
      if (error.code === 1) {
        setLocationError(
          'Location permission denied. Allow location access in your browser to center on your current position.'
        );
      }
    };

    // 1. Fast Network/Wi-Fi fix: returns in <150ms on mobile devices
    navigator.geolocation.getCurrentPosition(
      (pos) => applyLivePosition(pos, 'initial-fix'),
      (err) => {
        console.warn('[RAASTA] Initial GPS error:', err);
        onLocationError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, []);

  const watchIdRef = useRef(null);
  const gpsActiveRef = useRef(false);
  const gpsRetryTimerRef = useRef(null);
  const reroutedBlockageRef = useRef(null);

  // Guidance session control: don't treat a blockage already beside the
  // user at the moment Start is pressed as a newly reached blockage.
  const guidanceStartLocationRef = useRef(null);
  const guidanceMovedAwayRef = useRef(false);

  // GPS movement / rerouting control.
  // Works with both real mobile GPS and browser GPS simulation.
  const lastRouteCalculationLocationRef = useRef(null);
  const routeCalculationInProgressRef = useRef(false);

  const [deafAlerts, setDeafAlerts] = useState(DEAF_MODE_ALERTS);
  const [activeToast, setActiveToast] = useState(null);
  const [isHapticVibrating, setIsHapticVibrating] = useState(false);
  const [emergencyStrobeActive, setEmergencyStrobeActive] = useState(false);
  const [civicModalOpen, setCivicModalOpen] = useState(false);

  const selectedProfile = ACCESSIBILITY_PROFILES.find(p => p.id === selectedProfileId) || ACCESSIBILITY_PROFILES[0];

  const [apiError, setApiError] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Calculate route using Dev2 endpoint when destination/profile changes
  const requestRouteCalculation = async (
    targetDest = destination,
    profileId = selectedProfileId,
    startOverride = null,
    extraBlockages = []
  ) => {
    console.log('[RAASTA DEBUG] 4. requestRouteCalculation() START');
    setIsCalculatingRoute(true);
    try {
      const rawStartLat = startOverride?.lat ?? userLocation?.lat;
      const rawStartLng = startOverride?.lng ?? userLocation?.lng;
      const rawDestLat = targetDest?.coordinates?.lat;
      const rawDestLng = targetDest?.coordinates?.lng;

      console.log('[RAASTA DEBUG] 2. GPS coordinates being used as start:', { lat: rawStartLat, lng: rawStartLng });
      console.log('[RAASTA DEBUG] 3. fixed destination coordinates:', { lat: rawDestLat, lng: rawDestLng });

      if (
        rawStartLat == null || rawStartLng == null ||
        rawDestLat == null || rawDestLng == null ||
        isNaN(Number(rawStartLat)) || isNaN(Number(rawStartLng)) ||
        isNaN(Number(rawDestLat)) || isNaN(Number(rawDestLng))
      ) {
        const missingErr = new Error('Current GPS location unavailable. Please ensure location services are enabled.');
        console.error('[RAASTA DEBUG] 18. CAUGHT EXCEPTION:', missingErr.message);
        throw missingErr;
      }

      const startLat = Number(rawStartLat);
      const startLng = Number(rawStartLng);
      const destLat = Number(rawDestLat);
      const destLng = Number(rawDestLng);

      // Unify community reported blockages and live road incidents at the same level
      const unifiedBlockages = [
        ...barriers,
        ...(Array.isArray(extraBlockages) ? extraBlockages : [])
      ];

      const result = await calculateRoute({
        start: { latitude: startLat, longitude: startLng },
        destination: { latitude: destLat, longitude: destLng },
        profile: profileId === 'deaf' ? 'deaf' : 'wheelchair',
        blockages: unifiedBlockages
      });

      if (!result || !result.success) {
        const failErr = new Error(result?.message || 'RAASTA could not calculate an accessible route.');
        console.error('[RAASTA DEBUG] 18. CAUGHT EXCEPTION: Backend returned non-success result:', result);
        throw failErr;
      }

      setApiError(null);

      // 7. routeData selected from response
      const accessibleRouteObj =
        result.accessible_route ||
        result.route ||
        (Array.isArray(result.routes) && result.routes.length > 0 ? result.routes[0] : null) ||
        result;

      console.log('[RAASTA DEBUG] 7. routeData selected from response:', accessibleRouteObj);

      // 8. extracted accessible route coordinates LENGTH
      const backendAccessibleCoords = extractBackendRouteCoordinates(accessibleRouteObj);
      console.log('[RAASTA DEBUG] 8. extracted accessible route coordinates LENGTH:', backendAccessibleCoords.length);

      if (!backendAccessibleCoords || backendAccessibleCoords.length < 2) {
        const errorReason = `Route geometry parsing failed. Extracted coordinates length is ${backendAccessibleCoords ? backendAccessibleCoords.length : 0} (expected >= 2). Raw route object: ${JSON.stringify(accessibleRouteObj)}`;
        console.error('[RAASTA DEBUG] 18. CAUGHT EXCEPTION:', errorReason);
        throw new Error(errorReason);
      }

      // 9. extracted direct route coordinates LENGTH
      const directRouteObj =
        result.direct_route ||
        result.fastest_route ||
        (Array.isArray(result.routes) && result.routes.length > 1 ? result.routes[1] : null) ||
        result.route ||
        accessibleRouteObj;

      const backendDirectCoords = extractBackendRouteCoordinates(directRouteObj);
      console.log('[RAASTA DEBUG] 9. extracted direct route coordinates LENGTH:', backendDirectCoords.length);

      // 10. distance
      const rawDistance = accessibleRouteObj.distance_meters !== undefined
        ? Number(accessibleRouteObj.distance_meters)
        : (accessibleRouteObj.distance !== undefined ? Number(accessibleRouteObj.distance) : (result.distance_meters ?? result.distance ?? null));
      const distanceMeters = rawDistance !== null && !isNaN(rawDistance) ? Math.round(rawDistance * 10) / 10 : null;
      console.log('[RAASTA DEBUG] 10. distance:', distanceMeters, 'meters');

      // 11. duration
      const rawDuration = accessibleRouteObj.duration_seconds !== undefined
        ? Number(accessibleRouteObj.duration_seconds)
        : (accessibleRouteObj.duration !== undefined ? Number(accessibleRouteObj.duration) : (result.duration_seconds ?? result.duration ?? null));
      const durationSeconds = rawDuration !== null && !isNaN(rawDuration) ? Number(rawDuration) : null;
      const durationMinutes = durationSeconds !== null ? Math.max(1, Math.round(durationSeconds / 60)) : null;
      console.log('[RAASTA DEBUG] 11. duration:', durationMinutes, 'minutes (', durationSeconds, 'seconds)');

      // 12. rerouted
      const isRerouted = Boolean(result.rerouted || accessibleRouteObj.rerouted);
      console.log('[RAASTA DEBUG] 12. rerouted:', isRerouted);

      // 13. score
      const realScore = result.accessibility_score?.score ?? result.score ?? accessibleRouteObj.score ?? null;
      const realScoreRating = result.accessibility_score?.grade ?? result.score_rating ?? accessibleRouteObj.scoreRating ?? null;
      console.log('[RAASTA DEBUG] 13. score:', realScore, 'rating:', realScoreRating);

      const alertsList = Array.isArray(result.alerts) ? result.alerts : (Array.isArray(result.visual_alerts) ? result.visual_alerts : []);

      // 14. setRoutes() called
      console.log('[RAASTA DEBUG] 14. setRoutes() called with coordinates length:', backendAccessibleCoords.length);
      setRoutes(prev => ({
        fastest: {
          ...prev.fastest,
          name: directRouteObj?.name || 'Direct Route',
          durationMinutes: directRouteObj?.duration_seconds ? Math.round(directRouteObj.duration_seconds / 60) : (directRouteObj?.duration ? Math.round(directRouteObj.duration / 60) : null),
          distanceMeters: directRouteObj?.distance_meters ?? directRouteObj?.distance ?? null,
          isBlocked: isRerouted,
          blockedReason: alertsList.length > 0 ? (typeof alertsList[0] === 'string' ? alertsList[0] : alertsList[0].message) : (isRerouted ? 'Blockage detected on direct route' : null),
          score: null,
          coordinates: backendDirectCoords.length > 0 ? backendDirectCoords : []
        },
        accessible: {
          ...prev.accessible,
          name: isRerouted ? 'Alternative Accessible Route' : 'Accessible Route',
          durationMinutes: durationMinutes,
          durationSeconds: durationSeconds,
          distanceMeters: distanceMeters,
          rerouted: isRerouted,
          status: isRerouted ? '✓ Alternative route found' : '✓ Accessible route found',
          score: realScore,
          scoreRating: realScoreRating,
          alerts: alertsList,
          message: result.message || (isRerouted ? 'Alternative detour route calculated to bypass blockage.' : 'Accessible route calculated successfully.'),
          summary: isRerouted ? 'Detour around blockage.' : 'Direct step-free route.',
          segments: (() => {
            const rawSegments = result.turn_by_turn || result.segments || result.steps ||
              accessibleRouteObj.turn_by_turn || accessibleRouteObj.segments || accessibleRouteObj.steps ||
              (Array.isArray(accessibleRouteObj.legs) ? accessibleRouteObj.legs.flatMap(l => l.steps || []) : null);

            if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
              return [];
            }

            return rawSegments.map((t, idx) => {
              let coords = null;
              if (t.coordinates) {
                coords = t.coordinates;
              } else if (t.location && Array.isArray(t.location) && t.location.length >= 2) {
                coords = { lat: Number(t.location[1]), lng: Number(t.location[0]) };
              } else if (t.lat != null && t.lng != null) {
                coords = { lat: Number(t.lat), lng: Number(t.lng) };
              }

              return {
                index: idx + 1,
                text: t.instruction || t.text || t.description || (t.maneuver && t.maneuver.instruction) || '',
                distance: t.distance_meters != null ? `${Math.round(t.distance_meters)} m` : (t.distance != null ? `${t.distance}` : ''),
                duration: t.duration_seconds != null ? `${Math.round(t.duration_seconds)} s` : (t.duration != null ? `${t.duration}` : ''),
                safe: t.is_hazard ? false : (t.safe !== false),
                highlight: t.highlight || t.visual_cue || '',
                coordinates: coords
              };
            }).filter(s => s.text);
          })(),
          coordinates: backendAccessibleCoords
        }
      }));

      // Parse Backend Alerts for deaf/visual mode
      if (alertsList.length > 0) {
        setDeafAlerts(alertsList.map((a, i) => ({
          id: `alert-backend-${i}`,
          title: typeof a === 'string' ? 'Blockage detected' : (a.title || 'Blockage detected'),
          subtitle: typeof a === 'string' ? a : (a.message || ''),
          type: 'hazard',
          severity: (typeof a === 'object' && a.severity) || 'high',
          timestamp: 'Real-time'
        })));
      }

      // Parse Backend Blockages
      if (result.blockages && Array.isArray(result.blockages) && result.blockages.length > 0) {
        const parsedBlockages = result.blockages.map((b, i) => {
          const lat = Number(b.latitude ?? b.lat ?? b.coordinates?.lat);
          const lng = Number(b.longitude ?? b.lng ?? b.coordinates?.lng);
          const rawType = (b.type || 'stairs').toLowerCase();
          const typeLabel = rawType === 'stairs' ? 'Stairs' : (rawType.charAt(0).toUpperCase() + rawType.slice(1));
          const severity = (b.severity || 'high').toLowerCase();
          const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
          const description = b.description || (rawType === 'stairs' ? 'Stairs blocking sidewalk' : `${typeLabel} blocking sidewalk`);
          return {
            id: b.id || `barr-backend-${i}-${lat}-${lng}`,
            title: b.title || typeLabel,
            type: rawType,
            typeLabel: typeLabel,
            severity: severity,
            severityLabel: severityLabel,
            locationName: b.location_name || b.locationName || `Obstacle at (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            coordinates: { lat, lng },
            reportedAt: 'Verified by Backend',
            verificationStatus: 'Verified by Backend',
            decayStatus: 'Active',
            description: description,
            isOnRouteA: true,
            isOnRouteB: false
          };
        }).filter(b => !isNaN(b.coordinates.lat) && !isNaN(b.coordinates.lng));

        if (parsedBlockages.length > 0) {
          setBarriers(parsedBlockages);
        }
      }

      // 15. requestRouteCalculation() SUCCESS/RESOLVED
      console.log('[RAASTA DEBUG] 15. requestRouteCalculation() SUCCESS/RESOLVED');
      return result;
    } catch (error) {
      console.error('[RAASTA DEBUG] 18. CAUGHT EXCEPTION in requestRouteCalculation:', error);
      setApiError(error.message || 'Error calculating route');
      showVisualToast({
        title: 'Route Calculation Failed',
        subtitle: error.message || 'Unable to calculate route',
        type: 'error'
      });
      throw error;
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Fetch dynamic locations and blockages from backend on mount
  useEffect(() => {
    async function initData() {
      // 1. Fetch Backend Locations
      try {
        const locs = await fetchLocations();
        if (Array.isArray(locs) && locs.length > 0) {
          const normalizedLocs = locs.map((l, idx) => {
            const lat = Number(l.latitude ?? l.lat ?? l.coordinates?.lat);
            const lng = Number(l.longitude ?? l.lng ?? l.coordinates?.lng);
            return {
              id: l.id || `dest-back-${idx}`,
              name: l.name || 'Accessible Destination',
              subtitle: l.subtitle || l.category || 'Verified Destination',
              address: l.address || l.subtitle || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              category: l.category || 'Transit',
              coordinates: { lat, lng }
            };
          }).filter(l => !isNaN(l.coordinates.lat) && !isNaN(l.coordinates.lng));

          if (normalizedLocs.length > 0) {
            setDestinations(normalizedLocs);
          }
        }
      } catch (err) {
        console.warn('[RAASTA] Locations fetch warning:', err);
      }

      // 2. Fetch Backend Blockages
      try {
        const blocks = await fetchBlockages();
        if (Array.isArray(blocks)) {
          const normalized = blocks.map((b, idx) => {
            const lat = Number(b.latitude ?? b.lat ?? b.coordinates?.lat);
            const lng = Number(b.longitude ?? b.lng ?? b.coordinates?.lng);
            const rawType = (b.type || 'stairs').toLowerCase();
            const typeLabel = rawType === 'stairs' ? 'Stairs' :
              rawType === 'broken_ramp' ? 'Broken Ramp' :
                (rawType.charAt(0).toUpperCase() + rawType.slice(1));
            const severity = (b.severity || 'high').toLowerCase();
            const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
            const description = b.description || `${typeLabel} blocking sidewalk`;

            return {
              id: b.id || `barr-${idx}-${lat}-${lng}`,
              title: b.title || typeLabel,
              type: rawType,
              typeLabel: typeLabel,
              severity: severity,
              severityLabel: severityLabel,
              locationName: b.location_name || b.locationName || `Obstacle at (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
              coordinates: { lat, lng },
              reportedAt: b.reported_at || b.reportedAt || 'Verified by Backend',
              verificationStatus: 'Verified by Backend',
              decayStatus: 'Active',
              description: description,
              isOnRouteA: true,
              isOnRouteB: false
            };
          }).filter(b => !isNaN(b.coordinates.lat) && !isNaN(b.coordinates.lng));

          setBarriers(normalized);
        }
      } catch (err) {
        console.warn('[RAASTA] Blockages fetch warning:', err);
      }
    }
    initData();
  }, []);

  const handleSelectProfile = (profileId) => {
    setSelectedProfileId(profileId);

    const prof = ACCESSIBILITY_PROFILES.find(p => p.id === profileId);

    if (prof) {
      setPreferences(prof.defaultPreferences);
    }

    if (profileId === 'deaf') {
      triggerHaptic([200, 100, 200]);
    }

    // Do NOT calculate a route here.
    // Route calculation happens only when Start Guidance is pressed.
  };

  const triggerHaptic = () => {
    // Haptic vibration disabled
  };

  const showVisualToast = (toastData) => {
    setActiveToast(toastData);
    if (selectedProfileId === 'deaf' || preferences.visualHapticAlerts) {
      triggerHaptic([100, 50, 100]);
    }
    setTimeout(() => {
      setActiveToast(null);
    }, 4000);
  };

  // Add barrier report to Dev1 and recalculate route dynamically
  const addBarrierReport = async (newBarrier) => {
    const rawLat = userLocation?.lat ?? newBarrier.latitude ?? newBarrier.coordinates?.lat ?? newBarrier.lat;
    const rawLng = userLocation?.lng ?? newBarrier.longitude ?? newBarrier.coordinates?.lng ?? newBarrier.lng;

    if (rawLat == null || rawLng == null || isNaN(Number(rawLat)) || isNaN(Number(rawLng))) {
      const err = new Error('Current location unavailable. Please enable location access.');
      showVisualToast({
        title: 'Location Unavailable',
        subtitle: 'Current location unavailable. Please enable location access.',
        type: 'error'
      });
      throw err;
    }

    const lat = Number(rawLat);
    const lng = Number(rawLng);

    const rawType = (newBarrier.type || newBarrier.category || 'stairs').toLowerCase();
    const typeLabel = newBarrier.typeLabel || (rawType === 'stairs' ? 'Pedestrian Stairs' : rawType === 'broken_ramp' ? 'Damaged Ramp' : 'Hazard Obstacle');
    const severity = (newBarrier.severity || 'high').toLowerCase();
    const severityLabel = `${severity.toUpperCase()} Severity Barrier`;
    const title = newBarrier.title || 'Obstacle Report';
    const description = newBarrier.description || (rawType === 'stairs' ? 'Stairs blocking accessible path' : 'Obstacle blocking accessible path');

    const blockagePayload = {
      type: rawType,
      title: title,
      description: description,
      latitude: lat,
      longitude: lng,
      severity: severity
    };

    let backendId = null;
    let isOffline = false;

    try {
      // Step 1: POST /api/blockages to Dev1
      const response = await reportBlockage(blockagePayload);
      console.log('[RAASTA] Dev1 saved blockage response:', response);

      // Step 2: Use the real ID returned from POST /api/blockages
      backendId = response?.id ?? response?.blockage?.id ?? response?.data?.id ?? response?.blockage_id ?? response?._id;
      isOffline = Boolean(response?.offline);
    } catch (err) {
      console.error('[RAASTA] Failed to save blockage in Dev1:', err);
      setApiError('Unable to connect to RAASTA server. Please try again.');
      showVisualToast({
        title: 'Report Failed',
        subtitle: err.message || 'Unable to connect to RAASTA server. Please try again.',
        type: 'error'
      });
      throw err;
    }

    const officialBarrier = {
      id: backendId || `dev1-blockage-${lat.toFixed(4)}-${lng.toFixed(4)}`,
      title: title,
      type: rawType,
      typeLabel: typeLabel,
      severity: severity,
      severityLabel: severityLabel,
      locationName: newBarrier.locationName || `Obstacle at (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      coordinates: { lat, lng },
      reportedAt: isOffline ? 'Saved Locally' : 'Just Now',
      verificationStatus: isOffline ? 'Saved locally. Not submitted to the RAASTA server.' : 'Verified by Dev1 Backend',
      decayStatus: 'Fresh',
      description: description,
      imageUrl: newBarrier.imageUrl,
      isOnRouteA: false,
      isOnRouteB: true
    };

    setBarriers(prev => [officialBarrier, ...prev.filter(b => b.id !== officialBarrier.id)]);

    showVisualToast({
      title: 'Blockage Reported',
      subtitle: isOffline
        ? 'Saved locally. Not submitted to the RAASTA server.'
        : 'Registered in Dev1 backend.',
      type: 'success'
    });

    return officialBarrier;
  };

  // ---------------------------------------------------------
  // REAL GPS GUIDANCE
  // ---------------------------------------------------------

  const handleGeolocationSuccess = (position) => {
    const {
      latitude,
      longitude,
      accuracy,
      heading,
      speed
    } = position.coords;

    const livePosition = {
      lat: latitude,
      lng: longitude,
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
      timestamp: position.timestamp
    };

    console.log('[RAASTA] 📍 Real GPS position:', livePosition);

    setUserLocation(livePosition);
    try {
      localStorage.setItem(SAVED_GPS_KEY, JSON.stringify(livePosition));
    } catch (e) {}
    setGpsAccuracy(accuracy ?? null);
    setLocationError(null);

    // -------------------------------------------------------
    // GUIDANCE START POSITION / BLOCKAGE GATING
    // -------------------------------------------------------
    const distanceFromGuidanceStart = (lat1, lng1, lat2, lng2) => {
      const R = 6371000;
      const toRad = (value) => (value * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    if (!guidanceStartLocationRef.current) {
      guidanceStartLocationRef.current = {
        lat: latitude,
        lng: longitude
      };
      guidanceMovedAwayRef.current = false;
      console.log('[RAASTA] 🧭 Guidance baseline set:', latitude, longitude);
    } else if (!guidanceMovedAwayRef.current) {
      const movedFromStart = distanceFromGuidanceStart(
        guidanceStartLocationRef.current.lat,
        guidanceStartLocationRef.current.lng,
        latitude,
        longitude
      );

      if (movedFromStart >= 25) {
        guidanceMovedAwayRef.current = true;
        console.log(
          `[RAASTA] 🧭 User moved ${Math.round(movedFromStart)}m from guidance start — blockage detection enabled.`
        );
      }
    }

    // -------------------------------------------------------
    // MOBILE GPS POSITION
    // -------------------------------------------------------
    // Keep the live GPS marker updated while guidance is active.
    // Do NOT recalculate the route merely because the user moved 50m.
    // RAASTA reroutes only when a relevant blockage is detected.
    // -------------------------------------------------------
    // WHEELCHAIR BLOCKAGE DETECTION
    // -------------------------------------------------------

    if (
      selectedProfileId === 'wheelchair' &&
      barriers.length > 0 &&
      guidanceMovedAwayRef.current
    ) {
      const distanceInMeters = (
        lat1,
        lng1,
        lat2,
        lng2
      ) => {
        const R = 6371000;

        const toRad = (value) =>
          (value * Math.PI) / 180;

        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLng / 2) ** 2;

        return (
          2 *
          R *
          Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
          )
        );
      };

      const nearbyBlockage = barriers.find((barrier) => {
        const barrierLat = Number(
          barrier.coordinates?.lat ??
          barrier.latitude
        );

        const barrierLng = Number(
          barrier.coordinates?.lng ??
          barrier.longitude
        );

        if (
          Number.isNaN(barrierLat) ||
          Number.isNaN(barrierLng)
        ) {
          return false;
        }

        const distance = distanceInMeters(
          latitude,
          longitude,
          barrierLat,
          barrierLng
        );

        return distance <= 30;
      });

      if (nearbyBlockage) {
        const blockageId =
          nearbyBlockage.id ??
          nearbyBlockage._id ??
          `${nearbyBlockage.coordinates?.lat}-${nearbyBlockage.coordinates?.lng}`;

        // Prevent repeated rerouting for the same blockage.
        if (reroutedBlockageRef.current !== blockageId) {
          reroutedBlockageRef.current = blockageId;

          console.log(
            '[RAASTA] 🚨 BLOCKAGE REACHED:',
            nearbyBlockage
          );

          console.log(
            '[RAASTA] 🔄 Recalculating accessible route...'
          );

          requestRouteCalculation(
            destination,
            selectedProfileId,
            {
              lat: latitude,
              lng: longitude
            }
          ).catch((error) => {
            console.error(
              '[RAASTA] Reroute failed:',
              error
            );
          });
        }
      }
    }
  };

  // ---------------------------------------------------------
  // START GPS GUIDANCE
  // ---------------------------------------------------------

  const startGpsGuidance = () => {
    try {
      console.log('[RAASTA DEBUG] 17. startGpsGuidance() START');
      if (
        typeof navigator === 'undefined' ||
        !navigator.geolocation
      ) {
        setLocationError(
          'Geolocation is not supported by this browser.'
        );
        return;
      }

      if (gpsActiveRef.current) {
        console.log(
          '[RAASTA DEBUG] 17. startGpsGuidance(): GPS guidance already active.'
        );
        return;
      }

      console.log(
        '[RAASTA DEBUG] 17. startGpsGuidance(): Starting GPS guidance with real browser/mobile GPS...'
      );

      gpsActiveRef.current = true;

      // Allow a new blockage detection session.
      reroutedBlockageRef.current = null;

      // A new guidance session starts a fresh movement baseline.
      lastRouteCalculationLocationRef.current = null;
      routeCalculationInProgressRef.current = false;
      guidanceStartLocationRef.current = null;
      guidanceMovedAwayRef.current = false;

      setLocationError(null);
      setIsNavSimulating(true);

    const startWatching = () => {
      if (!gpsActiveRef.current) {
        return;
      }

      if (gpsRetryTimerRef.current) {
        clearTimeout(gpsRetryTimerRef.current);
        gpsRetryTimerRef.current = null;
      }

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
        watchIdRef.current = null;
      }

      console.log(
        '[RAASTA] Starting GPS watch...'
      );

      watchIdRef.current =
        navigator.geolocation.watchPosition(
          handleGeolocationSuccess,

          (error) => {
            console.warn(
              '[RAASTA] GPS error:',
              error
            );

            if (!gpsActiveRef.current) {
              return;
            }

            // Permission denied.
            // Do NOT fall back to an automatically moving demo location.
            // Real browser/mobile GPS is the source of truth.
            if (error.code === 1) {
              console.warn(
                '[RAASTA] GPS permission denied. Real GPS is required.'
              );

              setLocationError(
                'Location permission denied. Please allow location access for RAASTA.'
              );
              return;
            }

            // Position unavailable / timeout
            if (
              error.code === 2 ||
              error.code === 3
            ) {
              setLocationError(
                error.code === 2
                  ? 'Unable to determine your location. Still trying...'
                  : 'GPS is taking longer than expected. Still trying...'
              );

              // Retry after 3 seconds.
              gpsRetryTimerRef.current =
                setTimeout(() => {
                  gpsRetryTimerRef.current = null;
                  startWatching();
                }, 3000);
            }
          },

          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 5000
          }
        );
    };

    startWatching();
    } catch (exc) {
      console.error('[RAASTA DEBUG] 18. CAUGHT EXCEPTION in startGpsGuidance:', exc);
      throw exc;
    }
  };

  // ---------------------------------------------------------
  // STOP GPS GUIDANCE
  // ---------------------------------------------------------

  const stopGpsGuidance = () => {
    console.log(
      '[RAASTA] Stopping GPS guidance...'
    );

    gpsActiveRef.current = false;

    if (gpsRetryTimerRef.current) {
      clearTimeout(gpsRetryTimerRef.current);
      gpsRetryTimerRef.current = null;
    }

    if (
      watchIdRef.current !== null &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );
      watchIdRef.current = null;
    }

    setIsNavSimulating(false);

    // Reset movement tracking so the next guidance session starts
    // from its first real GPS fix.
    lastRouteCalculationLocationRef.current = null;
    routeCalculationInProgressRef.current = false;
    guidanceStartLocationRef.current = null;
    guidanceMovedAwayRef.current = false;

    console.log(
      '[RAASTA] GPS guidance stopped.'
    );
  };

  // ---------------------------------------------------------
  // GPS CLEANUP
  // ---------------------------------------------------------

  useEffect(() => {
    return () => {
      gpsActiveRef.current = false;

      if (gpsRetryTimerRef.current) {
        clearTimeout(gpsRetryTimerRef.current);
        gpsRetryTimerRef.current = null;
      }

      if (
        watchIdRef.current !== null &&
        typeof navigator !== 'undefined' &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
        watchIdRef.current = null;
      }
    };
  }, []);

  const removeBarrierReport = async (barrierId) => {
    if (!barrierId) {
      throw new Error('Invalid blockage ID');
    }

    try {
      console.log('[RAASTA] Removing blockage:', barrierId);

      await deleteBlockage(barrierId);

      setBarriers(prev =>
        prev.filter(barrier => String(barrier.id) !== String(barrierId))
      );

      showVisualToast({
        title: 'Blockage Removed',
        subtitle: 'The report is no longer active.',
        type: 'success'
      });

      // Refresh the route using the remaining active blockages.
      try {
        await requestRouteCalculation(destination, selectedProfileId);
      } catch (routeError) {
        console.warn(
          '[RAASTA] Route refresh after blockage removal failed:',
          routeError
        );
      }

      return true;
    } catch (error) {
      console.error('[RAASTA] Failed to remove blockage:', error);

      showVisualToast({
        title: 'Remove Failed',
        subtitle: 'Unable to remove this blockage.',
        type: 'error'
      });

      throw error;
    }
  };

  const value = {
    currentStep,
    setCurrentStep,
    selectedProfile,
    selectedProfileId,
    handleSelectProfile,
    preferences,
    setPreferences,
    origin,
    setOrigin,
    destinations,
    setDestinations,
    destination,
    setDestination,
    barriers,
    accessibleFeatures,
    routes,
    isHighContrast,
    setIsHighContrast,
    isMobileFrameView,
    setIsMobileFrameView,
    isNavSimulating,
    setIsNavSimulating,
    currentSimSegment,
    setCurrentSimSegment,

    userLocation,
    gpsAccuracy,
    locationError,
    startGpsGuidance,
    stopGpsGuidance,

    deafAlerts,
    activeToast,
    showVisualToast,
    isHapticVibrating,
    triggerHaptic,
    emergencyStrobeActive,
    setEmergencyStrobeActive,
    addBarrierReport,
    removeBarrierReport,
    civicModalOpen,
    setCivicModalOpen,
    requestRouteCalculation,
    isCalculatingRoute,
    apiError,
    setApiError
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}