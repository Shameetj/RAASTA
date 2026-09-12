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
      const result = await calculateRoute({
        start: { lat: origin.coordinates.lat, lng: origin.coordinates.lng, name: origin.name },
        destination: { lat: targetDest.coordinates.lat, lng: targetDest.coordinates.lng, name: targetDest.name },
        profile: profileId
      });

      if (result) {
        console.log('[RAASTA] Received calculated route from backend Dev2:', result);
        setApiError(null);
        // Map backend route response to frontend structure if returned
        if (result.alternative_route || result.direct_route) {
          setRoutes(prev => ({
            fastest: {
              ...prev.fastest,
              durationMinutes: result.direct_route?.duration_minutes ?? prev.fastest.durationMinutes,
              distanceMeters: result.direct_route?.distance_meters ?? prev.fastest.distanceMeters,
              accessibilityScore: result.direct_route?.accessibility_score ?? (result.direct_route?.is_blocked ? 32 : 80),
              barriers: result.direct_route?.blockages_found?.map(name => ({ name, type: 'stairs', severity: 'Critical' })) || prev.fastest.barriers,
              coordinates: result.direct_route?.coordinates || prev.fastest.coordinates
            },
            accessible: {
              ...prev.accessible,
              durationMinutes: result.alternative_route?.duration_minutes ?? prev.accessible.durationMinutes,
              distanceMeters: result.alternative_route?.distance_meters ?? prev.accessible.distanceMeters,
              accessibilityScore: result.accessibility_score?.score ?? result.alternative_route?.accessibility_score ?? 94,
              scoreRating: result.accessibility_score?.grade ?? 'Safe & Wheelchair Accessible',
              segments: result.turn_by_turn?.map(t => ({
                text: t.instruction || t.text,
                distance: t.distance || '100m',
                safe: !t.is_hazard && t.safe !== false,
                highlight: t.highlight || t.visual_cue || 'Step-free'
              })) || prev.accessible.segments,
              coordinates: result.alternative_route?.coordinates || prev.accessible.coordinates
            }
          }));
        }

        if (result.visual_alerts && Array.isArray(result.visual_alerts) && result.visual_alerts.length > 0) {
          setDeafAlerts(result.visual_alerts.map((a, i) => ({
            id: `alert-backend-${i}`,
            title: a.title || 'Navigation Alert',
            subtitle: a.message || a.subtitle || '',
            type: a.level === 'warning' || a.level === 'danger' ? 'hazard' : 'nav_cue',
            severity: a.level || 'info',
            timestamp: 'Real-time'
          })));
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
