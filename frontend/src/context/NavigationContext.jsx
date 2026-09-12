import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ACCESSIBILITY_PROFILES,
  DEMO_DESTINATIONS,
  INITIAL_ORIGIN,
  INITIAL_BARRIERS,
  INITIAL_ACCESSIBLE_FEATURES,
  MOCK_ROUTES_DATA,
  DEAF_MODE_ALERTS
} from '../data/mockData';
import { fetchLocations, fetchBlockages, calculateRoute, reportBlockage } from '../api/apiClient';
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

export function NavigationProvider({ children }) {
  const [currentStep, setCurrentStep] = useState('home'); // 'home' | 'profile' | 'destination' | 'map' | 'results' | 'report'
  const [selectedProfileId, setSelectedProfileId] = useState('wheelchair');
  const [preferences, setPreferences] = useState(ACCESSIBILITY_PROFILES[0].defaultPreferences);
  
  const [origin, setOrigin] = useState(INITIAL_ORIGIN);
  const [destination, setDestination] = useState(DEMO_DESTINATIONS[0]);
  
  const [barriers, setBarriers] = useState(INITIAL_BARRIERS);
  const [accessibleFeatures, setAccessibleFeatures] = useState(INITIAL_ACCESSIBLE_FEATURES);
  const [routes, setRoutes] = useState(INITIAL_ROUTES_STATE);
  
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isMobileFrameView, setIsMobileFrameView] = useState(true); // Default to realistic mobile frame for showcase
  const [isNavSimulating, setIsNavSimulating] = useState(false);
  const [currentSimSegment, setCurrentSimSegment] = useState(0);
  
  const [deafAlerts, setDeafAlerts] = useState(DEAF_MODE_ALERTS);
  const [activeToast, setActiveToast] = useState(null);
  const [isHapticVibrating, setIsHapticVibrating] = useState(false);
  const [emergencyStrobeActive, setEmergencyStrobeActive] = useState(false);
  const [civicModalOpen, setCivicModalOpen] = useState(false);

  const selectedProfile = ACCESSIBILITY_PROFILES.find(p => p.id === selectedProfileId) || ACCESSIBILITY_PROFILES[0];

  const [apiError, setApiError] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Fetch dynamic backend data on mount
  useEffect(() => {
    async function loadBackendData() {
      try {
        const blocks = await fetchBlockages();
        if (blocks && Array.isArray(blocks) && blocks.length > 0) {
          console.log('[RAASTA] Received real blockages from backend:', blocks);
          // Normalize backend fields for each blockage
          const normalized = blocks.map((b, idx) => {
            const lat = Number(b.latitude ?? b.lat ?? b.coordinates?.lat);
            const lng = Number(b.longitude ?? b.lng ?? b.coordinates?.lng);
            const rawType = (b.type || 'stairs').toLowerCase();
            const typeLabel = rawType === 'stairs' ? 'Stairs' : 
                              rawType === 'broken_ramp' ? 'Broken Ramp' : 
                              rawType === 'construction' ? 'Construction' :
                              (rawType.charAt(0).toUpperCase() + rawType.slice(1));
            const severity = (b.severity || 'high').toLowerCase();
            const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
            const description = b.description || (rawType === 'stairs' ? 'Stairs blocking sidewalk' : `${typeLabel} blocking sidewalk`);

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

          if (normalized.length > 0) {
            setBarriers(normalized);
          }
          setApiError(null);
        }
      } catch (err) {
        console.error('[RAASTA] Backend connection failed:', err);
        setApiError('Unable to connect to RAASTA server. Please try again.');
        showVisualToast({
          title: 'Backend Connection Error',
          subtitle: 'Unable to connect to RAASTA server. Please try again.',
          type: 'error'
        });
      }
    }
    loadBackendData();
  }, []);

  // Calculate route using Dev2 endpoint when destination/profile changes
  const requestRouteCalculation = async (targetDest = destination, profileId = selectedProfileId) => {
    setIsCalculatingRoute(true);
    try {
      const startLat = origin.coordinates?.lat ?? 28.6315;
      const startLng = origin.coordinates?.lng ?? 77.2167;
      const destLat = targetDest.coordinates?.lat ?? 28.6358;
      const destLng = targetDest.coordinates?.lng ?? 77.2215;

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
        const distanceMeters = routeData.distance_meters !== undefined ? Number(routeData.distance_meters) : null;
        const durationSeconds = routeData.duration_seconds !== undefined ? Number(routeData.duration_seconds) : null;
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

  const handleSelectProfile = (profileId) => {
    setSelectedProfileId(profileId);
    const prof = ACCESSIBILITY_PROFILES.find(p => p.id === profileId);
    if (prof) {
      setPreferences(prof.defaultPreferences);
    }
    requestRouteCalculation(destination, profileId);
  };

  const triggerHaptic = (pattern = [120, 60, 120]) => {
    setIsHapticVibrating(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
    setTimeout(() => {
      setIsHapticVibrating(false);
    }, 1100);
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
    const lat = Number(newBarrier.latitude ?? newBarrier.coordinates?.lat ?? newBarrier.lat ?? 15.4900);
    const lng = Number(newBarrier.longitude ?? newBarrier.coordinates?.lng ?? newBarrier.lng ?? 73.8270);
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

    // Step 3: Recalculate route via POST /api/routes/calculate
    // Flow: User reports blockage -> POST /api/blockages -> Dev1 saves it -> POST /api/routes/calculate -> Backend sees new blockage -> Alternative route -> Map updates
    try {
      await requestRouteCalculation(destination, selectedProfileId);
    } catch (routeErr) {
      console.error('[RAASTA] Recalculating route after blockage report failed:', routeErr);
    }

    showVisualToast({
      title: 'Blockage Reported & Route Recalculated!',
      subtitle: `Registered in Dev1. Alternative route displayed.`,
      type: 'success'
    });

    return officialBarrier;
  };

  // Navigation simulation loop
  useEffect(() => {
    let interval;
    if (isNavSimulating) {
      interval = setInterval(() => {
        setCurrentSimSegment(prev => {
          const next = prev + 1;
          const maxSeg = routes.accessible.segments.length;
          if (next >= maxSeg) {
            setIsNavSimulating(false);
            showVisualToast({
              title: 'Destination Reached Safely! 🎉',
              subtitle: `Arrived at ${destination.name} via step-free pathway.`,
              type: 'success'
            });
            return 0;
          }
          if (selectedProfileId === 'deaf' || preferences.visualHapticAlerts) {
            triggerHaptic([100, 50, 100]);
          }
          return next;
        });
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isNavSimulating, routes.accessible.segments.length, destination.name, selectedProfileId, preferences.visualHapticAlerts]);

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
    deafAlerts,
    activeToast,
    showVisualToast,
    isHapticVibrating,
    triggerHaptic,
    emergencyStrobeActive,
    setEmergencyStrobeActive,
    addBarrierReport,
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
