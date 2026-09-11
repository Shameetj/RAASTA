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

  // Try fetching dynamic backend data on mount
  useEffect(() => {
    async function loadBackendData() {
      const locs = await fetchLocations();
      if (locs && locs.length > 0) {
        // Can map backend locations if available
      }
      const blocks = await fetchBlockages();
      if (blocks && blocks.length > 0) {
        setBarriers(blocks);
      }
    }
    loadBackendData();
  }, []);

  const handleSelectProfile = (profileId) => {
    setSelectedProfileId(profileId);
    const prof = ACCESSIBILITY_PROFILES.find(p => p.id === profileId);
    if (prof) {
      setPreferences(prof.defaultPreferences);
    }
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
    setCivicModalOpen
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
