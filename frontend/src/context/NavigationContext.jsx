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

function getStoredLocation() {
  try {
    const saved = localStorage.getItem(SAVED_GPS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

export function NavigationProvider({ children }) {
  const [currentStep, setCurrentStep] = useState('map'); // 'map' | 'destination' | 'report' | 'results' | 'profile'
  const [selectedProfileId, setSelectedProfileId] = useState('wheelchair');
  const [preferences, setPreferences] = useState(ACCESSIBILITY_PROFILES[0].defaultPreferences);

  const [origin, setOrigin] = useState(() => {
    const saved = getStoredLocation();
    if (saved) {
      return {
        id: 'origin-current',
        name: 'Current Location',
        subtitle: 'Live GPS Location',
        coordinates: {
          lat: saved.lat,
          lng: saved.lng
        }
      };
    }
    return INITIAL_ORIGIN;
  });
  const [destination, setDestination] = useState(DEMO_DESTINATIONS[0]);

  const [barriers, setBarriers] = useState(INITIAL_BARRIERS);
  const [accessibleFeatures, setAccessibleFeatures] = useState(INITIAL_ACCESSIBLE_FEATURES);
  const [routes, setRoutes] = useState(INITIAL_ROUTES_STATE);

  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isMobileFrameView, setIsMobileFrameView] = useState(true);
  const [isNavSimulating, setIsNavSimulating] = useState(false);
  const [currentSimSegment, setCurrentSimSegment] = useState(0);

  // Real browser GPS state - initialized from last known location if available
  const [userLocation, setUserLocation] = useState(getStoredLocation);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Get one real GPS fix as soon as the app loads.
  // This updates the app's origin/current location without starting guidance
  // or calculating a route automatically.
  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation
    ) {
      return;
    }

    console.log('[RAASTA] Requesting current GPS location on app load...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
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

        console.log(
          '[RAASTA] 📍 Initial real GPS location:',
          livePosition
        );

        // Save to localStorage for instant centering on next reload
        try {
          localStorage.setItem(SAVED_GPS_KEY, JSON.stringify(livePosition));
        } catch (e) {}

        // Make the real phone GPS the app origin.
        setUserLocation(livePosition);
        setGpsAccuracy(accuracy ?? null);
        setOrigin((previousOrigin) => ({
          ...previousOrigin,
          name: 'Current Location',
          coordinates: {
            ...(previousOrigin?.coordinates || {}),
            lat: latitude,
            lng: longitude
          }
        }));
        setLocationError(null);
      },
      (error) => {
        console.warn(
          '[RAASTA] Initial GPS location unavailable:',
          error
        );

        if (error.code === 1) {
          setLocationError(
            'Location permission denied. Allow location access to use your current GPS location.'
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
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
    startOverride = null
  ) => {
    setIsCalculatingRoute(true);
    try {
      const startLat = startOverride?.lat ?? origin.coordinates?.lat ?? 15.4910;

      const startLng = startOverride?.lng ?? origin.coordinates?.lng ?? 73.8260;
      const destLat = targetDest.coordinates?.lat ?? 15.4950;
      const destLng = targetDest.coordinates?.lng ?? 73.8310;

      const result = await calculateRoute({
        start: { latitude: Number(startLat), longitude: Number(startLng) },
        destination: { latitude: Number(destLat), longitude: Number(destLng) },
        profile: profileId === 'deaf' ? 'deaf' : 'wheelchair'
      });

      if (result) {
        console.log('[RAASTA] Received calculated route from backend:', result);
        setApiError(null);

        // 1. Extract backend accessible coordinates (Backend -> coordinates -> Leaflet Polyline)
        const routeData = result.route || result;
        const backendAccessibleCoords = extractBackendRouteCoordinates(
          routeData.coordinates ||
          routeData ||
          result.alternative_route ||
          result.accessible_route ||
          result.safe_route ||
          (result.coordinates ? result : null) ||
          (result.routes && result.routes[0] ? result.routes[0] : null)
        );

        // 2. Extract backend direct coordinates
        const backendDirectCoords = extractBackendRouteCoordinates(
          result.direct_route ||
          result.fastest_route ||
          (result.routes && result.routes[1] ? result.routes[1] : null)
        );

        // 3. Extract actual backend distance, duration, rerouted status, alerts
        const rawDistance = routeData.distance_meters !== undefined
          ? Number(routeData.distance_meters)
          : (routeData.distance !== undefined ? Number(routeData.distance) : null);
        const distanceMeters = rawDistance !== null ? Math.round(rawDistance * 10) / 10 : null;

        const rawDuration = routeData.duration_seconds !== undefined
          ? Number(routeData.duration_seconds)
          : (routeData.duration !== undefined ? Number(routeData.duration) : null);
        const durationSeconds = rawDuration !== null ? Number(rawDuration) : null;
        const durationMinutes = durationSeconds !== null ? Math.max(1, Math.round(durationSeconds / 60)) : null;
        const isRerouted = Boolean(result.rerouted);
        const alertsList = Array.isArray(result.alerts) ? result.alerts : (Array.isArray(result.visual_alerts) ? result.visual_alerts : []);

        // 4. Real score ONLY if returned by backend (do NOT fabricate)
        const realScore = result.accessibility_score?.score ?? result.score ?? routeData.score ?? null;
        const realScoreRating = result.accessibility_score?.grade ?? result.score_rating ?? null;

        // Update state with genuine backend route information
        setRoutes(prev => ({
          fastest: {
            ...prev.fastest,
            name: result.direct_route?.name || 'Direct Route',
            durationMinutes: result.direct_route?.duration_seconds ? Math.round(result.direct_route.duration_seconds / 60) : null,
            distanceMeters: result.direct_route?.distance_meters ?? null,
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
            segments: (result.turn_by_turn || result.segments || result.steps)?.map(t => ({
              text: t.instruction || t.text || t.description,
              distance: t.distance || '',
              safe: !t.is_hazard && t.safe !== false,
              highlight: t.highlight || t.visual_cue || ''
            })) || [],
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

        return result;
      }
    } catch (e) {
      console.error('[RAASTA] Route calculation failed:', e);
      setApiError('Unable to connect to RAASTA server. Please try again.');
      showVisualToast({
        title: 'Connection Error',
        subtitle: 'Unable to connect to RAASTA server. Please try again.',
        type: 'error'
      });
      throw e;
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // Fetch dynamic blockages and calculate initial route on mount
  useEffect(() => {
    async function initData() {
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
    // 1. Convert coordinates: coordinates.lat -> latitude, coordinates.lng -> longitude
    // A report made during/after real GPS guidance must use the phone's
    // latest GPS position instead of the selected sample/preset location.
    const gpsReportLat = isNavSimulating ? userLocation?.lat : null;
    const gpsReportLng = isNavSimulating ? userLocation?.lng : null;

    const lat = Number(
      gpsReportLat != null
        ? gpsReportLat
        : (newBarrier.latitude ?? newBarrier.coordinates?.lat ?? newBarrier.lat ?? 15.4900)
    );
    const lng = Number(
      gpsReportLng != null
        ? gpsReportLng
        : (newBarrier.longitude ?? newBarrier.coordinates?.lng ?? newBarrier.lng ?? 73.8270)
    );
    const rawType = (newBarrier.type || newBarrier.category || 'stairs').toLowerCase();
    const typeLabel = newBarrier.typeLabel || (rawType === 'stairs' ? 'Pedestrian Stairs' : rawType === 'broken_ramp' ? 'Damaged Ramp' : 'Hazard Obstacle');
    const severity = (newBarrier.severity || 'high').toLowerCase();
    const severityLabel = `${severity.toUpperCase()} Severity Barrier`;
    const title = newBarrier.title || 'Integration Test Stairs';
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

    try {
      // Step 1: POST /api/blockages to Dev1
      const response = await reportBlockage(blockagePayload);
      console.log('[RAASTA] Dev1 saved blockage response:', response);

      // Step 2: Use the real ID returned from POST /api/blockages
      backendId = response?.id ?? response?.blockage?.id ?? response?.data?.id ?? response?.blockage_id ?? response?._id;
    } catch (err) {
      console.error('[RAASTA] Failed to save blockage in Dev1:', err);
      setApiError('Unable to connect to RAASTA server. Please try again.');
      showVisualToast({
        title: 'Report Failed',
        subtitle: 'Unable to connect to RAASTA server. Please try again.',
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
      reportedAt: 'Just Now',
      verificationStatus: 'Verified by Dev1 Backend',
      decayStatus: 'Fresh',
      description: description,
      imageUrl: newBarrier.imageUrl,
      isOnRouteA: false,
      isOnRouteB: true
    };

    setBarriers(prev => [officialBarrier, ...prev.filter(b => b.id !== officialBarrier.id)]);

    // Step 3:
    // Save the report immediately. If the report was made at the user's
    // current GPS position, do NOT immediately reroute around a blockage
    // that the user is already standing on. The backend will use this
    // blockage for future route calculations, and normal GPS blockage
    // detection will reroute when the user encounters a blockage ahead.
    const reportIsAtCurrentGps =
      isNavSimulating &&
      userLocation?.lat != null &&
      userLocation?.lng != null;

    if (!reportIsAtCurrentGps) {
      try {
        await requestRouteCalculation(
          destination,
          selectedProfileId
        );
      } catch (routeErr) {
        console.error('[RAASTA] Recalculating route after blockage report failed:', routeErr);
      }
    }

    showVisualToast({
      title: 'Blockage Reported',
      subtitle: reportIsAtCurrentGps
        ? 'Saved at your current GPS location.'
        : 'Registered in Dev1 and route updated.',
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
        '[RAASTA] GPS guidance already active.'
      );
      return;
    }

    console.log(
      '[RAASTA] Starting GPS guidance with real browser/mobile GPS...'
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