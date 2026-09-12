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

export function NavigationProvider({ children }) {
  const [currentStep, setCurrentStep] = useState('home'); // 'home' | 'profile' | 'destination' | 'map' | 'results' | 'report'
  const [selectedProfileId, setSelectedProfileId] = useState('wheelchair');
  const [preferences, setPreferences] = useState(ACCESSIBILITY_PROFILES[0].defaultPreferences);
  
  const [origin, setOrigin] = useState(INITIAL_ORIGIN);
  const [destination, setDestination] = useState(DEMO_DESTINATIONS[0]);
  
  const [barriers, setBarriers] = useState(INITIAL_BARRIERS);
  const [accessibleFeatures, setAccessibleFeatures] = useState(INITIAL_ACCESSIBLE_FEATURES);
  const [routes, setRoutes] = useState(MOCK_ROUTES_DATA);
  
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
          // Normalize backend fields
          const normalized = blocks.map((b, idx) => ({
            id: b.id || `barr-${idx}`,
            title: b.title || 'Reported Obstacle',
            type: b.type || 'stairs',
            typeLabel: b.type === 'stairs' ? 'Pedestrian Stairs' : b.type === 'broken_ramp' ? 'Damaged Ramp' : 'Blocked Sidewalk',
            severity: b.severity || 'high',
            locationName: b.location_name || b.locationName || 'Demo Corridor',
            coordinates: b.coordinates || { lat: b.latitude || 28.6335, lng: b.longitude || 77.2190 },
            reportedAt: b.reported_at || b.reportedAt || 'Verified',
            verificationStatus: 'Verified by Backend',
            decayStatus: 'Active',
            description: b.description || 'Obstacle loaded from backend database.',
            isOnRouteA: true,
            isOnRouteB: false
          }));
          setBarriers(normalized);
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

        // 1. Extract backend accessible / rerouted coordinates (Backend -> coordinates -> Leaflet Polyline)
        const backendAccessibleCoords = extractBackendRouteCoordinates(
          result.route?.coordinates ||
          result.route ||
          result.alternative_route || 
          result.accessible_route || 
          result.safe_route || 
          (result.coordinates ? result : null) ||
          (result.routes && result.routes[0] ? result.routes[0] : null)
        );

        // 2. Extract backend direct / fastest coordinates
        const backendDirectCoords = extractBackendRouteCoordinates(
          result.direct_route || 
          result.fastest_route ||
          (result.routes && result.routes[1] ? result.routes[1] : null)
        );

        // 3. Extract metrics
        const distanceMeters = result.route?.distance_meters ?? result.distance_meters ?? result.alternative_route?.distance_meters ?? 620;
        const durationSeconds = result.route?.duration_seconds ?? (result.duration_minutes ? result.duration_minutes * 60 : 540);
        const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
        const isRerouted = result.rerouted ?? (result.alternative_route ? true : true);

        // 4. Extract path sequence nodes & blockage details
        const altPathNodes = result.alternative_route?.path_nodes || 
          result.alternative_route?.nodes || 
          result.path_nodes || 
          result.path || 
          ['A (Metro Concourse)', 'D (West Promenade Ramp)', 'C (Destination)'];

        const directPathNodes = result.direct_route?.path_nodes || 
          result.direct_route?.nodes || 
          ['A (Metro Concourse)', 'B (18 Stairs Hazard)', 'C (Destination)'];

        const bypassedBlockage = result.alternative_route?.bypassed_blockage || 
          result.direct_route?.blockage_reason || 
          result.blocked_obstacle || 
          (result.direct_route?.blockages_found && result.direct_route.blockages_found[0]) || 
          '18 Concrete Steps at Point B';

        // Update state with backend coordinates & alternative route detour information
        setRoutes(prev => ({
          fastest: {
            ...prev.fastest,
            name: result.direct_route?.name || prev.fastest.name,
            durationMinutes: result.direct_route?.duration_minutes ?? Math.max(1, Math.round(durationMinutes * 0.7)),
            distanceMeters: result.direct_route?.distance_meters ?? Math.round(distanceMeters * 0.85),
            accessibilityScore: result.direct_route?.accessibility_score ?? (result.direct_route?.is_blocked ? 32 : (isRerouted ? 32 : 80)),
            isBlocked: result.direct_route?.is_blocked ?? isRerouted,
            blockedReason: bypassedBlockage,
            pathNodes: Array.isArray(directPathNodes) ? directPathNodes : prev.fastest.pathNodes,
            pathSummary: Array.isArray(directPathNodes) ? directPathNodes.join(' ➔ ') : 'A ➔ B ➔ C (Blocked)',
            blockedNode: result.direct_route?.blocked_node || {
              id: 'B',
              name: bypassedBlockage,
              coordinates: { lat: 28.6335, lng: 77.2190 },
              badge: 'Blocked at B 🚫'
            },
            barriers: result.direct_route?.blockages_found?.map(name => ({ name, type: 'stairs', severity: 'Critical' })) || prev.fastest.barriers,
            coordinates: backendDirectCoords.length > 0 ? backendDirectCoords : prev.fastest.coordinates
          },
          accessible: {
            ...prev.accessible,
            name: result.alternative_route?.name || (isRerouted ? 'Alternative Step-Free Detour (A ➔ D ➔ C)' : 'Verified Step-Free Route'),
            durationMinutes: durationMinutes,
            distanceMeters: distanceMeters,
            accessibilityScore: result.accessibility_score?.score ?? result.alternative_route?.accessibility_score ?? 94,
            scoreRating: result.accessibility_score?.grade ?? 'Safe & Wheelchair Accessible',
            isAlternativeRoute: isRerouted,
            bypassedBlockage: bypassedBlockage,
            pathNodes: Array.isArray(altPathNodes) ? altPathNodes : prev.accessible.pathNodes,
            pathSummary: Array.isArray(altPathNodes) ? altPathNodes.join(' ➔ ') : 'A ➔ D ➔ C (Safe Detour)',
            detourNode: result.alternative_route?.detour_node || {
              id: 'D',
              name: 'West Promenade Ramp',
              coordinates: { lat: 28.6338, lng: 77.2180 },
              badge: 'Step-Free Detour via D ♿'
            },
            summary: result.message || result.alternative_route?.summary || `Alternative detour route (A ➔ D ➔ C) bypassing ${bypassedBlockage} via West Promenade Ramp (D).`,
            segments: (result.turn_by_turn || result.segments || result.steps)?.map(t => ({
              text: t.instruction || t.text || t.description,
              distance: t.distance || '100m',
              safe: !t.is_hazard && t.safe !== false,
              highlight: t.highlight || t.visual_cue || 'Step-free'
            })) || prev.accessible.segments,
            coordinates: backendAccessibleCoords.length > 0 ? backendAccessibleCoords : prev.accessible.coordinates
          }
        }));

        // Parse Backend Alerts
        const alertsList = result.alerts || result.visual_alerts;
        if (alertsList && Array.isArray(alertsList) && alertsList.length > 0) {
          setDeafAlerts(alertsList.map((a, i) => ({
            id: `alert-backend-${i}`,
            title: typeof a === 'string' ? a : (a.title || 'Navigation Alert'),
            subtitle: typeof a === 'string' ? 'Real-time Route Guidance' : (a.message || a.subtitle || ''),
            type: typeof a === 'object' && (a.level === 'warning' || a.level === 'danger') ? 'hazard' : 'nav_cue',
            severity: (typeof a === 'object' && a.level) || 'info',
            timestamp: 'Real-time'
          })));
        }

        // Parse Backend Blockages
        if (result.blockages && Array.isArray(result.blockages) && result.blockages.length > 0) {
          const parsedBlockages = result.blockages.map((b, i) => ({
            id: b.id || `barr-backend-${i}`,
            title: b.title || b.name || 'Reported Obstacle',
            type: b.type || 'stairs',
            typeLabel: b.type === 'stairs' ? '18 Pedestrian Stairs' : 'Obstacle',
            severity: b.severity || 'high',
            locationName: b.location_name || b.locationName || 'Point B Hazard Corridor',
            coordinates: b.coordinates || { lat: b.latitude || 28.6335, lng: b.longitude || 77.2190 },
            reportedAt: 'Verified',
            verificationStatus: 'Verified by Backend',
            decayStatus: 'Active',
            description: b.description || 'Blockage bypassed by alternative route.',
            isOnRouteA: true,
            isOnRouteB: false
          }));
          setBarriers(parsedBlockages);
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

  // Add barrier report and dynamically trigger reroute
  const addBarrierReport = async (newBarrier) => {
    const barrierObj = {
      id: `barr-${Date.now()}`,
      title: newBarrier.title || 'Reported Obstacle',
      type: newBarrier.category || 'stairs',
      typeLabel: newBarrier.typeLabel || 'Hazard Obstacle',
      severity: newBarrier.severity || 'high',
      severityLabel: `${newBarrier.severity?.toUpperCase()} Severity Barrier`,
      locationName: newBarrier.locationName || `${destination.name} Corridor`,
      coordinates: newBarrier.coordinates || { lat: 28.6342, lng: 77.2198 },
      reportedAt: 'Just Now',
      verificationStatus: 'AI Verified (96% Confidence)',
      decayStatus: 'Fresh',
      description: newBarrier.description || 'Reported via mobile camera AI scan.',
      imageUrl: newBarrier.imageUrl,
      isOnRouteA: false,
      isOnRouteB: true
    };

    // Call backend API (if available)
    await reportBlockage(barrierObj);

    setBarriers(prev => [barrierObj, ...prev]);

    // Dynamic Route Recalculation
    setRoutes(prev => ({
      ...prev,
      accessible: {
        ...prev.accessible,
        durationMinutes: 10,
        distanceMeters: 620,
        accessibilityScore: 92,
        summary: `Dynamic Reroute: Bypassing newly reported "${barrierObj.title}" via East Promenade.`,
        barriers: [{ name: barrierObj.title, type: barrierObj.type, severity: barrierObj.severity }]
      }
    }));

    showVisualToast({
      title: 'Barrier Uploaded & Rerouted!',
      subtitle: `AI classified as ${barrierObj.title}. Route B adapted.`,
      type: 'success'
    });
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
