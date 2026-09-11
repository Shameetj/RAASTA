import React from 'react';
import { useNavigation } from './context/NavigationContext';
import MobileAppLayout from './components/MobileAppLayout';
import BottomTabBar from './components/BottomTabBar';
import VisualAlertBanner from './components/VisualAlertBanner';
import CivicDashboardModal from './components/CivicDashboardModal';
import HomePage from './pages/HomePage';
import ProfileSelectionPage from './pages/ProfileSelectionPage';
import DestinationPage from './pages/DestinationPage';
import MapPage from './pages/MapPage';
import RouteResultsPage from './pages/RouteResultsPage';
import BarrierReportPage from './pages/BarrierReportPage';

export default function App() {
  const { currentStep } = useNavigation();

  return (
    <MobileAppLayout>
      
      {/* Scrollable Active Screen Content */}
      <div className="flex-1 w-full overflow-y-auto pb-20 relative">
        {currentStep === 'home' && <HomePage />}
        {currentStep === 'profile' && <ProfileSelectionPage />}
        {currentStep === 'destination' && <DestinationPage />}
        {currentStep === 'map' && <MapPage />}
        {currentStep === 'results' && <RouteResultsPage />}
        {currentStep === 'report' && <BarrierReportPage />}
      </div>

      {/* Visual & Haptic Alert Overlays for Deaf / Universal */}
      <VisualAlertBanner />

      {/* Civic Infrastructure Telemetry Modal */}
      <CivicDashboardModal />

      {/* Fixed Bottom Native Tab Bar Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-30">
        <BottomTabBar />
      </div>

    </MobileAppLayout>
  );
}
